import { NextResponse } from 'next/server';
import { getClientById } from '@/lib/db';
import { computeMetrics } from '@/lib/formulas';
import { getAIConfig, getOpenAIClient, safeParseJSON } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);

    let summary = '';
    let recommendations: string[] = [];
    let finWarnings: string[] = [];
    let cyberWarnings: string[] = [];
    let nextActions: string[] = [];

    const aiConfig = getAIConfig();
    if (aiConfig.isConfigured) {
      try {
        const openai = getOpenAIClient();
        const systemPrompt = `You are RiskPulse AI Advisor. Analyze the financial and cyber metrics of "${client.name}" (${client.industry} sector).
Your findings, recommendations, and warnings MUST align perfectly with the platform's point-based risk scoring system:
- Financial Risk points (capped at 100 max):
  * Current Ratio < 1.0 is +25 points; < 1.5 is +12 points.
  * Quick Ratio < 0.8 is +15 points; < 1.0 is +8 points.
  * Debt Ratio > 70% is +20 points; > 50% is +10 points.
  * Runway < 3 months is +25 points; < 6 months is +12 points.
  * Customer concentration > 40% is +15 points; > 25% is +7 points.
  * Late payments receivables > 25% is +10 points; > 10% is +5 points.
- Cybersecurity Risk points (capped at 100 max):
  * MFA Disabled is +25 points.
  * Inactive Password Policy is +10 points.
  * Backup Solution 'none' is +20 points; 'outdated' is +10 points.
  * Endpoint Antivirus inactive is +15 points.
  * Phishing Scams are +5 points per incident (capped at +15 max).
  * Open CVEs are +3 points per vulnerability (capped at +15 max).
  * Outdated firmware/patches is +15 points; outdated is +7 points.
  * Training completion rate contributes points: 15 * (1 - completion_rate).
- Overall Health Score = 100 - (0.5 * Financial Risk Score + 0.5 * Cybersecurity Risk Score).

Analyze how these specific thresholds affect this company.
Generate a JSON object containing:
{
  "summary": "Executive summary paragraph (combine cybersecurity with financial metrics, explaining how points accumulate)",
  "recommendations": ["rec 1", "rec 2"],
  "financialWarnings": ["warn 1", "warn 2"],
  "cybersecurityWarnings": ["warn 1", "warn 2"],
  "nextActions": ["action 1", "action 2"]
}`;

        const prompt = `
Financial Metrics:
- Cash Balance: $${client.financialMetrics.cash_balance}
- Burn Rate: $${client.financialMetrics.monthly_burn_rate}
- Runway: ${computed.cashRunway} months
- Debt Ratio: ${Math.round(computed.debtRatio * 100)}%
- Cust. Concentration: ${client.financialMetrics.customer_concentration}%
- Vendor Concentration: ${client.financialMetrics.vendor_concentration}%

Cybersecurity Metrics:
- MFA Enabled: ${client.cyberMetrics.mfa_enabled}
- Backups: ${client.cyberMetrics.backup_status}
- Vulnerabilities: ${client.cyberMetrics.open_vulnerabilities_count}
- Patch Status: ${client.cyberMetrics.patch_status}
- Training Completion: ${client.cyberMetrics.security_awareness_completion}%

Generate the JSON. Do not include markdown codeblocks, output valid raw JSON.`;

        const completion = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const res = safeParseJSON(completion.choices[0]?.message?.content, {});
        summary = res.summary || '';
        recommendations = res.recommendations || [];
        finWarnings = res.financialWarnings || [];
        cyberWarnings = res.cybersecurityWarnings || [];
        nextActions = res.nextActions || [];
      } catch (e) {
        console.error('OpenAI advisor failed, falling back to rule-based generation:', e);
      }
    }

    // High fidelity fallback rule-based advisor
    if (!summary) {
      summary = `The operational risk profile of ${client.name} is determined to be ${computed.overallHealthScore > 80 ? 'Low' : computed.overallHealthScore > 55 ? 'Moderate' : 'High'
        } with an overall business health score of ${computed.overallHealthScore}/100. ${client.financialMetrics.customer_concentration > 35
          ? `Although the business operates in a solid market space, ${client.financialMetrics.customer_concentration}% of revenue is concentrated in a single client, exposing liquidity to client retention shocks.`
          : 'The client bases are well diversified, protecting primary income channels.'
        } ${!client.cyberMetrics.mfa_enabled
          ? 'Cybersecurity risk is high due to disabled Multi-Factor Authentication, making the firm vulnerable to immediate phishing and malware attacks.'
          : 'Current endpoint and MFA protections are active and mitigating baseline cyber liabilities.'
        }`;

      // Recommendations
      recommendations.push(
        `Optimize working capital. Maintain a current ratio of at least 1.5 (currently it is ${computed.currentRatio}).`,
        `Mitigate vendor lock-in. A vendor concentration of ${client.financialMetrics.vendor_concentration}% requires drafting secondary supplier backups.`,
        `Conduct standard quarterly cybersecurity reviews to reduce operational risks.`
      );

      // Financial Warnings
      if (computed.cashRunway < 3) {
        finWarnings.push(`Critical: Cash runway is only ${computed.cashRunway} months. Operating capital will deplete without cost cuts or financing.`);
      } else if (computed.cashRunway < 6) {
        finWarnings.push(`Caution: Cash runway of ${computed.cashRunway} months is below the recommended 6-month safety buffer.`);
      }
      if (client.financialMetrics.customer_concentration > 40) {
        finWarnings.push(`Severe customer concentration: ${client.financialMetrics.customer_concentration}% of revenue is reliant on a single relationship.`);
      }
      if (client.financialMetrics.late_payment_percentage > 20) {
        finWarnings.push(`Invoice Health: ${client.financialMetrics.late_payment_percentage}% of accounts receivable are overdue, stressing operational cash-flow.`);
      }

      // Cyber Warnings
      if (!client.cyberMetrics.mfa_enabled) {
        cyberWarnings.push(`Security Critical: Multi-Factor Authentication (MFA) is currently disabled. Active accounts are highly vulnerable to breach.`);
      }
      if (client.cyberMetrics.backup_status === 'none') {
        cyberWarnings.push(`Disaster Recovery Risk: No active data backups detected. Data loss from ransomware would be irreversible.`);
      } else if (client.cyberMetrics.backup_status === 'outdated') {
        cyberWarnings.push(`Backup Warning: System backup is outdated, presenting a risk of data loss for recent transactions.`);
      }
      if (client.cyberMetrics.open_vulnerabilities_count > 5) {
        cyberWarnings.push(`Patch Alert: ${client.cyberMetrics.open_vulnerabilities_count} unpatched software vulnerabilities detected on endpoint computers.`);
      }

      // Next Actions
      if (!client.cyberMetrics.mfa_enabled) {
        nextActions.push(`Enforce MFA enrollment policy for all corporate email and financial portal accounts immediately.`);
      }
      if (computed.cashRunway < 4) {
        nextActions.push(`Audit Accounts Receivable ledger and trigger payment requests to collect $${client.financialMetrics.outstanding_receivables.toLocaleString()} in overdue invoices.`);
      }
      nextActions.push(
        `Establish formal disaster recovery rules and test backup recovery speed.`,
        `Schedule a vendor risk review with key managers to discuss contract renewal schedules.`
      );
    }

    return NextResponse.json({
      summary,
      recommendations,
      financialWarnings: finWarnings,
      cybersecurityWarnings: cyberWarnings,
      nextActions
    });
  } catch (error) {
    console.error('Advisor endpoint error:', error);
    return NextResponse.json({ error: 'Failed to run advisor analysis' }, { status: 500 });
  }
}
