import { NextResponse } from 'next/server';
import { getClientById } from '@/lib/db';
import { computeMetrics } from '@/lib/formulas';
import { jsPDF } from 'jspdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return new Response('clientId parameter is required', { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return new Response('Client not found', { status: 404 });
    }

    const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color Palette
    const primaryColor = [17, 24, 39]; // Gray 900
    const secondaryColor = [79, 70, 229]; // Indigo 600
    const accentColor = [220, 38, 38]; // Red 600
    const textColor = [55, 65, 81]; // Gray 700
    const lightBg = [249, 250, 251]; // Gray 50

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('RiskPulse', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219); // Gray 300
    doc.text('Client Executive Risk Assessment Report', 15, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 155, 30);

    // Client Info
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Client Profile: ${client.name}`, 15, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Industry: ${client.industry}`, 15, 59);
    doc.text(`Monitored SME ID: ${client.id}`, 15, 65);

    // Scores Summary Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(15, 72, 180, 25, 2, 2, 'F');

    // Business Health Score
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Business Health Score', 25, 80);
    doc.setFontSize(18);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${computed.overallHealthScore}/100`, 25, 90);

    // Financial Risk Score
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Financial Risk Score', 85, 80);
    doc.setFontSize(18);
    if (computed.financialRiskScore > 50) doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    else doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${computed.financialRiskScore}/100`, 85, 90);

    // Cyber Risk Score
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Cyber Risk Score', 145, 80);
    doc.setFontSize(18);
    if (computed.cyberRiskScore > 50) doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    else doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${computed.cyberRiskScore}/100`, 145, 90);

    // SECTION 1: FINANCIAL METRICS & RATIOS
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('1. Financial Metrics & Liquidity Analysis', 15, 112);
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.line(15, 115, 195, 115);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const finTableData = [
      ['Metric Name', 'Current Value', 'Target Reference', 'Status'],
      ['Current Ratio', `${computed.currentRatio}`, '>= 1.5', computed.currentRatio >= 1.5 ? 'Healthy' : 'Under Target'],
      ['Quick Ratio', `${computed.quickRatio}`, '>= 1.0', computed.quickRatio >= 1.0 ? 'Healthy' : 'Under Target'],
      ['Debt Ratio', `${Math.round(computed.debtRatio * 100)}%`, '<= 50%', computed.debtRatio <= 0.5 ? 'Healthy' : 'Overleveraged'],
      ['Cash Runway', `${computed.cashRunway} months`, '>= 6 months', computed.cashRunway >= 6 ? 'Healthy' : 'Critical'],
      ['Cash Balance', `$${client.financialMetrics.cash_balance.toLocaleString()}`, '-', 'Active'],
      ['Burn Rate', `$${client.financialMetrics.monthly_burn_rate.toLocaleString()}/mo`, '-', 'Active'],
      ['Customer Conc.', `${client.financialMetrics.customer_concentration}%`, '<= 25%', client.financialMetrics.customer_concentration <= 25 ? 'Diversified' : 'High Risk'],
      ['Vendor Conc.', `${client.financialMetrics.vendor_concentration}%`, '<= 30%', client.financialMetrics.vendor_concentration <= 30 ? 'Diversified' : 'High Risk']
    ];

    let yOffset = 122;
    finTableData.forEach((row, i) => {
      if (i === 0) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      doc.text(row[0], 18, yOffset);
      doc.text(row[1], 75, yOffset);
      doc.text(row[2], 125, yOffset);
      doc.text(row[3], 165, yOffset);

      doc.line(15, yOffset + 3, 195, yOffset + 3);
      yOffset += 8;
    });

    // SECTION 2: CYBERSECURITY ASSESSMENT
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('2. Cybersecurity Posture Assessment', 15, 205);
    doc.line(15, 208, 195, 208);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const cyberTableData = [
      ['Control Component', 'Current Status', 'Risk Weight', 'Requirement'],
      ['Multi-Factor Auth (MFA)', client.cyberMetrics.mfa_enabled ? 'ENABLED' : 'DISABLED', 'High', 'Enforced on all accounts'],
      ['Password Policy', client.cyberMetrics.password_policy_enabled ? 'ACTIVE' : 'INACTIVE', 'Medium', 'Complex & Rotated'],
      ['Backup System', client.cyberMetrics.backup_status.toUpperCase(), 'High', 'Active weekly backups'],
      ['Endpoint Protection', client.cyberMetrics.endpoint_protection ? 'ACTIVE' : 'INACTIVE', 'High', 'Enforced on all machines'],
      ['Phishing Incidents', `${client.cyberMetrics.phishing_incidents_count} detected`, 'Low', 'Zero toleration'],
      ['Open Vulnerabilities', `${client.cyberMetrics.open_vulnerabilities_count} open CVEs`, 'Medium', 'Zero patches missing'],
      ['Patch Management', client.cyberMetrics.patch_status.toUpperCase(), 'Medium', 'Systems updated'],
      ['Security Awareness', `${client.cyberMetrics.security_awareness_completion}% completed`, 'Medium', '100% completion target']
    ];

    yOffset = 215;
    cyberTableData.forEach((row, i) => {
      if (i === 0) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      doc.text(row[0], 18, yOffset);
      doc.text(row[1], 75, yOffset);
      doc.text(row[2], 125, yOffset);
      doc.text(row[3], 165, yOffset);

      doc.line(15, yOffset + 3, 195, yOffset + 3);
      yOffset += 8;
    });

    // PAGE 2: EXECUTIVE RECOMMENDATIONS
    doc.addPage();

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RiskPulse - Advisor Recommendations & Actions', 15, 13);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('3. AI Advisor Strategic Actions', 15, 35);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 38, 195, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // High quality explanations derived from formula logic
    let warningY = 48;
    
    // Financial Runway Warning
    if (computed.cashRunway < 3) {
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('CRITICAL FINANCIAL WARNING:', 15, warningY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Cash runway is critically low at ${computed.cashRunway} months. Capital operations will shut down unless immediate funds are acquired or burn rate is pruned.`, 15, warningY + 6, { maxWidth: 180 });
      warningY += 18;
    }

    // MFA Warning
    if (!client.cyberMetrics.mfa_enabled) {
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('CRITICAL CYBERSECURITY WARNING:', 15, warningY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Multi-Factor Authentication is currently disabled. Active business operations are highly susceptible to simple identity hijacking, phishing infiltration, and ransomware threats.', 15, warningY + 6, { maxWidth: 180 });
      warningY += 18;
    }

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Recommended Next Actions:', 15, warningY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const recs = [
      `Enforce active Multi-Factor Authentication immediately to reduce business operational risk.`,
      `Reduce supplier concentration by setting up alternative vendors (currently top suppliers occupy ${client.financialMetrics.vendor_concentration}%).`,
      `Re-negotiate customer milestones or follow up on $${client.financialMetrics.outstanding_receivables.toLocaleString()} of receivables to improve cash runway.`,
      `Update operating system patches to resolve the current count of ${client.cyberMetrics.open_vulnerabilities_count} security CVEs.`,
      `Run automated security testing to verify backup reliability (current status: ${client.cyberMetrics.backup_status}).`
    ];

    let actionY = warningY + 13;
    recs.forEach((rec, idx) => {
      doc.text(`${idx + 1}.`, 15, actionY);
      doc.text(rec, 22, actionY, { maxWidth: 170 });
      actionY += 10;
    });

    // Footer signature
    doc.line(15, 230, 195, 230);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('This report is automatically compiled by RiskPulse Platform under standard MSP monitoring terms.', 15, 238);
    doc.text('RiskPulse Platform - Built for Secure SME Operations.', 15, 243);

    // Output PDF as Buffer
    const pdfOutput = doc.output('arraybuffer');

    return new Response(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="RiskPulse_${client.name.replace(/\s+/g, '_')}_Report.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response('Failed to generate PDF report', { status: 500 });
  }
}
