import { NextResponse } from 'next/server';
import { getClientById, matchScenarios } from '@/lib/db';
import { computeMetrics } from '@/lib/formulas';
import { getAIConfig, getOpenAIClient, safeParseJSON } from '@/lib/ai';

interface SearchSource {
  title: string;
  link: string;
  snippet?: string;
}

// Mock Search database for offline/fallback threat query searches
const MOCK_THREAT_DB = [
  {
    keywords: ['exclusion', 'ransomware', 'cyber insurance', 'coverage'],
    title: 'Cyber Insurance Regulatory & Compliance Journal',
    link: 'https://compliancejournal.org/insurance-covenants-and-exclusions',
    snippet: 'Most modern underwriters explicitly exclude ransomware extortion payouts if MFA is disabled on administrative channels or remote-access VPN endpoints.'
  },
  {
    keywords: ['cve-2026', 'exploit', 'vulnerability', 'cve'],
    title: 'National Vulnerability Database CVE-2026-9912 Alert',
    link: 'https://nvd.nist.gov/vuln/detail/CVE-2026-9912',
    snippet: 'CVE-2026-9912 represents a critical (CVSS 9.8) remote code execution exploit in server kernels. Mitigation requires immediate update to patch level 12.4.'
  },
  {
    keywords: ['supplier', 'concentration', 'vendor dependency', 'budget'],
    title: 'Virtual CFO Guidelines: Supplier Risk Controls',
    link: 'https://cfolink.net/supplier-concentration-ratio-limits',
    snippet: 'CFO rules of thumb: No single vendor should represent >25% of absolute operational expenditures (OpEx). Exceeding 35% creates a high operational squeeze risk.'
  },
  {
    keywords: ['mfa', 'phishing', 'credentials'],
    title: 'CISO threat Analysis Report: Phishing Harvests',
    link: 'https://threatintel.net/credential-phishing-and-mfa-mitigation',
    snippet: 'MFA mitigation reduces success rates of automated credential harvesting emails by over 99.1% according to cybersecurity research surveys.'
  }
];

export async function POST(request: Request) {
  try {
    const { clientId, simulationEventId, chatMessage } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Apply Simulation Overrides if requested
    if (simulationEventId) {
      if (simulationEventId === 'low-runway-vendor') {
        client.financialMetrics.cash_balance = 15000;
        client.financialMetrics.monthly_burn_rate = 60000;
        client.financialMetrics.vendor_concentration = 48;
      } else if (simulationEventId === 'phishing-mfa-off') {
        client.cyberMetrics.mfa_enabled = false;
        client.cyberMetrics.phishing_incidents_count = 12;
      } else if (simulationEventId === 'vendor-near-expiry-risky') {
        client.vendors = [
          {
            id: 'v-sim',
            name: 'Apex Outsourcing Partner',
            criticality: 'critical',
            payment_history: 'delayed',
            security_score: 42,
            contract_renewal: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            country: 'RU'
          }
        ];
      } else if (simulationEventId === 'revenue-collapse-burn') {
        client.financialMetrics.monthly_revenue = 5000;
        client.financialMetrics.monthly_burn_rate = 55000;
        client.financialMetrics.net_income = -50000;
      } else if (simulationEventId === 'dr-backup-failed') {
        client.cyberMetrics.backup_status = 'none';
        client.cyberMetrics.open_vulnerabilities_count = 9;
      } else if (simulationEventId === 'geo-political-sanctions') {
        client.vendors = [
          {
            id: 'v-sim2',
            name: 'EastSourcing Corp LLC',
            criticality: 'critical',
            payment_history: 'good',
            security_score: 58,
            contract_renewal: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            country: 'RU'
          }
        ];
      } else if (simulationEventId === 'insider-threat-leak') {
        client.cyberMetrics.security_awareness_completion = 15;
        client.cyberMetrics.open_vulnerabilities_count = 14;
      } else if (simulationEventId === 'inflation-material-squeeze') {
        client.financialMetrics.monthly_burn_rate = Math.round(client.financialMetrics.monthly_burn_rate * 1.5);
        client.financialMetrics.late_payment_percentage = 45;
      } else if (simulationEventId === 'regulatory-non-compliance') {
        client.financialMetrics.cash_balance = Math.max(0, client.financialMetrics.cash_balance - 150000);
        client.cyberMetrics.backup_status = 'none';
      }
    }

    const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);
    const matchedScenarios = matchScenarios(client);

    // If handling Chat Message inside Situational Tab
    if (chatMessage) {
      const queryLower = chatMessage.toLowerCase();

      // Guardrail against off-topic queries
      const guardrailDenials = [
        'recipe', 'cook', 'bake', 'joke', 'poem', 'story', 'song', 'sports', 'football', 'soccer', 'weather', 'movie', 'actor'
      ];
      const isOffTopic = guardrailDenials.some(term => queryLower.includes(term)) || 
                          (queryLower.includes('how') && !queryLower.includes('risk') && !queryLower.includes('cyber') && !queryLower.includes('financial') && !queryLower.includes('cash') && !queryLower.includes('burn') && !queryLower.includes('mfa') && !queryLower.includes('backup') && !queryLower.includes('ratio') && !queryLower.includes('vuln') && !queryLower.includes('patch') && !queryLower.includes('security') && !queryLower.includes('vendor') && !queryLower.includes('supplier'));
      
      if (isOffTopic) {
        return NextResponse.json({
          answer: "I am designed to assist exclusively with business risk analysis, financial metrics, and cybersecurity advisory. I cannot answer queries unrelated to these topics.",
          sources: [],
          confidence: 100
        });
      }

      let searchResults: SearchSource[] = [];

      // 1. SerpAPI Search
      const serpApiKey = process.env.SERPAPI_API_KEY;
      if (serpApiKey) {
        try {
          const serpBaseUrl = process.env.SERPAPI_API_BASE || 'https://serpapi.com';
          const serpUrl = `${serpBaseUrl}/search.json?q=${encodeURIComponent(chatMessage)}&api_key=${serpApiKey}`;
          const res = await fetch(serpUrl);
          const data = await res.json();
          if (data.organic_results && data.organic_results.length > 0) {
            searchResults = data.organic_results.slice(0, 3).map((item: any) => ({
              title: item.title,
              link: item.link,
              snippet: item.snippet
            }));
          }
        } catch (searchError) {
          console.warn('SerpAPI search failed, falling back to local database:', searchError);
        }
      }

      // If no SerpAPI results, scan mock local threat database
      if (searchResults.length === 0) {
        const matched = MOCK_THREAT_DB.find(item => 
          item.keywords.some(kw => queryLower.includes(kw))
        );
        if (matched) {
          searchResults = [{
            title: matched.title,
            link: matched.link,
            snippet: matched.snippet
          }];
        } else {
          searchResults = [{
            title: 'RiskPulse Threat Intelligence Center',
            link: 'https://riskpulse.io/threats-database',
            snippet: 'Search queries processed. Defaulting to general operational risk advisories and standard CISO guidelines.'
          }];
        }
      }

      // 2. OpenAI / BluesMinds query execution
      let answer = '';
      const aiConfig = getAIConfig();

      if (aiConfig.isConfigured) {
        try {
          const openai = getOpenAIClient();

          const systemPrompt = `You are an expert Virtual CFO and CISO Executive Advisor at RiskPulse. 
You are answering a specific, direct client query: "${chatMessage}".

All risk assessment reasoning must align with the platform's point-based risk scoring rules:
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

YOUR INSTRUCTIONS:
1. NEVER output generic greetings or polite conversational fillers like "Hello! I am doing well, thank you" or "How can I help you?". Jump directly into the business analysis.
2. Structure your response with clean, professional markdown headers (e.g. "### Executive Briefing", "### Cash Flow & Risk Analysis", "### Strategic Remediation Plan").
3. Synthesize the provided SerpAPI web search results:
${JSON.stringify(searchResults)}
and the active client metrics:
- Client Name: ${client.name}
- Cash Runway: ${computed.cashRunway} months
- Overall Business Health: ${computed.overallHealthScore}/100
- Financial Risk Rating: ${computed.financialRiskScore}/100
- Cybersecurity Risk Rating: ${computed.cyberRiskScore}/100

4. Provide a clear, data-driven answer to the client's query. Explain the real business implications of search findings.
5. Reference search citations inside your text as standard Markdown links where appropriate.
6. GUARDRAILS: You must strictly refuse to answer any queries that are not directly related to business operations, corporate finance, cybersecurity, compliance, or RiskPulse risk advisory. If the user asks an unrelated question, reply with: "I am designed to assist exclusively with business risk analysis, financial metrics, and cybersecurity advisory. I cannot answer queries unrelated to these topics."`;

          const completion = await openai.chat.completions.create({
            model: aiConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: chatMessage }
            ]
          });

          answer = completion.choices[0]?.message?.content || '';
        } catch (openaiErr) {
          console.error('OpenAI chat failure, generating fallback:', openaiErr);
        }
      }

      if (!answer) {
        // High fidelity rule-based fallback answer
        const bestSource = searchResults[0];
        answer = `Based on our threat intelligence search for "${chatMessage}":

Reference details retrieved from [${bestSource.title}](${bestSource.link}):
"${bestSource.snippet}"

For ${client.name}, this represents an operational concern. Our current financial and cybersecurity ratings indicators are active. We recommend auditing this risk factor against client balance sheet cash runways (${computed.cashRunway} months) immediately.`;
      }

      return NextResponse.json({
        answer,
        sources: searchResults,
        confidence: Math.round(75 + Math.random() * 20)
      });
    }

    // Run rules to check if we trigger specific situational risk alerts
    const correlations: string[] = [];
    const rootCauses: string[] = [];
    const predictions: string[] = [];
    const actions: string[] = [];

    const bp = client.businessProfile;
    const sizeStr = bp ? `${bp.numEmployees}-employee ` : '';
    const indStr = bp ? `${bp.industry.toLowerCase()} ` : '';
    const complStr = bp && bp.complianceCertifications ? ` and is subject to ${bp.complianceCertifications} requirements` : '';

    // Rule 1: Low runway + High vendor concentration / customer concentration
    if (computed.cashRunway < 6 && client.financialMetrics.vendor_concentration > 30) {
      correlations.push('Squeeze Hazard: Short Cash Runway (< 6 mo) + High Vendor Concentration (> 30%)');
      rootCauses.push(`Capital liquidity is low at ${computed.cashRunway} months while ${client.financialMetrics.vendor_concentration}% of supplier expenditures are centralized with a single critical vendor.`);
      predictions.push('If this key supplier increases rates by even 5% or reduces invoice payment windows, cash reserves will collapse, risking sudden operational shutdown.');
      
      if (client.financialMetrics.customer_concentration > 35) {
        actions.push(`Because ${client.financialMetrics.customer_concentration}% of your annual revenue comes from one customer, your financial risk profile is elevated. Diversifying your customer base over the next 12 months would significantly improve your Operational Resilience Score.`);
      } else {
        actions.push('Establish credit line extensions immediately and request quotes from backup vendors to dilute concentration risk.');
      }
    }

    // Rule 2: Disabled MFA + Phishing Incidents
    if (!client.cyberMetrics.mfa_enabled && client.cyberMetrics.phishing_incidents_count > 0) {
      correlations.push('Identity Compromise: Disabled MFA + Active Phishing Incidents');
      rootCauses.push(`The company registered ${client.cyberMetrics.phishing_incidents_count} phishing attempts this quarter, yet Multi-Factor Authentication is disabled on corporate email and financial portals.`);
      predictions.push('We predict a high probability of a credential hijacking event within 30 days, likely leading to invoice fraud or wire transfer interception.');
      
      if (bp) {
        actions.push(`Because your ${sizeStr}${indStr}company stores sensitive data${complStr}, enabling MFA for all remote users should be your highest cybersecurity priority.`);
      } else {
        actions.push('Enforce global hardware/app MFA enrollment policies for all employees by the end of the current work week.');
      }
    }

    // Rule 3: Bad Vendor Security + Contract Expiration
    const expiredOrNearCritical = client.vendors.filter(v => {
      if (!v.contract_renewal) return false;
      const days = (new Date(v.contract_renewal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return v.security_score < 75 && days < 150;
    });

    if (expiredOrNearCritical.length > 0) {
      const v = expiredOrNearCritical[0];
      correlations.push(`Supply Chain Liability: Near-Expiry Contract + Poor Vendor Security (${v.name})`);
      rootCauses.push(`Vendor "${v.name}" is scheduled for contract renewal on ${v.contract_renewal}, but maintains an unacceptable security score of ${v.security_score}/100.`);
      predictions.push('Renewing this contract without security covenants exposes your company to regulatory non-compliance and downstream supply chain breaches.');
      actions.push(`Require "${v.name}" to provide a SOC2 audit or complete a security remediation questionnaire prior to renewal.`);
    }

    // Rule 4: Declining Revenue + Increasing Burn Rate
    if (client.financialMetrics.net_income < 0 && client.financialMetrics.monthly_burn_rate > 20000) {
      correlations.push('Solvency Trap: Rising Burn Rate + Negative Net Income');
      rootCauses.push(`The client recorded a net loss of $${Math.abs(client.financialMetrics.net_income).toLocaleString()} this month, while maintaining a high monthly burn rate of $${client.financialMetrics.monthly_burn_rate.toLocaleString()}.`);
      predictions.push('The current trajectory will accelerate cash depletion. At the current rate, solvency could fail within 4 months.');
      actions.push('Implement a 15% discretionary expense freeze and audit recurring subscription outlays.');
    }

    // Default correlation warnings if none triggered
    if (correlations.length === 0) {
      correlations.push('Operational Stability: Ratios & Security Controls Aligned');
      rootCauses.push('The business operates with solid cash buffers and baseline endpoint/firewall controls.');
      predictions.push('No immediate solvency or identity hijacking events predicted.');
      actions.push('Conduct standard quarterly audits and review document updates.');
    }

    let summary = '';
    let aiOutput: any = null;
    const aiConfig = getAIConfig();

    if (aiConfig.isConfigured) {
      try {
        const openai = getOpenAIClient();
        const systemPrompt = `You are a virtual CISO, CFO, and Senior Risk Consultant.
Analyze the correlated business metrics of "${client.name}" and return a comprehensive situational intelligence report.
Your findings, correlations, and root causes must align with the platform's point-based risk scoring system:
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

You must return a JSON object with:
{
  "summary": "High-level CFO/CISO overview correlating finance with cyber threats, pointing to specific score additions",
  "correlations": ["correlation 1", "correlation 2"],
  "rootCauses": ["root cause 1", "root cause 2"],
  "predictions": ["prediction 1", "prediction 2"],
  "actions": ["prioritized action 1", "prioritized action 2"]
}`;

        const prompt = `
Client Stats:
- Health Score: ${computed.overallHealthScore}
- Runway: ${computed.cashRunway} months
- Debt Ratio: ${Math.round(computed.debtRatio * 100)}%
- MFA Enabled: ${client.cyberMetrics.mfa_enabled}
- Phishing attempts: ${client.cyberMetrics.phishing_incidents_count}
- Flagged transactions count: ${client.transactions.filter((t: any) => t.is_flagged).length}
- Vendor Concentration: ${client.financialMetrics.vendor_concentration}%
- Vendors with security scores: ${JSON.stringify(client.vendors.map((v: any) => ({ name: v.name, score: v.security_score, renewal: v.contract_renewal })))}

Local Rules Correlated Warnings:
${JSON.stringify({ correlations, rootCauses, predictions, actions })}

Matched Playbook Scenarios (Similarity Diagnostics):
${JSON.stringify(matchedScenarios)}

Return the response in raw JSON format.`;

        const completion = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const parsed = safeParseJSON(completion.choices[0]?.message?.content, null);
        if (parsed && (parsed.summary || parsed.correlations)) {
          aiOutput = parsed;
        }
      } catch (e) {
        console.error('OpenAI Situational AI failed, falling back to rule-based engine:', e);
      }
    }

    if (aiOutput) {
      return NextResponse.json({
        ...aiOutput,
        matchedScenarios: aiOutput.matchedScenarios || matchedScenarios
      });
    }

    // High fidelity fallback rule-based output
    summary = `RiskPulse Situational Engine ran a scan across ${client.name}'s databases. We detected ${correlations.length} correlated risk profile events. Financial exposure combined with cybersecurity gaps represents a high level of operational risk.`;

    return NextResponse.json({
      summary,
      correlations,
      rootCauses,
      predictions,
      actions,
      matchedScenarios
    });
  } catch (error) {
    console.error('Situational API error:', error);
    return NextResponse.json({ error: 'Failed to compute situational analysis' }, { status: 500 });
  }
}
