import { FinancialMetrics, CybersecurityMetrics } from './formulas';

export interface Vendor {
  id: string;
  name: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  payment_history: 'excellent' | 'good' | 'delayed' | 'critical';
  security_score: number;
  contract_renewal: string;
  country: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  is_flagged: boolean;
  flag_reason?: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  file_type: string;
  created_at: string;
  content: string; // Document contents text (for mini RAG search)
}

export interface BusinessProfile {
  // Step 1: Company Info
  companyName: string;
  industry: string;
  businessDescription: string;
  yearFounded: string;
  hqLocation: string;
  numEmployees: number;
  annualRevenue?: number;
  estimatedExpenses: number;
  numLocations: number;
  publicOrPrivate: 'public' | 'private';
  website: string;
  primaryContact: string;

  // Step 2: Operations
  primaryProducts: string;
  numCustomers: number;
  largestCustomerPercentage: number;
  numVendors: number;
  criticalVendors: string;
  operatingHours: string;
  remotePercentage: number;
  cloudProviders: string;
  accountingSoftware: string;
  bankingInstitution: string;
  cyberInsurance: 'yes' | 'no';

  // Step 3: Financials
  cashBalance: number;
  monthlyExpenses: number;
  monthlyRevenue: number;
  existingDebt: number;
  accountsReceivable: number;
  accountsPayable: number;

  // Step 4: Cybersecurity
  mfaEnabled: 'yes' | 'no';
  passwordPolicyEnabled: 'yes' | 'no';
  endpointProtection: 'yes' | 'no';
  backupSolution: 'active' | 'outdated' | 'none';
  disasterRecoveryPlan: 'yes' | 'no';
  securityTrainingCompletion: number;
  patchManagementEnabled: 'yes' | 'no';
  numCriticalVulnerabilities: number;
  complianceCertifications: string;

  // Step 5: Goals
  biggestConcerns: string;
  primaryObjectives: string;
  expectedGrowth: string;
  plannedTechInvestments: string;
  plannedHiring: string;
  expansionPlans: string;
}

export interface AICompanyProfile {
  overview: string;
  industryInsights: string;
  financialMaturity: 'low' | 'medium' | 'high';
  cybersecurityMaturity: 'low' | 'medium' | 'high';
  operationalMaturity: 'low' | 'medium' | 'high';
  growthStage: string;
  primaryRisks: string[];
  strengths: string[];
  weaknesses: string[];
  overallOperationalResilienceIndex: number;
  assignedRiskProfile: 'Low' | 'Medium' | 'High' | 'Critical';
  topFiveRecommendedActions: string[];
}

export interface Scenario {
  id: string;
  title: string;
  category: 'Financial' | 'Cybersecurity' | 'Operational' | 'Combined';
  description: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  conditions: {
    field: 'runway' | 'mfa' | 'customer_concentration' | 'vendor_concentration' | 'employees' | 'insurance' | 'training' | 'net_income' | 'vulnerabilities' | 'backup';
    operator: 'lt' | 'gt' | 'eq' | 'neq';
    value: any;
  }[];
  potentialImpact: string;
  recommendations: string[];
  preventiveMeasures: string[];

  // High fidelity business-friendly fields
  whyItMatters?: string;
  whatsCausingThis?: string;
  immediateActions?: string[];
  shortTermActions?: string[];
  longTermStrategy?: string[];
  expectedOutcome?: string;
  estimatedImpact?: string;

  // Custom indicators and multi-dimensional impacts
  probability?: 'Low' | 'Medium' | 'High';
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  financialImpact?: string;
  cyberImpact?: string;
  operationalImpact?: string;
  complianceImpact?: string;
  indicators?: string[];
  relatedPlaybooks?: string[];
}

export interface MatchedScenario extends Scenario {
  similarityScore: number;
  matchReason: string;
}

export interface DailyLogDuty {
  id: string;
  label: string;
  category: 'cyber' | 'finance' | 'cloud' | 'compliance';
  completed: boolean;
  assignedRole: string;
}

export interface DailyLogEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  timestamp: string;
  resilienceScore: number; // 0 - 100
  status: 'optimal' | 'stable' | 'attention' | 'elevated' | 'critical';
  summary: string;
  metrics: {
    phishingBlocked: number;
    activeCves: number;
    endpointCoveragePercent: number;
    dailyCashOutflow: number;
    dailyCashInflow: number;
    cloudUptimePercent: number;
    incidentsReported: number;
  };
  duties: DailyLogDuty[];
  notes?: string;
  author: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  industry: string;
  financialMetrics: FinancialMetrics;
  cyberMetrics: CybersecurityMetrics;
  historicalCashFlow: { month: string; inflow: number; outflow: number; balance: number }[];
  vendors: Vendor[];
  transactions: Transaction[];
  documents: DocumentMeta[];
  chatHistory: { role: 'user' | 'assistant'; content: string; citations?: any[]; timestamp: string }[];
  businessProfile?: BusinessProfile;
  aiCompanyProfile?: AICompanyProfile;
  dailyLogs?: DailyLogEntry[];
}

export function generateHistoricalDailyLogs(client: any): DailyLogEntry[] {
  const logs: DailyLogEntry[] = [];
  const now = new Date();
  
  const fin = client?.financialMetrics || {};
  const cy = client?.cyberMetrics || {};
  const monthlyBurn = fin.monthly_burn_rate || 50000;
  const monthlyRev = fin.monthly_revenue || 60000;
  const dailyBurnBaseline = Math.round(monthlyBurn / 30);
  const dailyRevBaseline = Math.round(monthlyRev / 30);

  const dutiesTemplate: { label: string; category: 'cyber' | 'finance' | 'cloud' | 'compliance'; assignedRole: string }[] = [
    { label: 'Verify automated DB snapshot & offsite immutable backups', category: 'cyber', assignedRole: 'SecOps Lead' },
    { label: 'Review high-value AP disbursements & invoice anomaly flags', category: 'finance', assignedRole: 'Controller' },
    { label: 'Audit privileged MFA session logs & anomalous geo-IP logins', category: 'cyber', assignedRole: 'SecOps Analyst' },
    { label: 'Inspect multi-cloud latency & Tier-1 critical vendor status feeds', category: 'cloud', assignedRole: 'IT Ops Lead' },
    { label: 'Review open CVE vulnerability patches & endpoint health', category: 'compliance', assignedRole: 'Compliance Officer' }
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let status: 'optimal' | 'stable' | 'attention' | 'elevated' | 'critical' = 'optimal';
    let score = 92;
    let phishing = Math.floor(Math.random() * 8) + 3;
    let activeCves = cy.open_vulnerabilities_count !== undefined ? cy.open_vulnerabilities_count : 2;
    let uptime = 99.98;
    let incidents = 0;
    let summary = 'Operational posture is green. Routine morning security & cloud SLA checks passed.';
    let notes = 'All cloud delivery pipelines operating within latency tolerances. Zero unauthorized network requests.';
    
    if (i === 0) {
      score = cy.mfa_enabled !== false ? 94 : 76;
      status = score >= 90 ? 'optimal' : score >= 80 ? 'stable' : 'attention';
      summary = `All primary operational pipelines active for ${client?.name || 'organization'}. Multi-cloud uptime verified at 99.98%. 0 critical alerts.`;
      notes = 'Morning standup completed. Offsite backup snapshots verified. Normal cash disbursement schedule.';
    } else if (i === 2) {
      score = 86;
      status = 'stable';
      phishing = 19;
      summary = 'Elevated inbound phishing attempts detected and neutralized by email security gateway. Endpoint EDR coverage at 99.4%.';
      notes = 'SecOps confirmed threat definitions refreshed. No employee credentials exposed.';
    } else if (i === 5) {
      score = 81;
      status = 'attention';
      uptime = 99.82;
      incidents = 1;
      summary = 'Transient 14-minute elevated latency alert on secondary cloud API gateway. Automated traffic reroute engaged.';
      notes = 'Vendor incident ticket #INC-8942 resolved with cloud provider engineering.';
    } else if (i === 8) {
      score = 88;
      status = 'stable';
      summary = 'Bi-weekly vulnerability scan triage completed. 3 medium-priority library dependencies patched.';
    } else if (i === 11) {
      score = 93;
      status = 'optimal';
      summary = 'Full database restore disaster-recovery drill successfully verified within 24-minute RTO target.';
    } else {
      score = Math.min(96, 88 + (i % 6));
      status = 'optimal';
    }

    const burnVariance = 0.92 + (Math.random() * 0.16);
    const revVariance = 0.88 + (Math.random() * 0.24);

    const duties: DailyLogDuty[] = dutiesTemplate.map((t, idx) => ({
      id: `duty-${dateStr}-${idx}`,
      label: t.label,
      category: t.category,
      assignedRole: t.assignedRole,
      completed: i === 0 ? idx < 4 : (idx < 5 && Math.random() > 0.08)
    }));

    logs.push({
      id: `log-${client?.id || 'client'}-${dateStr}`,
      date: dateStr,
      timestamp: d.toISOString(),
      resilienceScore: score,
      status,
      summary,
      metrics: {
        phishingBlocked: phishing,
        activeCves,
        endpointCoveragePercent: cy.endpoint_protection !== false ? 99.4 : 78.0,
        dailyCashOutflow: Math.round(dailyBurnBaseline * burnVariance),
        dailyCashInflow: Math.round(dailyRevBaseline * revVariance),
        cloudUptimePercent: uptime,
        incidentsReported: incidents
      },
      duties,
      notes,
      author: 'Operations Desk'
    });
  }

  return logs;
}

// Helper list of templates to programmatically generate 400+ playbooks across sectors
const sectorsList = [
  { name: 'Healthcare', compliance: 'HIPAA', risk: 'Critical' as const, focus: 'electronic health records (EHR) databases' },
  { name: 'Retail & E-commerce', compliance: 'PCI-DSS', risk: 'High' as const, focus: 'POS transactional systems' },
  { name: 'Manufacturing & Industry', compliance: 'SOC 2', risk: 'High' as const, focus: 'SCADA and operational machinery supply chains' },
  { name: 'Technology & SaaS', compliance: 'SOC 2 / ISO27001', risk: 'Medium' as const, focus: 'AWS/Azure cloud api infrastructure' },
  { name: 'Construction & Real Estate', compliance: 'OSHA / ISO', risk: 'Medium' as const, focus: 'subcontractor and supplier logistics' },
  { name: 'Professional Services', compliance: 'GDPR / SOC 2', risk: 'Low' as const, focus: 'client consulting data vaults' }
];

const financialBaseTemplates = [
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 12 Months',
    desc: 'Triggered when working capital runway falls below 12 months for {sector} firms.',
    impact: 'Operating runway below 12 months limits long-term growth investments and increases dependency on immediate cash inflows.',
    conditions: [{ field: 'runway' as const, operator: 'lt' as const, value: 12 }],
    recs: ['Optimize non-essential administrative spending.', 'Review billing terms with professional clients.'],
    prevs: ['Build a 6-month capital buffer reserve account.', 'Implement monthly accounts receivable reviews.']
  },
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 6 Months',
    desc: 'Triggered when cash runway drops below 6 months under active burn rates.',
    impact: 'Resilience is impaired. A 6-month cash cushion leaves little buffer to absorb contract cancellations or billing collection delays.',
    conditions: [{ field: 'runway' as const, operator: 'lt' as const, value: 6 }],
    recs: ['Freeze discretionary CapEx spend immediately.', 'Follow up on all overdue invoices past 30 days.'],
    prevs: ['Establish pre-approved working capital lines of credit.', 'Transition to bi-weekly billing schedules.']
  },
  {
    subCategory: 'Cash Flow',
    title: 'Cash Runway Below 3 Months',
    desc: 'Triggered when cash reserves are critically thin (< 3 months runway).',
    impact: 'Extremely high threat of operational insolvency. Immediate capital injections or cash infusions are required to maintain payroll.',
    conditions: [{ field: 'runway' as const, operator: 'lt' as const, value: 3 }],
    recs: ['Negotiate accounts payable extensions with core partners.', 'Apply for emergency financing lines.'],
    prevs: ['Implement rigid daily cash-flow monitoring models.', 'Maintain a baseline survival budget blueprint.']
  },
  {
    subCategory: 'Revenue',
    title: 'High Customer Concentration Risk',
    desc: 'Triggered when customer concentration index is elevated (> 30%).',
    impact: 'Severe dependency on a single customer. Loss or payment delay of this client will result in immediate operational distress.',
    conditions: [{ field: 'customer_concentration' as const, operator: 'gt' as const, value: 30 }],
    recs: ['Diversify marketing budget to target new demographics.', 'Renegotiate contract terms to include termination penalties.'],
    prevs: ['Conduct quarterly client revenue contribution assessments.', 'Purchase accounts receivable trade credit insurance.']
  },
  {
    subCategory: 'Expenses',
    title: 'Net Operational Losses',
    desc: 'Triggered when net monthly income falls into a negative deficit.',
    impact: 'Active business operations are burning cash reserves, shortening the runway and eroding working capital balance.',
    conditions: [{ field: 'net_income' as const, operator: 'lt' as const, value: 0 }],
    recs: ['Execute a 15% freeze on overhead and software spend.', 'Audit variable costs and supplier margins.'],
    prevs: ['Implement weekly budget control authorization rules.', 'Enforce strict margin targets on new quotes.']
  },
  {
    subCategory: 'Liquidity',
    title: 'High Vendor Concentration Risk',
    desc: 'Triggered when supplier spend concentration exceeds 30%.',
    impact: 'High supply chain vulnerability. If your top vendor fails or raises pricing, operations will halt or margins collapse.',
    conditions: [{ field: 'vendor_concentration' as const, operator: 'gt' as const, value: 30 }],
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
    conditions: [{ field: 'mfa' as const, operator: 'eq' as const, value: false }],
    recs: ['Enforce mandatory MFA globally across all email accounts today.', 'Block legacy non-MFA login protocols.'],
    prevs: ['Configure Single Sign-On (SSO) central security controls.', 'Run automated monthly identity auditing checks.']
  },
  {
    subCategory: 'Backup',
    title: 'Outdated or Missing Backup Systems',
    desc: 'Triggered when database backup status is outdated or not configured.',
    impact: 'High ransomware impact. System infiltration will cause permanent data loss with zero capability to restore systems.',
    conditions: [{ field: 'backup' as const, operator: 'neq' as const, value: 'active' }],
    recs: ['Execute full backup updates to isolated offline storage now.', 'Establish daily automated backup cron jobs.'],
    prevs: ['Test disaster recovery restore capabilities quarterly.', 'Implement immutable read-only cloud backups.']
  },
  {
    subCategory: 'Threats',
    title: 'Elevated System Vulnerabilities CVEs',
    desc: 'Triggered when open vulnerabilities count is high (> 5 CVEs).',
    impact: 'Malicious actors can exploit known software vulnerabilities to execute code or access servers without authorization.',
    conditions: [{ field: 'vulnerabilities' as const, operator: 'gt' as const, value: 5 }],
    recs: ['Deploy critical patch updates on all server nodes today.', 'Isolate unpatched legacy servers from the web.'],
    prevs: ['Enable automated weekly vulnerability patch management tools.', 'Establish continuous endpoint security checking.']
  },
  {
    subCategory: 'Compliance',
    title: 'Low Security Awareness Training Completion',
    desc: 'Triggered when employee security training is incomplete (< 70%).',
    impact: 'Creates human vulnerabilities. Staff are susceptible to phishing links and credential harvesting campaigns.',
    conditions: [{ field: 'training' as const, operator: 'lt' as const, value: 70 }],
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
    conditions: [{ field: 'employees' as const, operator: 'gt' as const, value: 50 }],
    recs: ['Deploy centralized Active Directory access policies.', 'Distribute formal employee security handbook copies.'],
    prevs: ['Establish structured onboarding and offboarding exit checksheets.', 'Audit employee access logs monthly.']
  }
];

function generatePredefinedScenarios(): Scenario[] {
  const result: Scenario[] = [];

  // 0. High-Priority Company Signature Scenarios (Tailored to real-world corporate telemetry)
  result.push(
    {
      id: 'sc-medix-dpdp-act',
      title: 'Gaps in Patient Data Security (DPDP Act Statutory Fines)',
      category: 'Cybersecurity',
      description: 'Triggered by unencrypted patient health reports, shared collection-center workstations, and disabled MFA under India DPDP Act 2023 Section 33.',
      urgency: 'Critical',
      conditions: [
        { field: 'mfa', operator: 'eq', value: false },
        { field: 'insurance', operator: 'eq', value: 'no' },
        { field: 'vulnerabilities', operator: 'gt', value: 5 }
      ],
      potentialImpact: 'Statutory civil financial penalties up to ₹250 Crore (~$30 Million USD) levied by the Data Protection Board of India, with immediate suspension of NABL ISO 15189 diagnostic accreditation.',
      recommendations: [
        'Mandate tokenized biometric/SMS MFA across all 14 Hyderabad collection center workstations.',
        'Encrypt all patient PDF diagnostic downloads on S3 with expirable access tokens.',
        'Procure commercial healthcare cyber liability insurance coverage immediately.'
      ],
      preventiveMeasures: [
        'Perform monthly DPDP statutory data compliance audits.',
        'Enforce zero-trust workstation session timeouts at sample intake desks.'
      ],
      whyItMatters: 'Patient biometric data and Aadhaar numbers carry the highest statutory liability penalty tier under Indian cyber privacy laws.',
      whatsCausingThis: 'MFA is disabled across collection centers, 9 open CVEs exist on CloudLIS portal, and zero cyber insurance is in place.',
      immediateActions: ['Enforce tokenized MFA across collection center workstations today.'],
      shortTermActions: ['Deploy secure encrypted patient report portal.'],
      longTermStrategy: ['Conduct quarterly DPDP third-party legal compliance audits.'],
      expectedOutcome: 'Shields pathology practice against ₹250 Crore regulatory fines and secures health patient trust.',
      estimatedImpact: '+35 Cybersecurity, +25 Compliance'
    },
    {
      id: 'sc-medix-reagent-debt',
      title: 'Dependence on One Equipment Supplier (Siemens Analyzer Lock-in)',
      category: 'Operational',
      description: 'Triggered when exclusive medical device covenants lock 48% of OpEx into proprietary consumables with high monthly lease debt ($14,500/mo).',
      urgency: 'High',
      conditions: [
        { field: 'vendor_concentration', operator: 'gt', value: 40 },
        { field: 'runway', operator: 'lt', value: 3 }
      ],
      potentialImpact: 'Defaulting on two consecutive Siemens lease EMIs triggers immediate remote calibration shutdown of Atellica immunoassay machines, halting 70% of patient blood assays.',
      recommendations: [
        'Establish a dedicated escrow reserve for HDFC medical equipment lease EMIs.',
        'Negotiate reagent volume discount thresholds with Siemens Healthineers India.'
      ],
      preventiveMeasures: [
        'Maintain a 30-day buffer stock of critical immunoassay assay reagents.',
        'Audit vendor exclusivity clauses annually.'
      ],
      whyItMatters: 'Medical analyzer hardware cannot operate without proprietary manufacturer reagents, creating single-point operational failure.',
      whatsCausingThis: 'Vendor concentration is 48% with Siemens and equipment debt is $680,000.',
      immediateActions: ['Ring-fence monthly lease EMI funds in separate account.'],
      shortTermActions: ['Negotiate 60-day reagent credit extension with Siemens.'],
      longTermStrategy: ['Evaluate multi-vendor analyzer diversification in future lab expansions.'],
      expectedOutcome: 'Prevents clinical test shutdowns and protects recurring referral revenue.',
      estimatedImpact: '+20 Operations, +15 Financial'
    },
    {
      id: 'sc-medix-panel-receivables',
      title: 'Delayed Hospital Payments & Panel Receivables (34% Overdue)',
      category: 'Financial',
      description: 'Triggered when government health schemes (CGHS/EHS) and corporate hospital panels delay diagnostic test reimbursements past 60 days.',
      urgency: 'High',
      conditions: [
        { field: 'customer_concentration', operator: 'gt', value: 25 },
        { field: 'runway', operator: 'lt', value: 2 }
      ],
      potentialImpact: '$145,000 in outstanding panel receivables starves operating liquidity, driving working cash runway down to 1.2 months.',
      recommendations: [
        'Enforce 15-day payment covenants with hospital referral networks.',
        'Implement automated electronic claims scrubbing to reduce TPA claim rejection rates below 3%.'
      ],
      preventiveMeasures: [
        'Establish working capital credit line backed by medical receivables factoring.'
      ],
      whyItMatters: 'Diagnostic labs run on thin cash margins; delayed institutional panel payments cause payroll and vendor defaults.',
      whatsCausingThis: '34% of receivables are overdue while cash balance is only $48,000.',
      immediateActions: ['Dispatch dedicated billing recovery taskforce to top 5 hospital panels.'],
      shortTermActions: ['Set up receivables factoring facility with HDFC Bank.'],
      longTermStrategy: ['Shift corporate client mix toward pre-paid walk-in wellness packages.'],
      expectedOutcome: 'Recovers $60,000 in delayed cash and extends operating runway beyond 3 months.',
      estimatedImpact: '+25 Financial Score'
    },
    {
      id: 'sc-acme-scada-lockout',
      title: 'SCADA Machinery & CNC Control Network Ransomware Lockout',
      category: 'Cybersecurity',
      description: 'Triggered when industrial heavy manufacturing plants operate computerized machining lines without Multi-Factor Authentication.',
      urgency: 'Critical',
      conditions: [
        { field: 'mfa', operator: 'eq', value: false },
        { field: 'runway', operator: 'lt', value: 3 }
      ],
      potentialImpact: 'Ransomware deployment encrypts computerized toolpath controls and PLC controllers, halting factory machining at $35,000/day in idling losses.',
      recommendations: [
        'Air-gap operational technology (OT) SCADA networks from corporate office internet.',
        'Enforce hardware FIDO2 MFA tokens for all industrial engineering terminals.'
      ],
      preventiveMeasures: [
        'Conduct monthly machine firmware integrity hashes and isolated backups.'
      ],
      whyItMatters: 'Physical manufacturing machines cannot easily be recovered from cloud backups without factory firmware rebuilds.',
      whatsCausingThis: 'MFA is disabled on factory servers and cash buffer is insufficient to cover prolonged downtime.',
      immediateActions: ['Air-gap factory floor network from guest Wi-Fi.'],
      shortTermActions: ['Deploy endpoint detection agents on engineering workstations.'],
      longTermStrategy: ['Complete NIST SP 800-82 manufacturing security standard audit.'],
      expectedOutcome: 'Protects manufacturing output and prevents catastrophic production losses.',
      estimatedImpact: '+30 Cybersecurity, +20 Operational'
    },
    {
      id: 'sc-apex-retail-monopoly',
      title: 'Critical Overseas Supplier Monopoly & Cargo Port Embargo',
      category: 'Operational',
      description: 'Triggered when consumer retail chains concentrate over 50% of cost-of-goods into a single overseas supplier.',
      urgency: 'Critical',
      conditions: [
        { field: 'vendor_concentration', operator: 'gt', value: 50 }
      ],
      potentialImpact: 'Single-source vendor collapse or shipping container embargo starves retail store shelves of 58% of product SKUs within 3 weeks.',
      recommendations: [
        'Onboard domestic alternate suppliers for top 20 revenue-generating retail categories.',
        'Renegotiate exclusive supplier agreement to guarantee 60-day buffer inventory in domestic warehouses.'
      ],
      preventiveMeasures: [
        'Cap single-vendor inventory allocation at 35% of total merchandise.'
      ],
      whyItMatters: 'Retail stores generate zero revenue when front shelves run empty of core merchandise.',
      whatsCausingThis: 'Apex Prime Wholesalers supplies 58% of inventory and agreement expires in July 2026.',
      immediateActions: ['Begin sourcing quotes from secondary domestic wholesalers.'],
      shortTermActions: ['Renew master distributor contract with safety stock covenants.'],
      longTermStrategy: ['Diversify vendor base to at least 4 regional suppliers.'],
      expectedOutcome: 'Guarantees shelf stock continuity and eliminates supplier single-point-of-failure.',
      estimatedImpact: '+30 Operational'
    },
    {
      id: 'sc-apex-retail-pos',
      title: 'Point-of-Sale (POS) Zero-Backup Catastrophic Data Loss',
      category: 'Combined',
      description: 'Triggered when retail multi-store registers operate with zero cloud or offsite backup infrastructure.',
      urgency: 'Critical',
      conditions: [
        { field: 'backup', operator: 'eq', value: 'none' }
      ],
      potentialImpact: 'Local terminal drive failure or cryptoware wipes transaction ledgers, inventory barcodes, and customer receipts across all store locations.',
      recommendations: [
        'Deploy automated hourly cloud-synced POS transaction ledgers.',
        'Implement redundant LTE failover routers on all cash registers.'
      ],
      preventiveMeasures: [
        'Test point-of-sale recovery procedures monthly.'
      ],
      whyItMatters: 'Retail operations cannot legally process returns, credit cards, or inventory counts without register ledgers.',
      whatsCausingThis: 'Backup status is configured as none across retail locations.',
      immediateActions: ['Install cloud backup sync on store POS servers today.'],
      shortTermActions: ['Enable automated daily offsite snapshots.'],
      longTermStrategy: ['Transition store registers to modern cloud POS architecture.'],
      expectedOutcome: 'Eliminates catastrophic data loss risk and ensures uninterrupted store checkout.',
      estimatedImpact: '+25 Cybersecurity, +15 Operational'
    },
    {
      id: 'sc-stark-grid-compliance',
      title: 'Grid Infrastructure Interconnection & Multi-Cloud SLA Standards',
      category: 'Operational',
      description: 'Evaluated for resilient clean-tech battery and utility grid operators maintaining high cash buffers and SOC2 compliance.',
      urgency: 'Low',
      conditions: [
        { field: 'runway', operator: 'gt', value: 6 },
        { field: 'mfa', operator: 'eq', value: true }
      ],
      potentialImpact: 'Minimal risk exposure; operations maintain resilient cash cushions and proactive cybersecurity protocols.',
      recommendations: [
        'Maintain current quarterly IAM rotation cadence.',
        'Review multi-region AWS/Azure latency tolerances annually.'
      ],
      preventiveMeasures: [
        'Continue SOC2 Type II annual third-party audits.'
      ],
      whyItMatters: 'Ensures utility-grade uptime and keeps insurance premiums at tier-1 preferred rates.',
      whatsCausingThis: 'Cash runway exceeds 8 months and MFA is fully active.',
      immediateActions: ['Maintain active monitoring.'],
      shortTermActions: ['Schedule next annual SOC2 renewal.'],
      longTermStrategy: ['Expand grid management capacity into adjacent territories.'],
      expectedOutcome: 'Maintains optimal operational score and market trust.',
      estimatedImpact: '+10 Operational'
    }
  );

  // 1. Baseline Combined playbooks
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
      ],
      whyItMatters: 'A cyber incident will trigger catastrophic operational failure as the firm has insufficient cash buffers to absorb invoice delays or a high insurance deductible.',
      whatsCausingThis: 'Runway is below 4 months and MFA is disabled.',
      immediateActions: ['Enforce MFA globally across all email accounts immediately.'],
      shortTermActions: ['Secure short-term invoice factoring lines to raise working capital reserves.'],
      longTermStrategy: ['Schedule monthly ransomware tabletop response drills.', 'Enforce automated daily backup synchronization logs.'],
      expectedOutcome: 'Secures primary access portals and extends cash reserves to prevent insolvency.',
      estimatedImpact: '+20 Cybersecurity, +15 Financial'
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
      ],
      whyItMatters: 'Loss or delay in invoices from your largest customer will cause immediate cash depletion.',
      whatsCausingThis: 'Customer concentration exceeds 35% and cash runway is less than 6 months.',
      immediateActions: ['Initiate customer acquisition campaigns to dilute top client share.'],
      shortTermActions: ['Negotiate shorter credit terms with the top customer.'],
      longTermStrategy: ['Purchase accounts receivable credit insurance.', 'Establish a minimum operating cash reserve of 6 months.'],
      expectedOutcome: 'Reduces revenue dependency on a single account and improves immediate liquidity buffers.',
      estimatedImpact: '+25 Financial'
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
        'Maintain an updated catalog of alternative vendors.'
      ],
      whyItMatters: 'Any operational failure or price hike from your main vendor immediately stops business operations.',
      whatsCausingThis: 'Vendor concentration exceeds 30% and runway is less than 8 months.',
      immediateActions: ['Onboard secondary suppliers to mitigate dependencies.'],
      shortTermActions: ['Run quarterly security assessments on critical vendors.'],
      longTermStrategy: ['Add strict SLA performance penalties.', 'Maintain an updated catalog of alternative vendors.'],
      expectedOutcome: 'Mitigates single-point supply chain dependencies.',
      estimatedImpact: '+15 Health Score'
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
      ],
      whyItMatters: 'A single data breach or email compromise could trigger total legal and financial ruin.',
      whatsCausingThis: 'MFA is disabled and no cyber insurance policy is maintained.',
      immediateActions: ['Activate baseline MFA policies on all portals.'],
      shortTermActions: ['Request cyber liability insurance quotes immediately.'],
      longTermStrategy: ['Schedule quarterly patch reviews.', 'Implement strict remote employee connection policies.'],
      expectedOutcome: 'Shields company from legal liabilities and establishes a robust safety net.',
      estimatedImpact: '+30 Cybersecurity'
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
          preventiveMeasures: fTemp.prevs,

          whyItMatters: `${fTemp.impact} For ${sector.name} companies, this directly threatens operational continuity and customer retention.`,
          whatsCausingThis: `Triggered because the condition is met during compliance screening.`,
          immediateActions: [fTemp.recs[0]],
          shortTermActions: [fTemp.recs[1] || 'Monitor daily metrics dashboards.'],
          longTermStrategy: fTemp.prevs,
          expectedOutcome: `Implementing this strategy preserves cash positions and stabilizes scorecards for ${sector.name} assets.`,
          estimatedImpact: `+15 Financial Score`,
          probability: cycle % 2 === 0 ? 'Medium' : 'High',
          severity: cycle % 3 === 0 ? 'High' : 'Medium',
          financialImpact: 'Threatens monthly net burn rates.',
          operationalImpact: 'Limits new hiring and site expansion capabilities.',
          cyberImpact: 'None directly.',
          complianceImpact: 'No direct effect.',
          indicators: ['Runway threshold logs', 'Cash burn reports'],
          relatedPlaybooks: ['sc-cust-concentration-liquidity', 'sc-declining-cash-flow']
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
          preventiveMeasures: cTemp.prevs,

          whyItMatters: `${cTemp.impact} In ${sector.name}, compliance standards such as ${sector.compliance} strictly penalize this loophole.`,
          whatsCausingThis: `A scan of critical directories and endpoints identified inactive controls matching the profile.`,
          immediateActions: [cTemp.recs[0]],
          shortTermActions: [cTemp.recs[1] || 'Audit user accounts and credentials.'],
          longTermStrategy: cTemp.prevs,
          expectedOutcome: `Plugs active exploit channels, preventing potential malware payloads or regulatory audits.`,
          estimatedImpact: `+20 Cybersecurity Score`,
          probability: 'High',
          severity: sector.risk,
          financialImpact: 'Substantial fines and ransomware remediation deductibles.',
          operationalImpact: 'Data breach interrupts systems availability.',
          cyberImpact: 'Exposes network assets to administrative privilege escalation.',
          complianceImpact: `Triggers audit non-compliance under ${sector.compliance} mandates.`,
          indicators: ['MFA status indicators', 'Active CVE logs'],
          relatedPlaybooks: ['sc-weak-cyber-insurance-gap', 'sc-low-runway-mfa-off']
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
          preventiveMeasures: oTemp.prevs,

          whyItMatters: `${oTemp.impact} As headcount rises, managing access logs in ${sector.name} becomes critical to safeguard ${sector.focus}.`,
          whatsCausingThis: `Employee count exceeded the compliance trigger levels.`,
          immediateActions: [oTemp.recs[0]],
          shortTermActions: [oTemp.recs[1] || 'Establish central IAM directories.'],
          longTermStrategy: oTemp.prevs,
          expectedOutcome: `Maintains a clean operations matrix and structured access logs.`,
          estimatedImpact: `+15 Health Score`,
          probability: 'Medium',
          severity: 'Medium',
          financialImpact: 'Increases payroll and overhead costs.',
          operationalImpact: 'Higher coordination complexity.',
          cyberImpact: 'Enlarges system threat vectors.',
          complianceImpact: `Demands stricter alignment under ${sector.compliance}.`,
          indicators: ['Total employee counts'],
          relatedPlaybooks: ['sc-growth-training-gap']
        });
      }
    }
  }

  return result;
}

export const DEFAULT_SCENARIOS: Scenario[] = generatePredefinedScenarios();

export const SEED_CLIENTS: ClientProfile[] = [
  {
    id: 'client-acme',
    name: 'Acme Industrial Corp',
    industry: 'Manufacturing',
    financialMetrics: {
      current_assets: 450000,
      current_liabilities: 380000,
      inventory: 180000,
      total_debt: 750000,
      total_equity: 500000,
      cash_balance: 95000,
      monthly_burn_rate: 45000,
      monthly_revenue: 165000,
      net_income: 15000,
      outstanding_receivables: 110000,
      upcoming_obligations: 75000,
      late_payment_percentage: 18.5,
      customer_concentration: 42, // high customer concentration
      vendor_concentration: 35
    },
    cyberMetrics: {
      mfa_enabled: false, // big security risk
      password_policy_enabled: true,
      backup_status: 'outdated',
      endpoint_protection: false, // critical
      phishing_incidents_count: 4,
      open_vulnerabilities_count: 12,
      patch_status: 'outdated',
      security_awareness_completion: 45
    },
    historicalCashFlow: [
      { month: 'Jan', inflow: 140000, outflow: 130000, balance: 80000 },
      { month: 'Feb', inflow: 150000, outflow: 145000, balance: 85000 },
      { month: 'Mar', inflow: 135000, outflow: 140000, balance: 80000 },
      { month: 'Apr', inflow: 160000, outflow: 150000, balance: 90000 },
      { month: 'May', inflow: 155000, outflow: 150000, balance: 95000 },
      { month: 'Jun', inflow: 165000, outflow: 165000, balance: 95000 }
    ],
    vendors: [
      { id: 'v1', name: 'Global Steel Supply', criticality: 'critical', payment_history: 'good', security_score: 55, contract_renewal: '2026-11-15', country: 'Germany' },
      { id: 'v2', name: 'Atlas Parts Ltd', criticality: 'high', payment_history: 'delayed', security_score: 72, contract_renewal: '2026-08-30', country: 'China' },
      { id: 'v3', name: 'Apex Tooling Group', criticality: 'medium', payment_history: 'excellent', security_score: 85, contract_renewal: '2027-02-10', country: 'USA' },
      { id: 'v4', name: 'CyberSafe Insurance', criticality: 'low', payment_history: 'excellent', security_score: 95, contract_renewal: '2026-09-01', country: 'UK' }
    ],
    transactions: [
      { id: 't1', date: '2026-06-15T09:30:00Z', description: 'Global Steel - Material Batch A', amount: -28500, category: 'Cost of Goods Sold', is_flagged: false },
      { id: 't2', date: '2026-06-18T14:15:00Z', description: 'Client Invoice Payment #8933', amount: 48000, category: 'Revenue', is_flagged: false },
      { id: 't3', date: '2026-06-20T23:45:00Z', description: 'Unknown Wire Transfer (Off-hours)', amount: -15000, category: 'Uncategorized', is_flagged: true, flag_reason: 'Off-hours Transaction (Outside business hours at 11:45 PM)' },
      { id: 't4', date: '2026-06-22T10:00:00Z', description: 'Office Depot - Office Supplies', amount: -250, category: 'Operations', is_flagged: false },
      { id: 't5', date: '2026-06-24T11:00:00Z', description: 'Double Invoice - Vendor Atlas Parts', amount: -9500, category: 'Cost of Goods Sold', is_flagged: true, flag_reason: 'Duplicate Invoice: Matching vendor, amount, and category within 48 hours.' },
      { id: 't6', date: '2026-06-24T12:30:00Z', description: 'Atlas Parts - Standard Invoice', amount: -9500, category: 'Cost of Goods Sold', is_flagged: false }
    ],
    documents: [
      {
        id: 'd1',
        name: 'acme_cyber_insurance_policy.pdf',
        file_type: 'PDF',
        created_at: '2026-01-10T10:00:00Z',
        content: `Acme Industrial Corp Cybersecurity Insurance Agreement. Policy number: POL-88942-AC. 
Coverage Limit: $2,000,000 for data breaches, ransomware incidents, and business interruption. 
Deductible: $50,000 per incident. 
Renewal date: September 1, 2026. 
Requirements: Insured must enable MFA (Multi-Factor Authentication) on all admin portals and maintain weekly backups.`
      },
      {
        id: 'd2',
        name: 'global_steel_supply_contract.pdf',
        file_type: 'PDF',
        created_at: '2025-11-15T09:00:00Z',
        content: `Supply Chain Agreement between Acme Industrial Corp and Global Steel Supply. 
Effective Date: November 15, 2025. Duration: 1 year. 
Renewal Term: Agreement automatically renews for successive 1-year terms unless either party gives 60 days' notice before the end of the term (which would be by September 16, 2026).
Price adjustments up to 5% allowed based on iron ore market index.`
      }
    ],
    chatHistory: [
      { role: 'user', content: 'What is our current cyber insurance coverage?', timestamp: '2026-06-29T10:00:00Z' },
      { role: 'assistant', content: 'According to your uploaded document, [acme_cyber_insurance_policy.pdf](file:///d1), your coverage limit is $2,000,000 for data breaches, ransomware, and business interruption, subject to a $50,000 deductible. Note that the policy requires Multi-Factor Authentication (MFA) to remain active—which is currently disabled on your cybersecurity dashboard.', citations: ['acme_cyber_insurance_policy.pdf'], timestamp: '2026-06-29T10:00:30Z' }
    ]
  },
  {
    id: 'client-stark',
    name: 'Stark Energy Solutions',
    industry: 'Clean Tech',
    financialMetrics: {
      current_assets: 1850000,
      current_liabilities: 650000,
      inventory: 350000,
      total_debt: 200000,
      total_equity: 3500000,
      cash_balance: 1200000,
      monthly_burn_rate: 110000,
      monthly_revenue: 450000,
      net_income: 140000,
      outstanding_receivables: 300000,
      upcoming_obligations: 120000,
      late_payment_percentage: 4.2,
      customer_concentration: 12,
      vendor_concentration: 18
    },
    cyberMetrics: {
      mfa_enabled: true,
      password_policy_enabled: true,
      backup_status: 'active',
      endpoint_protection: true,
      phishing_incidents_count: 0,
      open_vulnerabilities_count: 1,
      patch_status: 'current',
      security_awareness_completion: 98
    },
    historicalCashFlow: [
      { month: 'Jan', inflow: 380000, outflow: 350000, balance: 1000000 },
      { month: 'Feb', inflow: 410000, outflow: 380000, balance: 1030000 },
      { month: 'Mar', inflow: 430000, outflow: 390000, balance: 1070000 },
      { month: 'Apr', inflow: 450000, outflow: 410000, balance: 1110000 },
      { month: 'May', inflow: 480000, outflow: 430000, balance: 1160000 },
      { month: 'Jun', inflow: 490000, outflow: 450000, balance: 1200000 }
    ],
    vendors: [
      { id: 'v5', name: 'Lithium Corp International', criticality: 'critical', payment_history: 'excellent', security_score: 91, contract_renewal: '2027-05-18', country: 'Australia' },
      { id: 'v6', name: 'Grid Solutions US', criticality: 'high', payment_history: 'excellent', security_score: 88, contract_renewal: '2026-12-01', country: 'USA' }
    ],
    transactions: [
      { id: 't7', date: '2026-06-10T11:00:00Z', description: 'Lithium Corp Batch L-9', amount: -95000, category: 'Cost of Goods Sold', is_flagged: false },
      { id: 't8', date: '2026-06-15T15:00:00Z', description: 'Enterprise Inflow - Stark Tech License', amount: 220000, category: 'Revenue', is_flagged: false }
    ],
    documents: [
      {
        id: 'd3',
        name: 'stark_soc2_report_summary.pdf',
        file_type: 'PDF',
        created_at: '2026-03-12T14:00:00Z',
        content: `Stark Energy Solutions SOC2 Type II Audit Report Summary. 
Scope: Infrastructure and application layers. 
Result: Zero critical deviations noted. 
Recommendations: Implement standard quarterly IAM key rotation.`
      }
    ],
    chatHistory: []
  },
  {
    id: 'client-apex',
    name: 'Apex Retail Stores',
    industry: 'Consumer Retail',
    financialMetrics: {
      current_assets: 220000,
      current_liabilities: 280000,
      inventory: 150000,
      total_debt: 420000,
      total_equity: 50000,
      cash_balance: 18000,
      monthly_burn_rate: 32000,
      monthly_revenue: 125000,
      net_income: -4000,
      outstanding_receivables: 32000,
      upcoming_obligations: 45000,
      late_payment_percentage: 24.5,
      customer_concentration: 5,
      vendor_concentration: 58 // Critical supplier concentration
    },
    cyberMetrics: {
      mfa_enabled: true,
      password_policy_enabled: false,
      backup_status: 'none', // Critical
      endpoint_protection: true,
      phishing_incidents_count: 2,
      open_vulnerabilities_count: 8,
      patch_status: 'outdated',
      security_awareness_completion: 30
    },
    historicalCashFlow: [
      { month: 'Jan', inflow: 110000, outflow: 120000, balance: 50000 },
      { month: 'Feb', inflow: 115000, outflow: 122000, balance: 43000 },
      { month: 'Mar', inflow: 120000, outflow: 125000, balance: 38000 },
      { month: 'Apr', inflow: 118000, outflow: 124000, balance: 32000 },
      { month: 'May', inflow: 122000, outflow: 128000, balance: 26000 },
      { month: 'Jun', inflow: 125000, outflow: 133000, balance: 18000 }
    ],
    vendors: [
      { id: 'v7', name: 'Apex Prime Wholesalers', criticality: 'critical', payment_history: 'delayed', security_score: 42, contract_renewal: '2026-07-20', country: 'Vietnam' },
      { id: 'v8', name: 'Mega Shipping Logistics', criticality: 'high', payment_history: 'good', security_score: 65, contract_renewal: '2026-10-10', country: 'India' }
    ],
    transactions: [
      { id: 't9', date: '2026-06-05T09:00:00Z', description: 'Prime Wholesalers - Cargo Invoice', amount: -42000, category: 'Cost of Goods Sold', is_flagged: false },
      { id: 't10', date: '2026-06-12T03:00:00Z', description: 'Large Cash Withdrawal', amount: -12000, category: 'Operations', is_flagged: true, flag_reason: 'Rapid spending spike: Single cash withdrawal representing >60% of current cash balance.' }
    ],
    documents: [
      {
        id: 'd4',
        name: 'apex_wholesaler_contract_july2026.pdf',
        file_type: 'PDF',
        created_at: '2024-07-20T10:00:00Z',
        content: `Apex Prime Wholesalers exclusive supply agreement. 
Effective date: July 20, 2024. Expiration date: July 20, 2026. 
Termination: requires 30 days written notice. 
If not renewed, credit line of $100,000 will be suspended, and cash payments will be required on delivery.`
      }
    ],
    chatHistory: []
  },
  {
    id: 'client-apex-medix',
    name: 'Medix Diagnostics Pvt Ltd',
    industry: 'Healthcare Diagnostics',
    financialMetrics: {
      current_assets: 410000,
      current_liabilities: 390000,
      inventory: 65000,
      total_debt: 680000,
      total_equity: 280000,
      cash_balance: 48000,
      monthly_burn_rate: 40000,
      monthly_revenue: 195000,
      net_income: 12000,
      outstanding_receivables: 145000,
      upcoming_obligations: 62000,
      late_payment_percentage: 34.0,
      customer_concentration: 28,
      vendor_concentration: 48
    },
    cyberMetrics: {
      mfa_enabled: false,
      password_policy_enabled: true,
      backup_status: 'outdated',
      endpoint_protection: false,
      phishing_incidents_count: 5,
      open_vulnerabilities_count: 9,
      patch_status: 'outdated',
      security_awareness_completion: 35
    },
    historicalCashFlow: [
      { month: 'Jan', inflow: 175000, outflow: 170000, balance: 42000 },
      { month: 'Feb', inflow: 180000, outflow: 175000, balance: 47000 },
      { month: 'Mar', inflow: 190000, outflow: 182000, balance: 55000 },
      { month: 'Apr', inflow: 185000, outflow: 188000, balance: 52000 },
      { month: 'May', inflow: 192000, outflow: 195000, balance: 49000 },
      { month: 'Jun', inflow: 195000, outflow: 196000, balance: 48000 }
    ],
    vendors: [
      { id: 'v-am-1', name: 'Siemens Healthineers India', criticality: 'critical', payment_history: 'good', security_score: 86, contract_renewal: '2026-11-20', country: 'India' },
      { id: 'v-am-2', name: 'CloudLIS Pathology Systems', criticality: 'critical', payment_history: 'delayed', security_score: 54, contract_renewal: '2026-09-15', country: 'India' },
      { id: 'v-am-3', name: 'Apollo Cold-Chain Logistics', criticality: 'high', payment_history: 'good', security_score: 78, contract_renewal: '2027-01-10', country: 'India' },
      { id: 'v-am-4', name: 'ThyroSupplies Biologicals', criticality: 'medium', payment_history: 'delayed', security_score: 65, contract_renewal: '2026-12-05', country: 'India' }
    ],
    transactions: [
      { id: 't-am-1', date: '2026-06-12T10:30:00Z', description: 'Siemens Healthineers - Atellica Reagent Pack', amount: -38500, category: 'Cost of Goods Sold', is_flagged: false },
      { id: 't-am-2', date: '2026-06-18T14:00:00Z', description: 'Apollo Referral Panel Monthly Payout', amount: 54000, category: 'Revenue', is_flagged: false },
      { id: 't-am-3', date: '2026-06-22T02:15:00Z', description: 'Unscheduled CloudLIS Database Export Transfer', amount: -6800, category: 'Operations', is_flagged: true, flag_reason: 'Off-hours API Data Egress: Unverified batch patient report download initiated at 2:15 AM.' },
      { id: 't-am-4', date: '2026-06-25T11:20:00Z', description: 'HDFC Bank - Medical Equipment Lease EMI', amount: -14500, category: 'Debt Service', is_flagged: false },
      { id: 't-am-5', date: '2026-06-27T16:45:00Z', description: 'ThyroSupplies - Overdue Penalties Added', amount: -12800, category: 'Operations', is_flagged: true, flag_reason: 'Late Payment Penalty Surcharge: Vendor levied 18% annualized overdue surcharge on delayed settlement.' }
    ],
    documents: [
      {
        id: 'd-am-1',
        name: 'dpdp_act_patient_privacy_audit_2026.pdf',
        file_type: 'PDF',
        created_at: '2026-03-10T10:00:00Z',
        content: `Medix Diagnostics Pvt Ltd - Legal Advisory & Audit on India Digital Personal Data Protection (DPDP) Act 2023.
Audit Firm: CyberLegal Advocates, Hyderabad.
Key Findings:
1. Patient diagnostic reports containing Aadhaar numbers and health biometrics are stored in unencrypted S3 buckets connected to public web download URLs without Multi-Factor Authentication (MFA).
2. Shared workstation access across 14 collection centers without individual user audit trails violates statutory health data norms under the DPDP Act.
3. Statutory Penalty Exposure: Non-compliance or failure to take reasonable security safeguards under DPDP Section 33 carries civil financial penalties up to ₹250 Crore (~$30 Million USD).
Recommendation: Immediate deployment of role-based MFA, tokenized patient report encryption, and certified cybersecurity insurance coverage.`
      },
      {
        id: 'd-am-2',
        name: 'siemens_healthineers_analyzer_lease.pdf',
        file_type: 'PDF',
        created_at: '2025-11-20T09:00:00Z',
        content: `Master Equipment Lease and Consumables Agreement between Medix Diagnostics Pvt Ltd and Siemens Healthineers India.
Asset: Siemens Atellica Solution Modular Immunoassay and Clinical Chemistry Analyzers (Units 1 & 2).
Financed Value: ₹5.5 Crore ($660,000 USD).
Monthly EMI Covenant: ₹12,00,000 ($14,500 USD).
Exclusivity Clause: Insured must procure 100% of diagnostic reagents exclusively from Siemens. Default on 2 consecutive EMIs triggers immediate repossession and suspension of analyzer calibration software.`
      }
    ],
    chatHistory: [
      { role: 'user', content: 'What is our exposure under the DPDP Act if patient blood test reports leak?', timestamp: '2026-06-28T11:00:00Z' },
      { role: 'assistant', content: 'According to your uploaded audit document, [dpdp_act_patient_privacy_audit_2026.pdf](file:///d-am-1), a personal health data breach can trigger statutory penalties up to ₹250 Crore under the DPDP Act. Because MFA is disabled across your collection centers and web portals, your liability is critical and you currently have zero cyber risk transfer insurance in place.', citations: ['dpdp_act_patient_privacy_audit_2026.pdf'], timestamp: '2026-06-28T11:00:45Z' }
    ]
  }
];
