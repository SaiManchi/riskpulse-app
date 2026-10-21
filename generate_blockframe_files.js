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
  console.log(`Generated PDF file: ${filename}`);
}

const financialData = `BLOCKFRAME, INC.
CONSOLIDATED AUDITED STATEMENT OF FINANCIAL POSITION
As of December 31, 2024 and 2023 (Source: SEC EDGAR CIK 0002044949)

PART I: ASSETS & LIQUIDITY
- Cash and Cash Equivalents:
  * As of December 31, 2024: $46,458
  * As of December 31, 2023: $77,438
- Total Corporate Assets: $378,295

PART II: REVENUE & OPERATING SUMMARY
- Gross Sales / Revenues:
  * Fiscal Year 2023: $10,000
  * Fiscal Year 2022: $15,000
- Net Losses:
  * Fiscal Year 2024 Net Loss: $229,303
  * Fiscal Year 2023 Net Loss: $172,916
  * Cumulative losses incurred since inception.

PART III: LIABILITIES & DEBT STRUCTURE
- Long-Term Borrowings:
  * Promissory Note (CEO Christopher Paul Gorog, August 2024): $45,000
  * Note carries accrued interest and is payable on demand.
- Note on Going Concern:
  * Audit report indicates substantial doubt regarding the company's ability to continue as a going concern without additional capital.
`;

const cyberData = `BlockFrame, Inc. Information Security & Data Privacy Notice
Corporate Address: 990 Point of the Pines Dr., Colorado Springs, CO 80919

1. Security Infrastructure & Zero-Trust Framework:
- Implements EcoSecure Provisioning (ESP) for cryptographic key management in IoT devices.
- Uses CyberDome for secure communication protocols and zero-trust device verification.
- Enforces strict digital identity validation across all internal repositories.

2. Data Collection and Privacy Policy:
- Automatically logs user device characteristics, IP addresses, and browser specifications.
- Protects personal data collected through sales, events, and marketing.
- Restricts internal administrative database access using role-based access control.

3. Point of Contact & Security Team:
- Direct inquiries or breach notices to support@blockframetech.com or info@blockframetech.com.
`;

// Write to local project root
generatePDF('/Users/sai/Downloads/riskpulse/blockframe_financial_statement_2024.pdf', financialData);
generatePDF('/Users/sai/Downloads/riskpulse/blockframe_cyber_security_policy_2024.pdf', cyberData);

// Write to deployment directory
generatePDF('/Users/sai/Downloads/riskpulse/riskpulse-deploy/blockframe_financial_statement_2024.pdf', financialData);
generatePDF('/Users/sai/Downloads/riskpulse/riskpulse-deploy/blockframe_cyber_security_policy_2024.pdf', cyberData);
