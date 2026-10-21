import { NextResponse } from 'next/server';
import { getAIConfig, getOpenAIClient, safeParseJSON } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { action, companyProfile, history, currentAnswer, clientMetrics, scenario } = await request.json();

    const aiConfig = getAIConfig();
    if (!aiConfig.isConfigured) {
      return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    const openai = getOpenAIClient();
    const modelName = aiConfig.model;

    // ACTION 1: Initialize custom assessment and get the first company-specific question
    if (action === 'init_assessment') {
      const systemPrompt = `You are a premier Virtual CFO and Senior CISO Cyber-Risk Consultant. 
Your goal is to perform a deep, interactive situational risk assessment for a company.
Based on the company profile details provided, generate the FIRST highly specific, custom diagnostic question to begin the interview.
The question must not be generic or template-driven. It should be tailored specifically to the company's industry, size, and business model.

You must return a JSON response matching the following schema:
{
  "question": {
    "id": 1,
    "type": "open_ended" | "multiple_choice" | "yes_no" | "rating_scale",
    "text": "The text of the customized question...",
    "options": ["Option A", "Option B", ...] // Only include if type is multiple_choice, yes_no, or rating_scale
  }
}`;

      const prompt = `Company Profile:
- Name: ${companyProfile.name}
- Industry: ${companyProfile.industry}
- Employee Count / Size: ${companyProfile.size}
- Business Model / Core Operations: ${companyProfile.businessModel}

Return the response in raw JSON format.`;

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
      return NextResponse.json({ success: true, question: parsed.question });
    }

    // ACTION 2: Submit an answer, analyze it, and decide whether to ask a follow-up or proceed
    if (action === 'submit_answer') {
      const systemPrompt = `You are an elite corporate risk consultant conducting an adaptive risk diagnostic interview.
You have the company profile and the history of questions and answers so far.
Analyze the user's latest response:
- If the response is too short, vague, or you need more context to understand their business model, goals, challenges, or priorities, OR if you have asked fewer than 3 questions in total, you must ask a relevant follow-up question. Set "canProceed" to false.
- If you have collected enough detailed information (and have asked at least 3 questions in total) to construct high-fidelity risk playbooks, set "canProceed" to true.

You must return a JSON response matching the following schema:
{
  "canProceed": boolean,
  "followUpQuestion": {
    "id": number,
    "type": "open_ended" | "multiple_choice" | "yes_no" | "rating_scale",
    "text": "The customized follow-up question text...",
    "options": ["Option A", "Option B", ...] // Only if type requires options
  } // Only present if canProceed is false
}`;

      const prompt = `Company Profile:
- Name: ${companyProfile.name}
- Industry: ${companyProfile.industry}
- Size: ${companyProfile.size}
- Business Model: ${companyProfile.businessModel}

Interview Q&A History:
${JSON.stringify(history)}

Latest Answer Received:
"${currentAnswer}"

Return the response in raw JSON format.`;

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
      return NextResponse.json({ success: true, ...parsed });
    }

    // ACTION 3: Generate the custom AI Analysis and Situational Playbooks
    if (action === 'generate_playbooks') {
      const systemPrompt = `You are a virtual CISO and CFO Risk Advisory board.
Based on the company profile and the detailed interview responses, generate:
1. An AI Analysis profile of the company.
2. Exactly 3 realistic, highly customized situational risk playbooks tailored to the company.
Each situational risk playbook must contain detailed, actionable guidance and align precisely with the company's real operational realities. Avoid generic template descriptions.

You must return a JSON response matching the following schema:
{
  "analysis": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "risks": ["...", "..."],
    "opportunities": ["...", "..."],
    "operationalPatterns": "...",
    "financialConsiderations": "...",
    "industrySpecificChallenges": "..."
  },
  "playbooks": [
    {
      "id": "string-slug",
      "title": "Clear, specific title of the risk scenario...",
      "overview": "Detailed overview of the situation...",
      "relevance": "Why this specific situation is highly relevant to this company based on their Q&A...",
      "impact": "Detailed business and financial impact...",
      "riskLevel": "Low" | "Medium" | "High" | "Critical",
      "warningSigns": "Early warning signs to monitor...",
      "immediateActions": "Immediate emergency actions to take...",
      "shortTermPlan": "Action plan for the first 30 days...",
      "longTermStrategy": "Strategic posture changes over 6-12 months...",
      "preventativeMeasures": "Preventative measures to deploy now...",
      "kpis": "Recommended KPIs to monitor...",
      "recommendations": "AI-generated strategic consultant recommendations...",
      "alternativeStrategies": "Alternative response pathways...",
      "outcomes": {
        "bestCase": "Best-case response outcome...",
        "expectedCase": "Expected-case response outcome...",
        "worstCase": "Worst-case scenario outcome..."
      }
    }
  ]
}`;

      const prompt = `Company Profile:
- Name: ${companyProfile.name}
- Industry: ${companyProfile.industry}
- Size: ${companyProfile.size}
- Business Model: ${companyProfile.businessModel}

Detailed Q&A Interview Logs:
${JSON.stringify(history)}

Return the response in raw JSON format.`;

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
      return NextResponse.json({ success: true, ...parsed });
    }

    // ACTION 4: Trigger Real-time AI Deep Analysis for a specific library scenario
    if (action === 'generate_live_scenario_analysis') {
      const systemPrompt = `You are a virtual CISO and CFO Risk Advisory board.
Analyze the impact of the following risk scenario: "${scenario.title}"
Context: "${scenario.context}"
Description: "${scenario.description}"

Analyze how this scenario applies specifically to a company with the following real-time metrics:
- Company Name: ${companyProfile.name}
- Industry: ${companyProfile.industry}
- Cash Balance: ${clientMetrics.cashBalance}
- Monthly Revenue: ${clientMetrics.monthlyRevenue}
- Monthly Burn Rate: ${clientMetrics.monthlyBurn}
- MFA Enabled: ${clientMetrics.mfaEnabled}
- Backup Status: ${clientMetrics.backupStatus}
- Critical Open CVEs: ${clientMetrics.openCVEs}

You must return a JSON response with:
{
  "liveAnalysis": "A detailed, custom analysis of what would happen if this scenario occurred today, referencing their actual cash levels and security controls. Be specific, quantitative, and direct.",
  "rootCauseAnalysis": "Analysis of the specific weaknesses in their current posture that make them vulnerable to this scenario.",
  "recommendedResponse": "Specific immediate steps they must take to mitigate this risk based on their current setup.",
  "expectedImpact": "Quantitative estimate of the financial or operational impact (e.g. drop in health score, days to recovery)."
}`;

      const prompt = `Return the response in raw JSON format.`;

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
      return NextResponse.json({ success: true, ...parsed });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Custom Situational AI API Error:', error);
    return NextResponse.json({ error: 'Failed to process situational AI request.' }, { status: 500 });
  }
}
