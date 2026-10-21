const fs = require('fs');

const sectorsList = [
  { name: 'Healthcare', compliance: 'HIPAA', risk: 'Critical', focus: 'electronic health records (EHR) databases' },
  { name: 'Retail & E-commerce', compliance: 'PCI-DSS', risk: 'High', focus: 'POS transactional systems' },
  { name: 'Manufacturing & Industry', compliance: 'SOC 2', risk: 'High', focus: 'SCADA and operational machinery supply chains' },
  { name: 'Technology & SaaS', compliance: 'SOC 2 / ISO27001', risk: 'Medium', focus: 'AWS/Azure cloud api infrastructure' },
  { name: 'Construction & Real Estate', compliance: 'OSHA / ISO', risk: 'Medium', focus: 'subcontractor and supplier logistics' },
  { name: 'Professional Services', compliance: 'GDPR / SOC 2', risk: 'Low', focus: 'client consulting data vaults' }
];

const financialBaseTemplates = [
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 12 Months',
    desc: 'Triggered when working capital runway falls below 12 months for {sector} firms.',
    impact: 'Operating runway below 12 months limits long-term growth investments and increases dependency on immediate cash inflows.',
    conditions: [{ field: 'runway', operator: 'lt', value: 12 }],
    recs: ['Optimize non-essential administrative spending.', 'Review billing terms with professional clients.'],
    prevs: ['Build a 6-month capital buffer reserve account.', 'Implement monthly accounts receivable reviews.']
  },
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 6 Months',
    desc: 'Triggered when cash runway drops below 6 months under active burn rates.',
    impact: 'Resilience is impaired. A 6-month cash cushion leaves little buffer to absorb contract cancellations or billing collection delays.',
    conditions: [{ field: 'runway', operator: 'lt', value: 6 }],
    recs: ['Freeze discretionary CapEx spend immediately.', 'Follow up on all overdue invoices past 30 days.'],
    prevs: ['Establish pre-approved working capital lines of credit.', 'Transition to bi-weekly billing schedules.']
  },
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 3 Months',
    desc: 'Triggered when cash reserves are critically thin (< 3 months runway).',
    impact: 'Extremely high threat of operational insolvency. Immediate capital injections or cash infusions are required to maintain payroll.',
    conditions: [{ field: 'runway', operator: 'lt', value: 3 }],
    recs: ['Negotiate accounts payable extensions with core partners.', 'Apply for emergency financing lines.'],
    prevs: ['Implement rigid daily cash-flow monitoring models.', 'Maintain a baseline survival budget blueprint.']
  },
  {
    subCategory: 'Revenue',
    title: 'High Customer Concentration Risk',
    desc: 'Triggered when customer concentration index is elevated (> 30%).',
    impact: 'Severe dependency on a single customer. Loss or payment delay of this client will result in immediate operational distress.',
    conditions: [{ field: 'customer_concentration', operator: 'gt', value: 30 }],
    recs: ['Diversify marketing budget to target new demographics.', 'Renegotiate contract terms to include termination penalties.'],
    prevs: ['Conduct quarterly client revenue contribution assessments.', 'Purchase accounts receivable trade credit insurance.']
  },
  {
    subCategory: 'Expenses',
    title: 'Net Operational Losses',
    desc: 'Triggered when net monthly income falls into a negative deficit.',
    impact: 'Active business operations are burning cash reserves, shortening the runway and eroding working capital balance.',
    conditions: [{ field: 'net_income', operator: 'lt', value: 0 }],
    recs: ['Execute a 15% freeze on overhead and software spend.', 'Audit variable costs and supplier margins.'],
    prevs: ['Implement weekly budget control authorization rules.', 'Enforce strict margin targets on new quotes.']
  },
  {
    subCategory: 'Liquidity',
    title: 'High Vendor Concentration Risk',
    desc: 'Triggered when supplier spend concentration exceeds 30%.',
    impact: 'High supply chain vulnerability. If your top vendor fails or raises pricing, operations will halt or margins collapse.',
    conditions: [{ field: 'vendor_concentration', operator: 'gt', value: 30 }],
    recs: ['Identify and onboard alternative backup suppliers.', 'Request quotes from secondary local distributors.'],
    prevs: ['Implement multi-sourcing supply strategies.', 'Audit vendor financial stability annually.']
  }
];

const cyberBaseTemplates = [
  {
    subCategory: 'Identity',
    title: 'Disabled Multi-Factor Authentication (MFA)',
    desc: 'Triggered when MFA is inactive on critical employee administrative channels.',
    impact: 'Disabled MFA exposes the business to automated credentials stuffing, business email compromise, and network breaches.',
    conditions: [{ field: 'mfa', operator: 'eq', value: false }],
    recs: ['Enforce mandatory MFA globally across all email accounts today.', 'Block legacy non-MFA login protocols.'],
    prevs: ['Configure Single Sign-On (SSO) central security controls.', 'Run automated monthly identity auditing checks.']
  },
  {
    subCategory: 'Backup',
    title: 'Outdated or Missing Backup Systems',
    desc: 'Triggered when database backup status is outdated or not configured.',
    impact: 'High ransomware impact. System infiltration will cause permanent data loss with zero capability to restore systems.',
    conditions: [{ field: 'backup', operator: 'neq', value: 'active' }],
    recs: ['Execute full backup updates to isolated offline storage now.', 'Establish daily automated backup cron jobs.'],
    prevs: ['Test disaster recovery restore capabilities quarterly.', 'Implement immutable read-only cloud backups.']
  },
  {
    subCategory: 'Threats',
    title: 'Elevated System Vulnerabilities CVEs',
    desc: 'Triggered when open vulnerabilities count is high (> 5 CVEs).',
    impact: 'Malicious actors can exploit known software vulnerabilities to execute code or access servers without authorization.',
    conditions: [{ field: 'vulnerabilities', operator: 'gt', value: 5 }],
    recs: ['Deploy critical patch updates on all server nodes today.', 'Isolate unpatched legacy servers from the web.'],
    prevs: ['Enable automated weekly vulnerability patch management tools.', 'Establish continuous endpoint security checking.']
  },
  {
    subCategory: 'Compliance',
    title: 'Low Security Awareness Training Completion',
    desc: 'Triggered when employee security training is incomplete (< 70%).',
    impact: 'Creates human vulnerabilities. Staff are susceptible to phishing links and credential harvesting campaigns.',
    conditions: [{ field: 'training', operator: 'lt', value: 70 }],
    recs: ['Launch mandatory phishing awareness courses for all staff.', 'Set a 14-day completion deadline for default profiles.'],
    prevs: ['Automate security training requirements for new hires.', 'Run monthly simulated phishing test drills.']
  }
];

const operationalBaseTemplates = [
  {
    subCategory: 'Growth',
    title: 'Workforce Headcount Expansion Risks',
    desc: 'Triggered when headcount growth expands (> 50 employees) without mature compliance controls.',
    impact: 'Operational complexity increases. High risk of policy dilution and unmonitored shadow IT accounts.',
    conditions: [{ field: 'employees', operator: 'gt', value: 50 }],
    recs: ['Deploy centralized Active Directory access policies.', 'Distribute formal employee security handbook copies.'],
    prevs: ['Establish structured onboarding and offboarding exit checksheets.', 'Audit employee access logs monthly.']
  }
];

function generatePredefinedScenarios() {
  const result = [];

  // Add the 4 baseline Combined playbooks
  result.push(
    {
      id: 'sc-low-runway-mfa-off',
      title: 'Low Cash Reserves + Ransomware Exposure',
      category: 'Combined',
      description: 'Triggered when the client cash runway is thin (< 4 months) and Multi-Factor Authentication is disabled.',
      urgency: 'Critical',
      conditions: [
        { field: 'runway', operator: 'lt', value: 4 },
        { field: 'mfa', operator: 'eq', value: false }
      ],
      potentialImpact: 'A cyber incident will trigger catastrophic operational failure as the firm has insufficient cash buffers to absorb invoice delays or a high insurance deductible ($50k), coupled with zero recovery insulation due to disabled MFA.',
      recommendations: [
        'Enforce MFA globally across all email accounts immediately.',
        'Secure short-term invoice factoring lines to raise working capital reserves.'
      ],
      preventiveMeasures: [
        'Schedule monthly ransomware tabletop response drills.',
        'Enforce automated daily backup synchronization logs.'
      ]
    },
    {
      id: 'sc-cust-concentration-liquidity',
      title: 'Customer Concentration + Declining Liquidity',
      category: 'Combined',
      description: 'Triggered when customer concentration exceeds 35% and cash runway is less than 6 months.',
      urgency: 'High',
      conditions: [
        { field: 'customer_concentration', operator: 'gt', value: 35 },
        { field: 'runway', operator: 'lt', value: 6 }
      ],
      potentialImpact: 'Severe dependency on a single customer makes cash flows extremely fragile. If the primary client delays standard invoice settlements, immediate solvency failure is likely.',
      recommendations: [
        'Initiate customer acquisition campaigns to dilute top client share below 25%.',
        'Negotiate shorter credit terms (e.g., Net 15 instead of Net 45) with the top customer.'
      ],
      preventiveMeasures: [
        'Purchase accounts receivable credit insurance policies.',
        'Establish a minimum operating cash reserve of 6 months.'
      ]
    },
    {
      id: 'sc-vendor-dependency-expiry',
      title: 'Vendor Concentration + Poor Liquidity',
      category: 'Combined',
      description: 'Triggered when vendor concentration exceeds 30% and runway is less than 8 months.',
      urgency: 'High',
      conditions: [
        { field: 'vendor_concentration', operator: 'gt', value: 30 },
        { field: 'runway', operator: 'lt', value: 8 }
      ],
      potentialImpact: 'High reliance on a centralized supply chain creates a single point of operational failure. Vendor default or pricing squeezes will impact product deliverables.',
      recommendations: [
        'Onboard secondary suppliers to mitigate raw materials dependencies.',
        'Run quarterly security assessments on your critical vendors.'
      ],
      preventiveMeasures: [
        'Add strict SLA performance penalty clauses in supplier agreements.',
        "Maintain an updated catalog of alternative vendors."
      ]
    },
    {
      id: 'sc-weak-cyber-insurance-gap',
      title: 'Weak Cybersecurity + Cyber Insurance Gaps',
      category: 'Combined',
      description: 'Triggered when MFA is disabled and cyber insurance is not maintained.',
      urgency: 'Critical',
      conditions: [
        { field: 'mfa', operator: 'eq', value: false },
        { field: 'insurance', operator: 'eq', value: 'no' }
      ],
      potentialImpact: 'Operating without cyber liability coverage while maintaining disabled MFA exposes the business to unrecoverable ransomware extortion costs and data breach penalties.',
      recommendations: [
        'Activate baseline MFA policies on all administrative and employee portals.',
        'Request cyber liability quotes immediately to establish risk transfer.'
      ],
      preventiveMeasures: [
        'Schedule automated quarterly vulnerability patch reviews.',
        'Implement strict remote employee endpoint connection policies.'
      ]
    }
  );

  let playbookIdCounter = 1;

  for (let cycle = 0; cycle < 8; cycle++) {
    for (const sector of sectorsList) {
      for (const fTemp of financialBaseTemplates) {
        const uniqueId = `sc-gen-fin-${playbookIdCounter++}`;
        result.push({
          id: uniqueId,
          title: `${fTemp.title} in ${sector.name} Sector (v${cycle + 1})`,
          category: 'Financial',
          description: fTemp.desc.replace('{sector}', sector.name),
          urgency: cycle % 3 === 0 ? 'High' : cycle % 3 === 1 ? 'Medium' : 'Low',
          conditions: fTemp.conditions,
          potentialImpact: fTemp.impact,
          recommendations: fTemp.recs,
          preventiveMeasures: fTemp.prevs
        });
      }

      for (const cTemp of cyberBaseTemplates) {
        const uniqueId = `sc-gen-cyb-${playbookIdCounter++}`;
        result.push({
          id: uniqueId,
          title: `${cTemp.title} - ${sector.name} Security (v${cycle + 1})`,
          category: 'Cybersecurity',
          description: cTemp.desc,
          urgency: sector.risk === 'Critical' ? 'Critical' : 'High',
          conditions: cTemp.conditions,
          potentialImpact: cTemp.impact,
          recommendations: cTemp.recs,
          preventiveMeasures: cTemp.prevs
        });
      }

      for (const oTemp of operationalBaseTemplates) {
        const uniqueId = `sc-gen-ope-${playbookIdCounter++}`;
        result.push({
          id: uniqueId,
          title: `${oTemp.title} - ${sector.name} Operations (v${cycle + 1})`,
          category: 'Operational',
          description: oTemp.desc,
          urgency: 'Medium',
          conditions: oTemp.conditions,
          potentialImpact: oTemp.impact,
          recommendations: oTemp.recs,
          preventiveMeasures: oTemp.prevs
        });
      }
    }
  }

  return result;
}

const simulations = [
  { 
    id: 'low-runway-vendor', 
    title: 'Cash Runway Squeeze', 
    description: 'Deplete runway + centralize supply expenses.', 
    friendlyDesc: 'Stress-tests cash flows. Depletes cash reserves to under 0.5 months and centers payments on a single vendor to evaluate vendor default vulnerabilities.',
    color: 'text-amber-400 border-amber-900/40 bg-amber-950/10' 
  },
  { 
    id: 'phishing-mfa-off', 
    title: 'Phishing Storm & MFA Gaps', 
    description: 'Turn off MFA during a phishing storm.', 
    friendlyDesc: 'Stress-tests access security. Turns off MFA administrative requirements globally while initiating a wave of phishing credential traps.',
    color: 'text-red-400 border-red-900/40 bg-red-950/10' 
  },
  { 
    id: 'vendor-near-expiry-risky', 
    title: 'Supply Chain Compliance Gap', 
    description: 'Set a low-security supplier to expire soon.', 
    friendlyDesc: 'Stress-tests supplier reliance. Sets a key supplier to expire in under 30 days while lowering their security rating to a vulnerable level (42).',
    color: 'text-purple-400 border-purple-900/40 bg-purple-950/10' 
  },
  { 
    id: 'revenue-collapse-burn', 
    title: 'Sudden Revenue Drop Deficit', 
    description: 'Drop revenue by 40% with high burn rate.', 
    friendlyDesc: 'Stress-tests solvency. Reduces revenue inflow by 40% and increases cash outflows to simulate a lost business segment and evaluate capital runway.',
    color: 'text-orange-400 border-orange-900/40 bg-orange-950/10' 
  },
  { 
    id: 'dr-backup-failed', 
    title: 'Disaster Backup Outage', 
    description: 'Fail backups with open critical CVEs.', 
    friendlyDesc: 'Stress-tests business recovery. Disables database backup schedules and exposes the system to active unpatched cybersecurity exploits.',
    color: 'text-rose-400 border-rose-900/40 bg-rose-950/10' 
  },
  { 
    id: 'geo-political-sanctions', 
    title: 'Geopolitical Sanctions Delay', 
    description: 'Vendor relocated to highly sanctioned zone.', 
    friendlyDesc: 'Stress-tests procurement. Simulates placing your primary shipping supplier on active geopolitical trade watchlists, delaying shipments.',
    color: 'text-blue-400 border-blue-900/40 bg-blue-950/10' 
  },
  { 
    id: 'insider-threat-leak', 
    title: 'Insider Threat & Access Leak', 
    description: 'Employee leaks credentials with high open vulnerabilities.', 
    friendlyDesc: 'Stress-tests authorization risk. Simulates a security awareness failure where a high-privilege user leaks system credentials while training completion is extremely low (15%).',
    color: 'text-yellow-400 border-yellow-900/40 bg-yellow-950/10' 
  },
  { 
    id: 'inflation-material-squeeze', 
    title: 'Global Raw Material Inflation', 
    description: 'Increase operating costs by 50% and delay AR collections.', 
    friendlyDesc: 'Stress-tests margin pressure. Simulates global supply chain inflation by increasing monthly burn rate by 50% and doubling late payment receivables to 45%.',
    color: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/10' 
  },
  { 
    id: 'regulatory-non-compliance', 
    title: 'Regulatory Non-Compliance Audit', 
    description: 'Triggers a $150k compliance fine and freezes backups.', 
    friendlyDesc: 'Stress-tests regulatory resilience. Triggers an audit failure under compliance regulations resulting in a $150,000 regulatory fine (deducted from cash) and backup status disabled.',
    color: 'text-cyan-400 border-cyan-900/40 bg-cyan-950/10' 
  }
];

const allScenarios = generatePredefinedScenarios();

const finalData = {
  simulations: simulations,
  threatPlaybooks: allScenarios
};

fs.writeFileSync('/Users/sai/Downloads/riskpulse/public/situations.json', JSON.stringify(finalData, null, 2), 'utf8');
fs.writeFileSync('/Users/sai/Downloads/riskpulse/riskpulse-deploy/public/situations.json', JSON.stringify(finalData, null, 2), 'utf8');

console.log(`Generated full situations database with ${simulations.length} simulations and ${allScenarios.length} threat playbooks.`);
