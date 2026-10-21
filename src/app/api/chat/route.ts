import { NextResponse } from 'next/server';
import { getClientById, addChatMessage } from '@/lib/db';
import { retrieveRelevantChunks } from '@/lib/rag';
import { computeMetrics } from '@/lib/formulas';
import { getAIConfig, getOpenAIClient } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { clientId, message } = await request.json();
    if (!clientId || !message) {
      return NextResponse.json({ error: 'clientId and message are required' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const queryLower = message.toLowerCase();

    // Guardrail against off-topic queries
    const guardrailDenials = [
      'recipe', 'cook', 'bake', 'joke', 'poem', 'story', 'song', 'sports', 'football', 'soccer', 'weather', 'movie', 'actor'
    ];
    const isOffTopic = guardrailDenials.some(term => queryLower.includes(term)) || 
                        (queryLower.includes('how') && !queryLower.includes('risk') && !queryLower.includes('cyber') && !queryLower.includes('financial') && !queryLower.includes('cash') && !queryLower.includes('burn') && !queryLower.includes('mfa') && !queryLower.includes('backup') && !queryLower.includes('ratio') && !queryLower.includes('vuln') && !queryLower.includes('patch') && !queryLower.includes('security') && !queryLower.includes('vendor') && !queryLower.includes('supplier'));
    
    if (isOffTopic) {
      const reply = "I am designed to assist exclusively with business risk analysis, financial metrics, and cybersecurity advisory. I cannot answer queries unrelated to these topics.";
      await addChatMessage(clientId, 'user', message);
      await addChatMessage(clientId, 'assistant', reply);
      return NextResponse.json({
        role: 'assistant',
        content: reply,
        citations: []
      });
    }

    // Save user message to history
    await addChatMessage(clientId, 'user', message);

    // 1. Retrieve RAG chunks
    const chunks = await retrieveRelevantChunks(message, clientId, client.documents, 3);
    const contextText = chunks
      .map(c => `[Document: ${c.documentName}] ${c.content}`)
      .join('\n\n');

    const citations = chunks.map(c => ({
      name: c.documentName,
      page: c.pageNumber,
      confidence: c.confidence
    }));

    // Calculate latest metrics for context
    const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);

    // 2. SerpAPI Search if configured
    let serpResultsText = '';
    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (serpApiKey) {
      try {
        const serpBaseUrl = process.env.SERPAPI_API_BASE || 'https://serpapi.com';
        const serpUrl = `${serpBaseUrl}/search.json?q=${encodeURIComponent(message)}&api_key=${serpApiKey}`;
        const serpResponse = await fetch(serpUrl);
        const serpData = await serpResponse.json();
        if (serpData && serpData.organic_results) {
          const results = serpData.organic_results.slice(0, 3).map((item: any) => 
            `[Web Search: ${item.title}] ${item.snippet} (Source: ${item.link})`
          );
          if (results.length > 0) {
            serpResultsText = results.join('\n\n');
          }
        }
      } catch (searchError) {
        console.warn('SerpAPI search failed in main chat:', searchError);
      }
    }

    let reply = '';

    const aiConfig = getAIConfig();
    if (aiConfig.isConfigured) {
      try {
        const openai = getOpenAIClient();
        const systemPrompt = `You are the RiskPulse Executive Advisor, a virtual executive board operating as an expert CFO, CISO, Chief Risk Officer, and strategic Business Consultant.
Your target is to deeply analyze the client "${client.name}" and provide explainable, context-aware, and highly personalized business-focused counsel.

CRITICAL ROLE INSTRUCTIONS:
1. Act as a virtual CFO/CISO/CRO. Never offer generic advice (e.g., do not just write "Enable MFA" or "Reduce expenses").
2. Connect cybersecurity and financial metrics together in your analysis (e.g., identify how low cash runway interacts with cybersecurity remediation timelines, or how customer concentration exposes their regulatory posture).
3. If recommending any actions or answering specific financial/cyber questions, you MUST include a clean, structured **Explainable AI Diagnostics** section at the bottom of your message with:
   - **Recommendation Rationale**: Why this advice is given for their specific size, industry, and situation.
   - **Company Data & Metrics Used**: Exact cash numbers, employee headcount, security completion metrics, or ratio values that influenced the suggestion.
   - **Documents Referenced**: Cite specific RAG files (e.g. "gainwell_cyber_policy_test.pdf") if relevant.
   - **Estimated Business Impact**: The projected shift in risk score or health index.
   - **Confidence Score & Priority Level** (Critical, High, Medium, Low).
4. If the user requests to export, download, generate, or print a PDF report or audit checklist, you MUST provide a markdown download link pointing to: \`/api/report?clientId=${client.id}\` (e.g. \`[Download Risk Audit PDF](/api/report?clientId=${client.id})\`) and invite them to download the report.

Here is the current operational Digital Twin of "${client.name}":
- Industry: ${client.industry}
- Size & Headcount: ${client.businessProfile?.numEmployees || '25'} employees
- Growth Stage: ${client.aiCompanyProfile?.growthStage || 'Established'}
- Core Framework Compliance: Subject to ${client.businessProfile?.complianceCertifications || 'standard regulatory framework compliance'}
- Registered Concerns: ${client.businessProfile?.biggestConcerns || 'None registered'}
- Primary Business Priorities: ${client.businessProfile?.primaryObjectives || 'Operational continuity'}
- Overall Business Health Score: ${computed.overallHealthScore}/100
- Financial Risk Score: ${computed.financialRiskScore}/100
- Cybersecurity Risk Score: ${computed.cyberRiskScore}/100

Live Financial Metrics:
- Unrestricted Cash: $${client.financialMetrics.cash_balance.toLocaleString()}
- Monthly Gross Revenue: $${client.financialMetrics.monthly_revenue.toLocaleString()}
- Monthly Operating Expenses (Burn): $${client.financialMetrics.monthly_burn_rate.toLocaleString()}
- Cash Runway: ${computed.cashRunway} months
- Outstanding Accounts Receivable: $${client.financialMetrics.outstanding_receivables.toLocaleString()}
- Upcoming Accounts Payable: $${client.financialMetrics.upcoming_obligations.toLocaleString()}
- Liquidity Ratios: Current Ratio: ${computed.currentRatio}, Quick Ratio: ${computed.quickRatio}
- Leverage: Debt Ratio: ${Math.round(computed.debtRatio * 100)}%
- Client Concentration: ${client.financialMetrics.customer_concentration}% of total revenue from largest customer
- Supply Chain Risk: ${client.financialMetrics.vendor_concentration}% of spend allocated to top supplier

Live Cybersecurity Posture:
- MFA Enforced: ${client.cyberMetrics.mfa_enabled ? 'Yes (Enforced)' : 'No (Disabled)'}
- Password Complexity Policy: ${client.cyberMetrics.password_policy_enabled ? 'Active' : 'Inactive'}
- Backup Solution: ${client.cyberMetrics.backup_status}
- Endpoint Antivirus Protection: ${client.cyberMetrics.endpoint_protection ? 'Active' : 'Inactive'}
- Phishing Scams Logged: ${client.cyberMetrics.phishing_incidents_count} attempts
- Outstanding Vulnerabilities: ${client.cyberMetrics.open_vulnerabilities_count} CVEs
- Patch Management Status: ${client.cyberMetrics.patch_status}
- Security Training Completion: ${client.cyberMetrics.security_awareness_completion}% completed

RISKPULSE MATHEMATICAL SCORING ENGINE (FORMULAS & WEIGHTS):
Use the following logic to explain or justify risk points:
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

Documents Context (Private Organization Knowledge Base):
${contextText || 'No documents uploaded yet.'}

Web Search Context (SerpAPI live threat intelligence):
${serpResultsText || 'No web search results available.'}

Provide a comprehensive, professional, business-focused response in clear markdown format. Cite specific documents or web search sources by name/link if they are retrieved.
GUARDRAILS: You must strictly refuse to answer any queries that are not directly related to business operations, corporate finance, cybersecurity, compliance, or RiskPulse risk advisory. If the user asks an unrelated question, reply with: "I am designed to assist exclusively with business risk analysis, financial metrics, and cybersecurity advisory. I cannot answer queries unrelated to these topics."`;

        const completion = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        });

        reply = completion.choices[0]?.message?.content || '';
      } catch (e) {
        console.error('OpenAI generation failed, falling back to local advisor:', e);
      }
    }

    // Local rule-based fallback advisor if OpenAI is missing or failed
    if (!reply) {
      reply = generateLocalChatbotResponse(message, client, computed, chunks);
    }

    // Save assistant message to history
    await addChatMessage(clientId, 'assistant', reply, citations);

    return NextResponse.json({
      role: 'assistant',
      content: reply,
      citations
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}

function generateLocalChatbotResponse(
  message: string,
  client: any,
  computed: any,
  chunks: { content: string; documentName: string; score: number }[]
): string {
  const query = message.toLowerCase();

  if (query.includes('situation') || query.includes('scenario') || query.includes('simulation')) {
    return `RiskPulse supports several pre-configured stress-test simulations and threat playbooks. You can explore or download the complete details of these scenarios in the static situations file:
[Download Situations JSON database](/situations.json)

Here is a summary of the standard simulations available on your **Situational AI** tab:
1. **Cash Runway Squeeze**: Depletes cash to <0.5 months to evaluate vendor reliance and runway resilience.
2. **Phishing Storm & MFA Gaps**: Disables MFA globally while running a simulated phishing campaign.
3. **Supply Chain Compliance Gap**: Simulates a key vendor's contract expiring with a critical security rating (42).
4. **Sudden Revenue Drop Deficit**: Reduces monthly revenue by 40% with a high cash burn rate.
5. **Disaster Backup Outage**: Disables backup solutions while exposing systems to critical vulnerabilities.
6. **Geopolitical Sanctions Delay**: Places primary shipping vendors on trade watchlists, causing logistics delays.
7. **Insider Threat & Access Leak**: Leaks administrative credentials while security training completion is extremely low (15%).
8. **Global Raw Material Inflation**: Simulates market inflation by raising burn rates by 50% and overdue A/R by 45%.
9. **Regulatory Non-Compliance Audit**: Triggers a regulatory audit fine of $150,000 and disables backups.

We also match **4 combined threat playbooks** (e.g. *Low Cash Reserves + Ransomware Exposure*, *Customer Concentration + Declining Liquidity*) based on your live financial and cyber metrics!`;
  }

  if (query.includes('pdf') || query.includes('report') || query.includes('download') || query.includes('export') || query.includes('print')) {
    return `I have compiled a comprehensive executive risk audit report for **${client.name}** in PDF format. It includes current liquidity ratios, cybersecurity posture assessments, matched playbooks alerts, and CFO/CISO advisory actions.

[Download Risk Assessment Report PDF](/api/report?clientId=${client.id})

Click the link above to generate and download your PDF file.`;
  }

  // If we matched something in the RAG chunks with high similarity, use it dynamically
  if (chunks.length > 0) {
    const bestChunk = chunks[0];
    return `Based on your retrieved document [${bestChunk.documentName}](file:///${bestChunk.documentName}):

"${bestChunk.content}"

Would you like me to analyze how this impacts your operational resilience score or check other files?`;
  }

  if (query.includes('runway') || query.includes('cash') || query.includes('burn')) {
    return `Your cash runway is **${computed.cashRunway} months**.
- Cash Balance: $${client.financialMetrics.cash_balance.toLocaleString()}
- Monthly Burn Rate: $${client.financialMetrics.monthly_burn_rate.toLocaleString()}
- Monthly Revenue: $${client.financialMetrics.monthly_revenue.toLocaleString()}

*Recommendation*: ${
      computed.cashRunway < 3
        ? 'Critical: You have less than 3 months of runway left. Consider lowering operational cost outlays or requesting a working capital line immediately.'
        : 'Your liquidity is currently in a healthy range. Keep monitoring large transaction outlays.'
    }`;
  }

  if (query.includes('debt') || query.includes('equity') || query.includes('ratio')) {
    return `Regarding your solvency and debt metrics:
- **Debt Ratio**: ${Math.round(computed.debtRatio * 100)}% of your assets are funded by creditors.
- **Current Ratio**: ${computed.currentRatio} (target > 1.5).
- **Quick Ratio**: ${computed.quickRatio} (target > 1.0).

${computed.explanations.currentRatio}`;
  }

  if (query.includes('mfa') || query.includes('cyber') || query.includes('vulnerabilit') || query.includes('patch')) {
    let maturityStr = '';
    if (client.aiCompanyProfile) {
      maturityStr = ` Our assessment indicates a **${client.aiCompanyProfile.cybersecurityMaturity} maturity rating** for your security posture.`;
    }
    
    let recommendation = 'Enabling MFA immediately will reduce cyber risk by 25 points.';
    if (client.businessProfile) {
      const bp = client.businessProfile;
      const compl = bp.complianceCertifications ? ` and is subject to ${bp.complianceCertifications} requirements` : '';
      recommendation = `Because your ${bp.numEmployees}-employee ${bp.industry.toLowerCase()} company stores sensitive data${compl}, enabling MFA for all remote users should be your highest cybersecurity priority.`;
    }

    return `Here is a breakdown of your cybersecurity operational posture:
- **MFA Status**: ${client.cyberMetrics.mfa_enabled ? 'Enabled' : 'Disabled (Critical vulnerability)'}
- **Vulnerabilities**: ${client.cyberMetrics.open_vulnerabilities_count} open CVEs.
- **Backup Integrity**: Backup status is listed as "${client.cyberMetrics.backup_status}".
- **Phishing Incidents**: ${client.cyberMetrics.phishing_incidents_count} incidents flagged this quarter.
- **Security Maturity**: ${maturityStr}

*Risk Impact*: These factors combine to create a **Cyber Risk Score of ${computed.cyberRiskScore}/100** (where lower is safer). 

*Recommendation*: ${!client.cyberMetrics.mfa_enabled ? recommendation : 'Maintain your security controls and review unpatched items.'}`;
  }

  if (query.includes('vendor') || query.includes('supplier')) {
    const criticalVendors = client.vendors.filter((v: any) => v.criticality === 'critical');
    return `Vendor concentration is **${client.financialMetrics.vendor_concentration}%**.
You have ${client.vendors.length} vendors tracked.
${
  criticalVendors.length > 0
    ? `Critical vendors: ${criticalVendors.map((v: any) => `${v.name} (${v.country})`).join(', ')}.`
    : 'No critical suppliers are registered.'
}

Ensure all critical vendors comply with your security policies.`;
  }

  if (query.includes('fraud') || query.includes('flag') || query.includes('transaction')) {
    const flagged = client.transactions.filter((t: any) => t.is_flagged);
    return `Our fraud detection algorithm scanned your recent bank ledger.
We found **${flagged.length} flagged transactions**:
${
  flagged.length > 0
    ? flagged.map((t: any) => `- **$${Math.abs(t.amount).toLocaleString()}**: ${t.description} (Reason: *${t.flag_reason}*)`).join('\n')
    : 'No suspicious duplicate invoices or off-hours activities detected.'
}

Please audit these flagged line items in your accounting software.`;
  }

  if (client.aiCompanyProfile) {
    const ap = client.aiCompanyProfile;
    const bp = client.businessProfile;
    return `Hello! I am the **RiskPulse AI Chatbot**. I am currently running risk diagnostics for **${client.name}**, an established **${client.industry}** company with **${bp?.numEmployees || 25}** employees. 

Based on our AI assessment:
- **Resilience Index**: ${ap.overallOperationalResilienceIndex}/100
- **Risk Profile**: ${ap.assignedRiskProfile}
- **Financial Maturity**: ${ap.financialMaturity.toUpperCase()}
- **Cybersecurity Maturity**: ${ap.cybersecurityMaturity.toUpperCase()}

How can I help you analyze the risk profile for **${client.name}** today? You can ask about financial runway, cybersecurity posture, concentration index, or manual document uploads!`;
  }

  return `Hello! I am the **RiskPulse AI Chatbot**. I can answer questions about:
1. **Financial Metrics & Ratios** (e.g., current ratio, runway, debt status)
2. **Cybersecurity Assessments** (MFA, backups, open vulnerabilities)
3. **Vendor Security Risk** & dependency scores
4. **Recent Transactions** & automated fraud flags
5. **Uploaded Documents & Policies** (Mini RAG)

How can I help you analyze the risk profile for **${client.name}** today?`;
}
