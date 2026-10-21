import { NextResponse } from 'next/server';
import { getClientById } from '@/lib/db';
import { getAIConfig, getOpenAIClient, safeParseJSON } from '@/lib/ai';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check configuration
    const aiConfig = getAIConfig();

    if (aiConfig.isConfigured) {
      try {
        const openai = getOpenAIClient();

        const systemPrompt = `You are a Virtual Chief Risk Officer (CRO) simulator.
Given the company details below, dynamically generate a client-specific operational threat scenario and a multiple-choice diagnostic question to stress-test their strategic decision-making.

Company Context:
- Name: ${client.name}
- Industry Sector: ${client.industry}
- Cash Balance: $${client.financialMetrics.cash_balance}
- MFA Active: ${client.cyberMetrics.mfa_enabled ? 'Yes' : 'No'}
- Backup Solution: ${client.cyberMetrics.backup_status}
- Security Training: ${client.cyberMetrics.security_awareness_completion}% completed

You MUST return a JSON object matching this schema exactly:
{
  "title": "A short, catchy scenario title",
  "description": "A 2-3 sentence description of the hypothetical threat context (e.g. ransomware breach, supply chain breakdown, audit failure) customized to this industry.",
  "question": "A multiple-choice question asking how the risk officer will address the threat.",
  "options": [
    { "key": "A", "text": "Option A strategy text" },
    { "key": "B", "text": "Option B strategy text" },
    { "key": "C", "text": "Option C strategy text" },
    { "key": "D", "text": "Option D strategy text" }
  ],
  "evaluations": {
    "A": { "scoreImpact": { "overallHealth": number, "cyber": number, "financial": number }, "feedback": "Detailed paragraph explaining why this was a good or bad choice." },
    "B": { "scoreImpact": { "overallHealth": number, "cyber": number, "financial": number }, "feedback": "Detailed paragraph explaining why this was a good or bad choice." },
    "C": { "scoreImpact": { "overallHealth": number, "cyber": number, "financial": number }, "feedback": "Detailed paragraph explaining why this was a good or bad choice." },
    "D": { "scoreImpact": { "overallHealth": number, "cyber": number, "financial": number }, "feedback": "Detailed paragraph explaining why this was a good or bad choice." }
  }
}

The scoreImpact values must be numbers (e.g., +10 or -15, representing the score change if chosen).`;

        const completion = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate the threat scenario and diagnostic question now in JSON format.' }
          ],
          response_format: { type: 'json_object' }
        });

        const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
        if (parsed.title && parsed.options) {
          return NextResponse.json({ success: true, scenario: parsed });
        }
      } catch (err: any) {
        console.error('[RiskPulse Simulator API] LLM scenario generation failed:', err.message || err);
      }
    }

    // High fidelity fallback generator if API fails or is offline
    const defaultScenarios: Record<string, any[]> = {
      Technology: [
        {
          title: 'Cloud Service Infrastructure Breach',
          description: `A critical vulnerability is identified in the primary virtual hosting nodes utilized by ${client.name}. Unauthorized access is suspected, risking client intellectual property and data pipelines.`,
          question: 'How do you structure the emergency response strategy?',
          options: [
            { key: 'A', text: 'Initiate automated compartmental isolation of host nodes and swap to cold standby sync.' },
            { key: 'B', text: 'Suspend user interface endpoints immediately and notify the public cyber database.' },
            { key: 'C', text: 'Conduct an in-depth security scan over the next week to isolate log anomalies before patching.' },
            { key: 'D', text: 'Delegate recovery entirely to the third-party infrastructure provider and monitor status.' }
          ],
          evaluations: {
            A: { scoreImpact: { overallHealth: 8, cyber: -12, financial: -5 }, feedback: 'Correct action. Compartmentalization isolates the leak quickly while swapping to secondary databases preserves uptime.' },
            B: { scoreImpact: { overallHealth: -10, cyber: -5, financial: -20 }, feedback: 'High financial cost. Suspending client systems immediately causes high churn rates and operational deficits.' },
            C: { scoreImpact: { overallHealth: -15, cyber: 15, financial: 0 }, feedback: 'Vulnerable approach. Waiting a week allows adversaries to exploit the access vector and deploy lateral malware.' },
            D: { scoreImpact: { overallHealth: -5, cyber: 5, financial: 5 }, feedback: 'Insufficient response. Depending entirely on external vendors without active local mitigation leaves critical exposures open.' }
          }
        }
      ],
      Finance: [
        {
          title: 'Liquidity Runway Contraction',
          description: `${client.name} faces a sudden operational deficit due to late client payments, reducing the forecasted cash runway to under a month.`,
          question: 'What immediate capital allocation adjustments do you recommend?',
          options: [
            { key: 'A', text: 'Draw down on existing debt credit lines and renegotiate terms for accounts payable.' },
            { key: 'B', text: 'Enforce aggressive immediate discounts on outstanding accounts receivable to accelerate cash collections.' },
            { key: 'C', text: 'Cut security maintenance operations budgets to lower the monthly burn rate.' },
            { key: 'D', text: 'Freeze expansion objectives and suspend vendor payments until collections clear.' }
          ],
          evaluations: {
            A: { scoreImpact: { overallHealth: 5, cyber: 0, financial: -10 }, feedback: 'Smart liquidity buffer. Borrowing preserves cash flows but increases long-term debt liabilities.' },
            B: { scoreImpact: { overallHealth: 10, cyber: 0, financial: 5 }, feedback: 'Excellent action. Accelerating receivables recovery increases actual cash balances without incurring debt.' },
            C: { scoreImpact: { overallHealth: -20, cyber: 25, financial: 5 }, feedback: 'Dangerous choice. Cutting security budgets results in severe compliance issues and exposes networks to breach risks.' },
            D: { scoreImpact: { overallHealth: -10, cyber: 0, financial: -15 }, feedback: 'Suspicious operations impact. Freezing critical suppliers leads to vendor defaults and stops core business workflows.' }
          }
        }
      ]
    };

    const sectorPlaybooks = defaultScenarios[client.industry] || defaultScenarios.Technology;
    const scenario = sectorPlaybooks[Math.floor(Math.random() * sectorPlaybooks.length)];

    return NextResponse.json({ success: true, scenario });

  } catch (error: any) {
    console.error('Failed in situational questions API:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
