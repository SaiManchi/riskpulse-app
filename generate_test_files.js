const fs = require('fs');

function generatePDF(filename, textContent) {
  const streamContent = textContent;
  const pdfText = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000192 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
365
%%EOF`;

  fs.writeFileSync(filename, pdfText, 'utf8');
  console.log(`Generated simple text-PDF file: ${filename}`);
}

const financialData = `GAINWELL TECHNOLOGIES LLC
CONSOLIDATED STATEMENT OF FINANCIAL POSITION
For the Fiscal Period Ended December 31, 2025

PART I: ASSETS & LIQUIDITY INDICATORS
- Cash and Cash Equivalents: The group holds $145,000 in unrestricted cash deposits at Silicon Valley Bank.
- Accounts Receivable: Trade accounts receivable balance is valued at $25,000, representing outstanding payments from state agencies.
- Total Current Assets: $170,000

PART II: LIABILITIES & DEBT STRUCTURE
- Accounts Payable: Outstanding commercial trade payables total $15,000.
- Long-Term Borrowings: Outstanding senior notes and term loan debt totals $80,000.
- Total Obligations: $95,000

PART III: INCOME & CASH FLOW STATEMENT
- Monthly Gross Revenue: Consolidated monthly operating revenue is recorded at $60,000.
- Monthly Operating Expenses: Total monthly overhead, administrative cost outlays, and burn rate is $40,000.
- Net Monthly Income: $20,000

PART IV: FINANCIAL MANAGEMENT FOOTNOTES
- Customer Concentration: A single state government Medicaid contract accounts for 42% of the company's total annual revenues.
- Vendor Concentration: Supply chain expenditures are concentrated, with 32% of procurement spend allocated to a single cloud infrastructure provider.
`;

const cyberData = `Gainwell Technologies Cybersecurity & Compliance Policy
1. Headcount: The enterprise operates with approximately 20,000 employees across multiple global sites.
2. MFA Enforcement: Multi-Factor Authentication (MFA) must be enforced for all employees. Remote login access is disabled without MFA.
3. Compliance Framework: The company must maintain strict HIPAA and SOC2 compliance certifications for healthcare client portals.
4. Backup Policy: System data backups must run daily. Backup status is active and verified weekly.
5. Patch management: Automated critical software patching is enabled.
6. Vulnerabilities: The system has zero critical vulnerabilities detected.
`;

generatePDF('/Users/sai/riskpulse/gainwell_financial_statement_test.pdf', financialData);
generatePDF('/Users/sai/riskpulse/gainwell_cyber_policy_test.pdf', cyberData);
