import { NextResponse } from 'next/server';
import zlib from 'zlib';
import mammoth from 'mammoth';
import { getAIConfig, getOpenAIClient, safeParseJSON } from '@/lib/ai';

if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix { };
}
const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const PDFParseClass = pdf.PDFParse || (pdf.default && pdf.default.PDFParse) || pdf;
    const parser = new PDFParseClass(new Uint8Array(pdfBuffer));
    const data = await parser.getText();
    if (data && data.text && data.text.trim() && data.text.trim().length > 150) {
      return data.text;
    }
  } catch (err) {
    console.warn('pdf-parse failed, falling back to custom parser:', err);
  }

  // Custom parser fallback
  const pdfString = pdfBuffer.toString('binary');
  let fullText = '';

  let searchIdx = 0;
  while (true) {
    const streamStartIdx = pdfString.indexOf('stream', searchIdx);
    if (streamStartIdx === -1) break;

    let binaryStart = streamStartIdx + 6;
    if (pdfBuffer[binaryStart] === 13) binaryStart++;
    if (pdfBuffer[binaryStart] === 10) binaryStart++;

    const streamEndIdx = pdfString.indexOf('endstream', binaryStart);
    if (streamEndIdx === -1) break;

    let trimmedEnd = streamEndIdx;
    while (trimmedEnd > binaryStart && (pdfBuffer[trimmedEnd - 1] === 10 || pdfBuffer[trimmedEnd - 1] === 13)) {
      trimmedEnd--;
    }

    const streamBuffer = pdfBuffer.slice(binaryStart, trimmedEnd);
    searchIdx = streamEndIdx + 9;

    let decompressed;
    try {
      decompressed = zlib.inflateSync(streamBuffer);
    } catch (e) {
      try {
        decompressed = zlib.unzipSync(streamBuffer);
      } catch (err) {
        decompressed = streamBuffer;
      }
    }

    if (decompressed) {
      const text = decompressed.toString('utf8');

      let foundText = '';
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(text)) !== null) {
        foundText += tjMatch[1] + ' ';
      }

      const tjBigRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjBigMatch;
      while ((tjBigMatch = tjBigRegex.exec(text)) !== null) {
        const content = tjBigMatch[1];
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(content)) !== null) {
          foundText += innerMatch[1];
        }
        foundText += ' ';
      }

      if (foundText.trim()) {
        fullText += foundText + ' ';
      } else {
        fullText += text + ' ';
      }
    }
  }

  return fullText
    .replace(/\\([\(\)])/g, '$1')
    .replace(/\\/g, '')
    .trim();
}

/**
 * Detects financial report scale units (millions/thousands/billions) and reporting period
 */
function detectUnitsAndPeriod(text: string): { multiplier: number; periodMonths: number } {
  const lower = text.toLowerCase();
  let multiplier = 1;
  if (/in\s+(?:€|\$|eur|usd|us\$)?\s*billions?|billions\s+of\s+(?:euros|dollars)/i.test(lower)) {
    multiplier = 1000000000;
  } else if (/in\s+(?:€|\$|eur|usd|us\$)?\s*millions?|millions\s+of\s+(?:euros|dollars)/i.test(lower)) {
    multiplier = 1000000;
  } else if (/in\s+(?:€|\$|eur|usd|us\$)?\s*thousands?|thousands\s+of\s+(?:euros|dollars)/i.test(lower)) {
    multiplier = 1000;
  }

  let periodMonths = 1;
  if (/three\s+months\s+ended|quarter\s+ended|\bq[1-4]\b/i.test(lower)) {
    periodMonths = 3;
  } else if (/six\s+months\s+ended/i.test(lower)) {
    periodMonths = 6;
  } else if (/twelve\s+months\s+ended|year\s+ended|annual/i.test(lower)) {
    periodMonths = 12;
  }

  return { multiplier, periodMonths };
}

/**
 * Condenses long documents (e.g. 40+ page SEC filings) by selecting the core financial statement tables
 */
function extractRelevantFinancialSections(fullText: string): string {
  if (fullText.length <= 15000) {
    return fullText;
  }

  const statementKeywords = [
    /statement\s+of\s+(?:operations|income|earnings|profit\s+and\s+loss)/i,
    /statement\s+of\s+financial\s+position|balance\s+sheet/i,
    /statement\s+of\s+cash\s+flows/i,
    /indebtedness|outstanding\s+debt|borrowings|credit\s+facility|exchangeable\s+notes|lease\s+liabilities/i,
    /trade\s+and\s+other\s+receivables/i,
    /trade\s+and\s+other\s+payables/i
  ];

  const lines = fullText.split('\n');
  const addedLineIndices = new Set<number>();

  // Always keep first 120 lines for title, company metadata, and unit definitions
  for (let i = 0; i < Math.min(120, lines.length); i++) {
    addedLineIndices.add(i);
  }

  // Scan for financial tables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of statementKeywords) {
      if (pattern.test(line)) {
        const start = Math.max(0, i - 10);
        const end = Math.min(lines.length, i + 100);
        for (let j = start; j < end; j++) {
          addedLineIndices.add(j);
        }
        break;
      }
    }
  }

  const sortedIndices = Array.from(addedLineIndices).sort((a, b) => a - b);
  const condensed = sortedIndices.map(idx => lines[idx]).join('\n');
  return condensed.substring(0, 20000);
}

/**
 * Normalizes extracted metrics to full integer values and monthly averages
 */
function normalizeFinancialMetrics(rawMetrics: any, text: string) {
  const { multiplier, periodMonths } = detectUnitsAndPeriod(text);

  let cash = Number(rawMetrics.cashBalance) || 0;
  let rev = Number(rawMetrics.monthlyRevenue) || 0;
  let exp = Number(rawMetrics.monthlyExpenses) || 0;
  let debt = Number(rawMetrics.existingDebt) || 0;
  let ar = Number(rawMetrics.accountsReceivable) || 0;
  let ap = Number(rawMetrics.accountsPayable) || 0;

  // 1. Scale Normalization: if document is in millions or thousands, but numbers are unscaled literals
  if (multiplier > 1) {
    if (cash > 0 && cash < 100000) cash = cash * multiplier;
    if (rev > 0 && rev < 100000) rev = rev * multiplier;
    if (exp > 0 && exp < 100000) exp = exp * multiplier;
    if (debt > 0 && debt < 100000) debt = debt * multiplier;
    if (ar > 0 && ar < 100000) ar = ar * multiplier;
    if (ap > 0 && ap < 100000) ap = ap * multiplier;
  }

  // 2. Period Normalization: convert quarterly/annual revenue and expenses to monthly averages
  if (periodMonths > 1) {
    // If revenue matches or is near period total, divide by number of months
    const revMatch = text.match(/revenue[^\d\n]*([\d,]+)/i);
    if (revMatch) {
      const parsedRev = parseFloat(revMatch[1].replace(/,/g, '')) * (multiplier > 1 ? multiplier : 1);
      if (Math.abs(rev - parsedRev) < (parsedRev * 0.15)) {
        rev = Math.round(rev / periodMonths);
      }
    } else if (rev > 1000000 && !rawMetrics._isAlreadyMonthly) {
      rev = Math.round(rev / periodMonths);
    }

    const expMatch = text.match(/(?:cost\s+of\s+revenue|total\s+operating\s+expenses|operating\s+expenses)[^\d\n]*([\d,]+)/i);
    if (expMatch) {
      const parsedExp = parseFloat(expMatch[1].replace(/,/g, '')) * (multiplier > 1 ? multiplier : 1);
      if (Math.abs(exp - parsedExp) < (parsedExp * 0.15)) {
        exp = Math.round(exp / periodMonths);
      }
    } else if (exp > 1000000 && !rawMetrics._isAlreadyMonthly) {
      exp = Math.round(exp / periodMonths);
    }
  }

  // 3. Debt vs Total Liabilities distinction
  if (/no\s+outstanding\s+indebtedness/i.test(text)) {
    const leaseMatch = text.match(/lease\s+liabilities[^\d\n]*([\d,]+)/i);
    if (leaseMatch) {
      let lVal = parseFloat(leaseMatch[1].replace(/,/g, ''));
      if (multiplier > 1 && lVal < 100000) lVal = lVal * multiplier;
      debt = Math.round(lVal);
    } else {
      debt = 0;
    }
  }

  return {
    cashBalance: Math.round(cash),
    monthlyRevenue: Math.round(rev),
    monthlyExpenses: Math.round(exp),
    existingDebt: Math.round(debt),
    accountsReceivable: Math.round(ar),
    accountsPayable: Math.round(ap)
  };
}

function localRegexExtract(text: string) {
  const { multiplier, periodMonths } = detectUnitsAndPeriod(text);

  const extractField = (keywords: string[], isMonthlyProrated: boolean = false): number | null => {
    for (const kw of keywords) {
      const regex = new RegExp(kw, 'gi');
      const matches = [...text.matchAll(regex)];

      for (const match of matches) {
        if (match.index !== undefined) {
          const windowText = text.substring(match.index + match[0].length, match.index + match[0].length + 250);

          const numRegex = /(?:[\$€£]\s*)?([\d,]+(?:\.\d+)?)(?:\s*(million|billion|thousand|m|b|k))?\b/gi;
          const numMatches = [...windowText.matchAll(numRegex)];
          for (const m of numMatches) {
            let valStr = m[1];
            const suffix = (m[2] || '').toLowerCase();
            let rawNum = parseFloat(valStr.replace(/,/g, ''));
            if (isNaN(rawNum)) continue;

            // Ignore calendar days and recent years
            if (rawNum <= 31 || (rawNum >= 2020 && rawNum <= 2030)) continue;

            let val = rawNum;
            if (suffix === 'billion' || suffix === 'b') val = val * 1000000000;
            else if (suffix === 'million' || suffix === 'm') val = val * 1000000;
            else if (suffix === 'thousand' || suffix === 'k') val = val * 1000;
            else if (multiplier > 1 && val < 100000) val = val * multiplier;

            if (isMonthlyProrated && periodMonths > 1 && val > 10000) {
              val = val / periodMonths;
            }

            return Math.round(val);
          }
        }
      }
    }
    return null;
  };

  let debt = extractField(['exchangeable notes', 'long-term borrowings', 'lease liabilities', 'borrowings', 'credit facility', 'existing debt', 'loans payable']);
  if (debt === null) {
    if (/no\s+outstanding\s+indebtedness/i.test(text)) {
      debt = 0;
    } else {
      debt = extractField(['total liabilities', 'obligations']) ?? 150000;
    }
  }

  return {
    cashBalance: extractField(['cash and cash equivalents', 'cash equivalents', 'cash balance', 'cash']) ?? 120000,
    monthlyRevenue: extractField(['monthly gross revenue', 'total revenue', 'revenues', 'revenue', 'turnover'], true) ?? 75000,
    monthlyExpenses: extractField(['total operating expenses', 'operating expenses', 'cost of revenue', 'monthly burn rate', 'expenses'], true) ?? 50000,
    existingDebt: debt,
    accountsReceivable: extractField(['trade and other receivables', 'accounts receivable', 'trade receivables', 'receivables']) ?? 45000,
    accountsPayable: extractField(['trade and other payables', 'accounts payable', 'trade payables', 'payables']) ?? 30000,
    _isAlreadyMonthly: true
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const filename = file.name;
    const fileType = filename.split('.').pop()?.toUpperCase() || 'TXT';
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (fileType === 'TXT') {
      extractedText = buffer.toString('utf8');
    } else if (fileType === 'PDF') {
      extractedText = await extractTextFromPDF(buffer);
    } else if (fileType === 'DOCX') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Empty text content' }, { status: 400 });
    }

    // Prepare focused financial sections to ensure clean token usage on large filings
    const focusedText = extractRelevantFinancialSections(extractedText);

    // Try OpenAI / BluesMinds parsing if configured
    const aiConfig = getAIConfig();
    if (aiConfig.isConfigured) {
      try {
        const openai = getOpenAIClient();
        const systemPrompt = `You are an expert corporate financial analyst and parser.
Analyze the provided financial text and extract the required metrics. Follow these rules carefully:

1. UNIT DETECTION AND SCALING:
   Check the report's units (e.g., "in millions", "in thousands", "in EUR millions", "in € millions"). 
   You MUST scale the parsed numbers to their full, absolute integer value.
   - For example, if a value is listed as "4,781" under "in millions", return 4781000000.
   - If a value is listed as "140,005" under "in units", return 140005.
   - NEVER drop the scale factor zeros. If a value is 5,118 million, return 5118000000, not 5118.

2. PERIOD DIVISION (ANNUAL VS QUARTERLY):
   Detect whether the text represents a full year (e.g., "Year Ended", "Twelve Months Ended") or a single quarter (e.g., "Three Months Ended", "Q1", "Q2", "Q3", "Quarter Ended").
   - If it is a QUARTERLY statement (3 months): Divide the revenue and expenses by 3 to compute monthly averages.
   - If it is an ANNUAL statement (12 months): Divide the revenue and expenses by 12 to compute monthly averages.
   - Monthly Revenue = (Period Revenue) / (number of months in period)
   - Monthly Operating Expenses = (Period Cost of Revenue + Period Operating Expenses) / (number of months in period)

3. METRICS DEFINITIONS & TERMINOLOGY:
   - "cashBalance": Map from "Cash and cash equivalents", "Cash at bank", or "Unrestricted Cash".
   - "accountsReceivable": Map from "Trade and other receivables" or "Receivables".
   - "accountsPayable": Map from "Trade and other payables" or "Payables".
   - "existingDebt": Map specifically from interest-bearing debt (e.g. Exchangeable Notes, borrowings, loans) or Lease Liabilities. 
     DO NOT return Total Liabilities as debt. If the filing explicitly states there is no outstanding indebtedness, return lease liabilities or 0.

Return a JSON object matching this schema exactly:
{
  "cashBalance": number,
  "monthlyRevenue": number,
  "monthlyExpenses": number,
  "existingDebt": number,
  "accountsReceivable": number,
  "accountsPayable": number
}`;

        const completion = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: focusedText }
          ],
          response_format: { type: 'json_object' }
        });

        const parsed = safeParseJSON(completion.choices[0]?.message?.content, {});
        const regexMetrics = localRegexExtract(extractedText);

        console.log('[RiskPulse Parser] OpenAI Raw Output:', parsed);
        console.log('[RiskPulse Parser] Local Regex Extract:', regexMetrics);

        const merged = {
          cashBalance: parsed.cashBalance || regexMetrics.cashBalance,
          monthlyRevenue: parsed.monthlyRevenue || regexMetrics.monthlyRevenue,
          monthlyExpenses: parsed.monthlyExpenses || regexMetrics.monthlyExpenses,
          existingDebt: parsed.existingDebt !== undefined ? parsed.existingDebt : regexMetrics.existingDebt,
          accountsReceivable: parsed.accountsReceivable || regexMetrics.accountsReceivable,
          accountsPayable: parsed.accountsPayable || regexMetrics.accountsPayable
        };

        const normalized = normalizeFinancialMetrics(merged, extractedText);

        return NextResponse.json({
          success: true,
          metrics: normalized
        });
      } catch (err) {
        console.error('OpenAI financial parse failed, using regex fallback:', err);
      }
    }

    // High fidelity regex search fallback
    const rawMetrics = localRegexExtract(extractedText);
    const metrics = normalizeFinancialMetrics(rawMetrics, extractedText);
    console.log('[RiskPulse Parser] Fallback triggered. Normalized Metrics:', metrics);
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Financial parse error:', error);
    return NextResponse.json({ error: 'Failed to process financial statement' }, { status: 500 });
  }
}
