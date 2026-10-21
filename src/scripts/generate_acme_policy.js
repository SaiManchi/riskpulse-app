const { jsPDF } = require('jspdf');

function generatePolicy() {
  const doc = new jsPDF();
  
  // Page 1: Declarations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CYBER LIABILITY INSURANCE POLICY", 20, 30);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Policy Number: CYP-883921-X", 20, 45);
  doc.text("Insured Entity: Acme Industrial Corp", 20, 52);
  doc.text("Policy Period: January 1, 2026 to December 31, 2026", 20, 59);
  doc.text("Maximum Aggregate Limit: $2,500,000", 20, 66);
  doc.text("Ransomware Claim Limit: $1,000,000", 20, 73);
  doc.text("Deductible Per Claim: $50,000", 20, 80);
  
  doc.setFont("helvetica", "italic");
  doc.text("This policy document provides cyber security liability coverage details for the insured.", 20, 95);
  
  // Page 2: Exclusions
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SECTION II - CONDITIONS & EXCLUSIONS", 20, 30);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("1. MULTI-FACTOR AUTHENTICATION REQUIREMENT", 20, 45);
  doc.text("It is a condition precedent to liability under this policy that the Insured shall", 20, 52);
  doc.text("enforce Multi-Factor Authentication (MFA) on all administrative user access accounts,", 20, 59);
  doc.text("remote network connections, and corporate email portals.", 20, 66);
  
  doc.setFont("helvetica", "bold");
  doc.text("Failure to enforce MFA globally shall completely void all Ransomware claims.", 20, 75);
  
  doc.setFont("helvetica", "normal");
  doc.text("2. BACKUP INTEGRITY POLICY", 20, 88);
  doc.text("The Insured must maintain off-site, offline weekly backups of all critical databases.", 20, 95);
  doc.text("Backups must be tested monthly for integrity.", 20, 102);

  // Page 3: Claims
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SECTION III - CLAIMS & NOTICE PROCEDURES", 20, 30);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("In the event of a security breach or ransomware detection, the Insured must:", 20, 45);
  doc.text("- Notify the Underwriter Claims Team within 24 hours of first discovery.", 20, 54);
  doc.text("- Take immediate containment actions to isolate impacted endpoints.", 20, 62);
  doc.text("- Retain an approved external forensics incident response investigator.", 20, 70);
  
  doc.text("For claims support contact: cyberclaims@underwriters.com or call 1-800-CYBER-911.", 20, 85);
  
  // Save PDF to user workspace
  doc.save("/Users/sai/riskpulse/acme_cyber_policy_test.pdf");
  console.log("Acme Cyber Policy test PDF created successfully!");
}

try {
  generatePolicy();
} catch (e) {
  console.error("Failed to generate policy PDF:", e);
}
