import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ClientProfile, SEED_CLIENTS, Transaction, Vendor, DocumentMeta, BusinessProfile, AICompanyProfile, DEFAULT_SCENARIOS, Scenario, MatchedScenario, DailyLogEntry, DailyLogDuty, generateHistoricalDailyLogs } from './seedData';
import { computeMetrics, FinancialMetrics, CybersecurityMetrics } from './formulas';
import { OpenAI } from 'openai';
import { getAIConfig, getOpenAIClient, safeParseJSON } from './ai';

// Initialize Supabase Client if env variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const openAiKey = process.env.OPENAI_API_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl !== '' &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey !== '' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here';
export const isOpenAIConfigured = openAiKey !== '';

export const supabase = isSupabaseConfigured
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side fallback file storage path
const DB_FILE_PATH = './db.json';

export function generateHistoricalCashFlow(cash: number, revenue: number, burn: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const history = [];
  let currentBalance = cash;
  
  for (let i = months.length - 1; i >= 0; i--) {
    // Generate slight monthly variance (e.g. ±5%)
    const variationIn = 0.95 + Math.random() * 0.1;
    const variationOut = 0.96 + Math.random() * 0.08;
    
    const inflow = Math.round(revenue * variationIn);
    const outflow = Math.round(burn * variationOut);
    
    history.unshift({
      month: months[i],
      inflow,
      outflow,
      balance: Math.max(0, Math.round(currentBalance))
    });
    
    currentBalance = currentBalance - inflow + outflow;
  }
  return history;
}

export function generateLocalAICompanyProfile(client: any): AICompanyProfile {
  const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);
  const bp = client.businessProfile;

  // Let's compute cyber maturity
  let cyberPoints = 0;
  if (client.cyberMetrics.mfa_enabled) cyberPoints += 25;
  if (client.cyberMetrics.password_policy_enabled) cyberPoints += 15;
  if (client.cyberMetrics.endpoint_protection) cyberPoints += 15;
  if (client.cyberMetrics.backup_status === 'active') cyberPoints += 25;
  else if (client.cyberMetrics.backup_status === 'outdated') cyberPoints += 10;
  if (client.cyberMetrics.security_awareness_completion > 50) cyberPoints += 20;

  const cyberMaturity = cyberPoints > 75 ? 'high' : cyberPoints > 40 ? 'medium' : 'low';

  const runway = computed.cashRunway;
  let finMaturity: 'low' | 'medium' | 'high' = 'medium';
  if (runway > 6 && computed.debtRatio < 0.45) finMaturity = 'high';
  else if (runway < 3) finMaturity = 'low';

  const customerConcentration = client.financialMetrics.customer_concentration;
  const vendorConcentration = client.financialMetrics.vendor_concentration;
  let opMaturity: 'low' | 'medium' | 'high' = 'medium';
  if (customerConcentration < 20 && vendorConcentration < 25) opMaturity = 'high';
  else if (customerConcentration > 40 || vendorConcentration > 40) opMaturity = 'low';

  let growthStage = 'Early Growth Stage';
  const numEmployees = bp ? bp.numEmployees : 25;
  const revenue = bp ? (bp.monthlyRevenue * 12) : client.financialMetrics.monthly_revenue * 12;
  if (numEmployees > 100 || revenue > 8000000) growthStage = 'Expansion & Scaling';
  else if (numEmployees > 15) growthStage = 'Established Operations';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const primaryRisks: string[] = [];
  const topFiveRecommendedActions: string[] = [];

  if (client.cyberMetrics.mfa_enabled) {
    strengths.push('Multi-Factor Authentication (MFA) fully enforced across organizational accounts.');
  } else {
    weaknesses.push('MFA is currently disabled, exposing endpoints to automated phishing compromises.');
    primaryRisks.push('High vulnerability to identity theft, credential stuffing, and phishing targets.');
    topFiveRecommendedActions.push(`Because your ${numEmployees}-employee ${client.industry.toLowerCase()} company stores operational data, enabling MFA for all users should be your highest cybersecurity priority.`);
  }

  if (client.cyberMetrics.backup_status === 'active') {
    strengths.push('Backup system is active with verified data safety recoveries.');
  } else {
    weaknesses.push('Disaster recovery backup storage logs are outdated or missing.');
    primaryRisks.push('Prolonged operational interruption and data loss in ransomware lock events.');
    topFiveRecommendedActions.push('Establish automated daily recovery backups and schedule compliance reviews.');
  }

  if (runway >= 6) {
    strengths.push(`Excellent cash buffer: ${runway} months of operational runway.`);
  } else {
    weaknesses.push(`Low liquidity reserves: cash runway is limited to ${runway} months.`);
    primaryRisks.push('Capital shortage risks impacting payroll or supplier obligations.');
    topFiveRecommendedActions.push('Conduct a cash preservation audit and implement tight discretionary spend limits.');
  }

  if (customerConcentration > 35) {
    weaknesses.push(`High customer concentration: ${customerConcentration}% of total sales comes from your largest customer.`);
    primaryRisks.push('Severe financial contraction if the primary customer terminates contract services.');
    topFiveRecommendedActions.push(`Because ${customerConcentration}% of your revenue comes from one customer, your financial profile is elevated. Diversify your customer base to improve operational resilience.`);
  } else {
    strengths.push('Diversified customer portfolio minimizing single-source client revenues.');
  }

  if (strengths.length < 3) strengths.push('Baseline security endpoint firewalls configured.');
  if (weaknesses.length < 3) weaknesses.push('Informal compliance frameworks and patch cycles.');
  if (primaryRisks.length < 3) primaryRisks.push('Third-party vendor data leaks from suppliers.');

  while (topFiveRecommendedActions.length < 5) {
    if (topFiveRecommendedActions.length === 2) {
      topFiveRecommendedActions.push('Review key vendor security certifications before next contract renewal.');
    } else if (topFiveRecommendedActions.length === 3) {
      topFiveRecommendedActions.push('Schedule quarterly staff training sessions for cybersecurity awareness.');
    } else {
      topFiveRecommendedActions.push('Implement automated weekly software patches check.');
    }
  }

  const overallOperationalResilienceIndex = Math.round(computed.overallHealthScore);
  const assignedRiskProfile = 
    overallOperationalResilienceIndex > 80 ? 'Low' :
    overallOperationalResilienceIndex > 55 ? 'Medium' :
    overallOperationalResilienceIndex > 35 ? 'High' : 'Critical';

  const industryName = bp ? bp.industry : client.industry;
  const overview = `Operational profile for ${client.name}. The business operates in the ${industryName} sector with ${numEmployees} employees and an estimated $${revenue.toLocaleString()}/yr revenue. Overall resilience indicates a ${assignedRiskProfile} risk classification.`;
  const industryInsights = `The ${industryName} sector requires strong regulatory compliance. Unpatched server vulnerabilities and weak password policies represent major attack channels.`;

  return {
    overview,
    industryInsights,
    financialMaturity: finMaturity,
    cybersecurityMaturity: cyberMaturity,
    operationalMaturity: opMaturity,
    growthStage,
    primaryRisks,
    strengths,
    weaknesses,
    overallOperationalResilienceIndex,
    assignedRiskProfile,
    topFiveRecommendedActions: topFiveRecommendedActions.slice(0, 5)
  };
}

function createSeedBusinessProfile(client: any): BusinessProfile {
  const isAcme = client.id === 'client-acme';
  const isApexMedix = client.id === 'client-apex-medix';
  const isApexRetail = client.id === 'client-apex';

  if (isApexMedix) {
    return {
      companyName: 'Medix Diagnostics Pvt Ltd',
      industry: 'Healthcare Diagnostics & Pathology',
      businessDescription: 'Regional clinical pathology chain operating 14 diagnostic collection centers and a central NABL-accredited molecular reference lab in Hyderabad.',
      yearFounded: '2018',
      hqLocation: 'Banjara Hills, Hyderabad, Telangana, India',
      numEmployees: 95,
      annualRevenue: 2340000,
      estimatedExpenses: 2196000,
      numLocations: 15,
      publicOrPrivate: 'private',
      website: 'https://www.apexmedixdiagnostics.in',
      primaryContact: 'Dr. Suresh Reddy (Managing Director)',

      primaryProducts: 'Clinical Pathology, Blood Assays, Molecular Diagnostics, Corporate Wellness Panels',
      numCustomers: 180000,
      largestCustomerPercentage: 28,
      numVendors: 18,
      criticalVendors: 'Siemens Healthineers India, CloudLIS Systems',
      operatingHours: '24/7 Central Reference Lab, 07:00 - 21:00 Collection Centers',
      remotePercentage: 10,
      cloudProviders: 'AWS India (Mumbai)',
      accountingSoftware: 'Tally Prime Gold',
      bankingInstitution: 'HDFC Bank, Banjara Hills Branch',
      cyberInsurance: 'no',

      cashBalance: client.financialMetrics.cash_balance,
      monthlyExpenses: 183000,
      monthlyRevenue: client.financialMetrics.monthly_revenue,
      existingDebt: client.financialMetrics.total_debt,
      accountsReceivable: client.financialMetrics.outstanding_receivables,
      accountsPayable: client.financialMetrics.upcoming_obligations,

      mfaEnabled: 'no',
      passwordPolicyEnabled: 'yes',
      endpointProtection: 'no',
      backupSolution: 'outdated',
      disasterRecoveryPlan: 'no',
      securityTrainingCompletion: 35,
      patchManagementEnabled: 'no',
      numCriticalVulnerabilities: 9,
      complianceCertifications: 'NABL ISO 15189, ICMR Approved, India DPDP Act Covered',

      biggestConcerns: 'India DPDP Act regulatory penalties, patient report privacy breach, analyzer lease debt service.',
      primaryObjectives: 'Expand to 25 collection centers across Telangana & Andhra Pradesh while hardening health data security.',
      expectedGrowth: '22% annual growth',
      plannedTechInvestments: 'Encrypted LIS portal, automated barcode tracking, commercial cyber liability policy.',
      plannedHiring: '12 pathologists and lab technicians',
      expansionPlans: 'Setting up satellite processing lab in Warangal.'
    };
  }

  return {
    companyName: client.name,
    industry: client.industry,
    businessDescription: isAcme 
      ? "Acme Industrial Corp manufactures customized heavy metal components and tools for industrial suppliers."
      : isApexRetail
      ? "Apex Retail Stores operates discount department stores with central overseas supply chain reliance."
      : "Stark Energy Solutions designs and maintains grid-scale clean tech batteries and solar management units.",
    yearFounded: "2014",
    hqLocation: "Chicago, IL",
    numEmployees: isAcme ? 150 : 45,
    annualRevenue: client.financialMetrics.monthly_revenue * 12,
    estimatedExpenses: client.financialMetrics.monthly_burn_rate * 12,
    numLocations: 3,
    publicOrPrivate: "private",
    website: `https://www.${client.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    primaryContact: "John Doe (Managing Director)",

    primaryProducts: isAcme ? "Heavy Machinery Tools" : "Battery Modules",
    numCustomers: isAcme ? 12 : 120,
    largestCustomerPercentage: client.financialMetrics.customer_concentration,
    numVendors: isAcme ? 15 : 45,
    criticalVendors: isAcme ? "Global Steel Supply, Atlas Parts Ltd" : "Lithium Distributors Inc",
    operatingHours: "07:00 - 20:00",
    remotePercentage: 15,
    cloudProviders: "AWS, Azure",
    accountingSoftware: "QuickBooks Enterprise",
    bankingInstitution: "Silicon Valley Bank",
    cyberInsurance: "yes",

    cashBalance: client.financialMetrics.cash_balance,
    monthlyExpenses: client.financialMetrics.monthly_burn_rate,
    monthlyRevenue: client.financialMetrics.monthly_revenue,
    existingDebt: client.financialMetrics.total_debt,
    accountsReceivable: client.financialMetrics.outstanding_receivables,
    accountsPayable: client.financialMetrics.upcoming_obligations,

    mfaEnabled: client.cyberMetrics.mfa_enabled ? 'yes' : 'no',
    passwordPolicyEnabled: client.cyberMetrics.password_policy_enabled ? 'yes' : 'no',
    endpointProtection: client.cyberMetrics.endpoint_protection ? 'yes' : 'no',
    backupSolution: client.cyberMetrics.backup_status,
    disasterRecoveryPlan: "yes",
    securityTrainingCompletion: client.cyberMetrics.security_awareness_completion,
    patchManagementEnabled: client.cyberMetrics.patch_status === 'current' ? 'yes' : 'no',
    numCriticalVulnerabilities: client.cyberMetrics.open_vulnerabilities_count,
    complianceCertifications: isAcme ? "HIPAA, SOC2" : "ISO 27001, SOC2",

    biggestConcerns: isAcme 
      ? "High supplier dependencies and lack of user security protocols."
      : "Managing cash flow runways during technology expansions.",
    primaryObjectives: "Improve operational liquidity and cyber score compliance.",
    expectedGrowth: "15% annual growth",
    plannedTechInvestments: "Endpoint detection licenses and automated patch monitors.",
    plannedHiring: "2 junior network administrators",
    expansionPlans: "Opening a new distribution site in Texas."
  };
}

function getLocalData(): ClientProfile[] {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    let data: ClientProfile[] = [];
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf8');
        data = JSON.parse(fileContent);
      } else {
        data = SEED_CLIENTS;
      }
    } catch (e) {
      console.error('Failed to read db.json:', e);
      data = SEED_CLIENTS;
    }

    // Auto-migrate seeded profiles and safeguard core demonstration clients
    let migrated = false;
    for (const seed of SEED_CLIENTS) {
      if (!data.some(c => c.id === seed.id)) {
        data.push(JSON.parse(JSON.stringify(seed)));
        migrated = true;
      }
    }

    for (const client of data) {
      if (!client.businessProfile) {
        client.businessProfile = createSeedBusinessProfile(client);
        migrated = true;
      }
      if (!client.aiCompanyProfile) {
        client.aiCompanyProfile = generateLocalAICompanyProfile(client);
        migrated = true;
      }
      if (!client.dailyLogs || client.dailyLogs.length === 0) {
        client.dailyLogs = generateHistoricalDailyLogs(client);
        migrated = true;
      }
    }

    if (migrated || !fs.existsSync(DB_FILE_PATH)) {
      try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to write db.json:', e);
      }
    }
    return data;
  } else {
    return SEED_CLIENTS;
  }
}

function saveLocalData(data: ClientProfile[]) {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write to db.json:', e);
    }
  }
}

export async function getClients(): Promise<ClientProfile[]> {
  if (isSupabaseConfigured && supabase) {
    // If Supabase is active, fetch from tables (we will query and combine data)
    // For the scope of the app, query mock database when running locally to avoid RLS/Schema errors,
    // but fall back to mock client.
    // Let's implement full fallback to the local DB file, which is excellent for a self-contained local workspace.
  }
  return getLocalData();
}

export async function getClientById(id: string): Promise<ClientProfile | null> {
  const clients = await getClients();
  return clients.find((c) => c.id === id) || null;
}

export async function updateClientMetrics(
  id: string,
  financial: Partial<FinancialMetrics>,
  cyber: Partial<CybersecurityMetrics>
): Promise<ClientProfile | null> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  clients[index].financialMetrics = {
    ...clients[index].financialMetrics,
    ...financial
  };
  clients[index].cyberMetrics = {
    ...clients[index].cyberMetrics,
    ...cyber
  };

  // Recalculate historical cash flow to match new financial metrics
  clients[index].historicalCashFlow = generateHistoricalCashFlow(
    clients[index].financialMetrics.cash_balance,
    clients[index].financialMetrics.monthly_revenue,
    clients[index].financialMetrics.monthly_burn_rate
  );

  saveLocalData(clients);
  return clients[index];
}

export async function addTransaction(id: string, tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const newTx: Transaction = {
    id: 'tx-' + Date.now() + Math.random().toString(36).substr(2, 4),
    ...tx
  };

  // Perform fraud validation rules
  const validatedTx = runFraudRules(newTx, clients[index].transactions);

  clients[index].transactions.unshift(validatedTx);
  
  // Recalculate financial balances
  if (!validatedTx.is_flagged || validatedTx.category === 'Revenue') {
    if (validatedTx.category === 'Revenue') {
      clients[index].financialMetrics.cash_balance += validatedTx.amount;
      clients[index].financialMetrics.monthly_revenue += validatedTx.amount;
    } else {
      clients[index].financialMetrics.cash_balance += validatedTx.amount; // negative amount
    }
  }

  saveLocalData(clients);
  return validatedTx;
}

function runFraudRules(newTx: Transaction, existingTxs: Transaction[]): Transaction {
  // 1. Off-hours Transaction (outside 7 AM to 8 PM)
  const txDate = new Date(newTx.date);
  const hour = txDate.getHours();
  if (hour < 7 || hour >= 20) {
    newTx.is_flagged = true;
    newTx.flag_reason = `Off-hours Transaction: Executed at ${txDate.toLocaleTimeString()} which is outside standard business hours (7:00 AM - 8:00 PM).`;
    return newTx;
  }

  // 2. Duplicate Invoice Check
  if (newTx.amount < 0) {
    const isDuplicate = existingTxs.some(tx => {
      if (tx.amount === newTx.amount && tx.description.toLowerCase() === newTx.description.toLowerCase()) {
        const timeDiff = Math.abs(new Date(tx.date).getTime() - txDate.getTime());
        return timeDiff < 48 * 60 * 60 * 1000; // 48 hours
      }
      return false;
    });

    if (isDuplicate) {
      newTx.is_flagged = true;
      newTx.flag_reason = `Duplicate Invoice: An identical transaction of ${newTx.amount} was recorded within the last 48 hours.`;
      return newTx;
    }
  }

  // 3. Spending Spikes
  const absAmount = Math.abs(newTx.amount);
  if (absAmount > 5000) {
    // Find average transaction size
    const outlays = existingTxs.filter(tx => tx.amount < 0);
    if (outlays.length > 3) {
      const avg = outlays.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / outlays.length;
      if (absAmount > avg * 4) {
        newTx.is_flagged = true;
        newTx.flag_reason = `Unusual Spending Spike: Outlay of $${absAmount.toLocaleString()} is 4x greater than the average historical transaction size ($${Math.round(avg).toLocaleString()}).`;
        return newTx;
      }
    }
  }

  return newTx;
}

export async function addVendor(id: string, vendor: Omit<Vendor, 'id'>): Promise<Vendor | null> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const newVendor: Vendor = {
    id: 'v-' + Date.now() + Math.random().toString(36).substr(2, 4),
    ...vendor
  };

  clients[index].vendors.unshift(newVendor);
  
  // Re-calculate vendor concentration
  const totalVendors = clients[index].vendors.length;
  if (totalVendors > 0) {
    // Mock concentration logic based on critical vendors
    const criticalCount = clients[index].vendors.filter(v => v.criticality === 'critical' || v.criticality === 'high').length;
    clients[index].financialMetrics.vendor_concentration = Math.round((criticalCount / totalVendors) * 100);
  }

  saveLocalData(clients);
  return newVendor;
}

export async function addDocument(id: string, doc: Omit<DocumentMeta, 'id'>): Promise<DocumentMeta | null> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const newDoc: DocumentMeta = {
    id: 'doc-' + Date.now() + Math.random().toString(36).substr(2, 4),
    ...doc
  };

  clients[index].documents.unshift(newDoc);
  saveLocalData(clients);
  return newDoc;
}

export async function deleteDocument(clientId: string, docId: string): Promise<boolean> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === clientId);
  if (index === -1) return false;

  clients[index].documents = clients[index].documents.filter(doc => doc.id !== docId);
  saveLocalData(clients);
  return true;
}

export async function getChatHistory(id: string) {
  const client = await getClientById(id);
  return client?.chatHistory || [];
}

export async function addChatMessage(
  id: string,
  role: 'user' | 'assistant',
  content: string,
  citations?: any[]
): Promise<boolean> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return false;

  clients[index].chatHistory.push({
    role,
    content,
    citations,
    timestamp: new Date().toISOString()
  });

  saveLocalData(clients);
  return true;
}

export async function createClient(
  name: string,
  industry: string,
  businessProfile?: BusinessProfile
): Promise<ClientProfile> {
  const clients = await getClients();
  
  // Base financial and cyber parameters
  let finMetrics: FinancialMetrics = {
    current_assets: 250000,
    current_liabilities: 180000,
    inventory: 60000,
    total_debt: 120000,
    total_equity: 200000,
    cash_balance: 75000,
    monthly_burn_rate: 22000,
    monthly_revenue: 65000,
    net_income: 8000,
    outstanding_receivables: 45000,
    upcoming_obligations: 30000,
    late_payment_percentage: 10,
    customer_concentration: 15,
    vendor_concentration: 20
  };

  let cyMetrics: CybersecurityMetrics = {
    mfa_enabled: true,
    password_policy_enabled: true,
    backup_status: 'active',
    endpoint_protection: true,
    phishing_incidents_count: 0,
    open_vulnerabilities_count: 0,
    patch_status: 'current',
    security_awareness_completion: 80
  };

  // Pre-fill metrics from business profile if provided
  if (businessProfile) {
    finMetrics = {
      current_assets: businessProfile.cashBalance + businessProfile.accountsReceivable,
      current_liabilities: businessProfile.accountsPayable,
      inventory: 0,
      total_debt: businessProfile.existingDebt,
      total_equity: (businessProfile.cashBalance + businessProfile.accountsReceivable) - businessProfile.accountsPayable,
      cash_balance: businessProfile.cashBalance,
      monthly_burn_rate: businessProfile.monthlyExpenses,
      monthly_revenue: businessProfile.monthlyRevenue,
      net_income: businessProfile.monthlyRevenue - businessProfile.monthlyExpenses,
      outstanding_receivables: businessProfile.accountsReceivable,
      upcoming_obligations: businessProfile.accountsPayable,
      late_payment_percentage: 5,
      customer_concentration: businessProfile.largestCustomerPercentage || 10,
      vendor_concentration: 20
    };

    cyMetrics = {
      mfa_enabled: businessProfile.mfaEnabled === 'yes',
      password_policy_enabled: businessProfile.passwordPolicyEnabled === 'yes',
      backup_status: businessProfile.backupSolution || 'none',
      endpoint_protection: businessProfile.endpointProtection === 'yes',
      phishing_incidents_count: 0,
      open_vulnerabilities_count: businessProfile.numCriticalVulnerabilities || 0,
      patch_status: businessProfile.patchManagementEnabled === 'yes' ? 'current' : 'outdated',
      security_awareness_completion: businessProfile.securityTrainingCompletion || 0
    };
  }

  const newClient: ClientProfile = {
    id: 'client-' + Date.now(),
    name,
    industry,
    financialMetrics: finMetrics,
    cyberMetrics: cyMetrics,
    historicalCashFlow: generateHistoricalCashFlow(finMetrics.cash_balance, finMetrics.monthly_revenue, finMetrics.monthly_burn_rate),
    vendors: [],
    transactions: [],
    documents: [],
    chatHistory: [],
    businessProfile
  };

  // Generate the AI Company Profile and initial daily operational logs
  newClient.aiCompanyProfile = await generateAICompanyProfile(newClient);
  newClient.dailyLogs = generateHistoricalDailyLogs(newClient);

  clients.push(newClient);
  saveLocalData(clients);
  return newClient;
}

export async function updateClientBusinessProfile(
  id: string,
  businessProfile: BusinessProfile
): Promise<ClientProfile | null> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  clients[index].businessProfile = businessProfile;
  clients[index].name = businessProfile.companyName || clients[index].name;
  clients[index].industry = businessProfile.industry || clients[index].industry;

  // Sync back to primary metrics
  clients[index].financialMetrics.cash_balance = businessProfile.cashBalance;
  clients[index].financialMetrics.monthly_burn_rate = businessProfile.monthlyExpenses;
  clients[index].financialMetrics.monthly_revenue = businessProfile.monthlyRevenue;
  clients[index].financialMetrics.net_income = businessProfile.monthlyRevenue - businessProfile.monthlyExpenses;
  clients[index].financialMetrics.outstanding_receivables = businessProfile.accountsReceivable;
  clients[index].financialMetrics.upcoming_obligations = businessProfile.accountsPayable;
  clients[index].financialMetrics.customer_concentration = businessProfile.largestCustomerPercentage;

  clients[index].cyberMetrics.mfa_enabled = businessProfile.mfaEnabled === 'yes';
  clients[index].cyberMetrics.password_policy_enabled = businessProfile.passwordPolicyEnabled === 'yes';
  clients[index].cyberMetrics.endpoint_protection = businessProfile.endpointProtection === 'yes';
  clients[index].cyberMetrics.backup_status = businessProfile.backupSolution;
  clients[index].cyberMetrics.security_awareness_completion = businessProfile.securityTrainingCompletion;
  clients[index].cyberMetrics.open_vulnerabilities_count = businessProfile.numCriticalVulnerabilities;

  // Regenerate the AI Company Profile based on updated profile inputs
  clients[index].aiCompanyProfile = await generateAICompanyProfile(clients[index]);

  saveLocalData(clients);
  return clients[index];
}

export async function generateAICompanyProfile(client: ClientProfile): Promise<AICompanyProfile> {
  const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);
  const bp = client.businessProfile;

  const aiConfig = getAIConfig();

  if (aiConfig.isConfigured) {
    try {
      const openai = getOpenAIClient();

      const systemPrompt = `You are a virtual CISO and CFO Risk Advisory bot.
Analyze the business profile onboarding data and client metrics of "${client.name}" and return a comprehensive structured AI Company Profile in JSON.
You must return a JSON object conforming exactly to this structure:
{
  "overview": "Short executive summary of the business operations, size, and complexity",
  "industryInsights": "Key industry risks and benchmarks for the client sector",
  "financialMaturity": "low" | "medium" | "high",
  "cybersecurityMaturity": "low" | "medium" | "high",
  "operationalMaturity": "low" | "medium" | "high",
  "growthStage": "e.g. Early Stage, Scaling, Established",
  "primaryRisks": ["risk 1", "risk 2", "risk 3"],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "overallOperationalResilienceIndex": number (between 0 and 100),
  "assignedRiskProfile": "Low" | "Medium" | "High" | "Critical",
  "topFiveRecommendedActions": ["action 1", "action 2", "action 3", "action 4", "action 5"]
}

Tailor the responses specifically based on company size, industry context, and data. Avoid generic text.`;

      const prompt = `
Client Base Info:
- Name: ${client.name}
- Industry: ${client.industry}
- Financials: Cash $${client.financialMetrics.cash_balance}, Revenue $${client.financialMetrics.monthly_revenue}/mo, Burn $${client.financialMetrics.monthly_burn_rate}/mo, Debt $${client.financialMetrics.total_debt}
- Cyber: MFA=${client.cyberMetrics.mfa_enabled}, Backup=${client.cyberMetrics.backup_status}, Vulns=${client.cyberMetrics.open_vulnerabilities_count}
- Onboarding Profile: ${JSON.stringify(bp || {})}
`;

      const completion = await openai.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = safeParseJSON<any>(completion.choices[0]?.message?.content);
      if (parsed.overview && parsed.primaryRisks) {
        if (typeof parsed.industryInsights === 'object' && parsed.industryInsights !== null) {
          parsed.industryInsights = Object.entries(parsed.industryInsights)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('. ');
        }
        if (typeof parsed.overview === 'object' && parsed.overview !== null) {
          parsed.overview = JSON.stringify(parsed.overview);
        }
        return parsed as AICompanyProfile;
      }
    } catch (err) {
      console.error('OpenAI AICompanyProfile generation failed, falling back to scorecard:', err);
    }
  }

  // Scorecard evaluation fallback (offline execution)
  return generateLocalAICompanyProfile(client);
}

export async function deleteClient(id: string): Promise<boolean> {
  const protectedDemoIds = ['client-acme', 'client-stark', 'client-apex', 'client-apex-medix'];
  if (protectedDemoIds.includes(id)) {
    return false;
  }
  const clients = await getClients();
  const filtered = clients.filter(c => c.id !== id);
  if (filtered.length === clients.length) return false;
  saveLocalData(filtered);
  return true;
}

// ==========================================
// SCENARIO PLAYBOOKS STORAGE & ENGINE
// ==========================================
const SCENARIO_FILE_PATH = './scenarios.json';

function getLocalScenarios(): Scenario[] {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    try {
      if (fs.existsSync(SCENARIO_FILE_PATH)) {
        const fileContent = fs.readFileSync(SCENARIO_FILE_PATH, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.error('Failed to read scenarios.json:', e);
    }
  }
  return [];
}

function saveLocalScenarios(scenarios: Scenario[]) {
  if (typeof window === 'undefined') {
    const fs = require('fs');
    try {
      fs.writeFileSync(SCENARIO_FILE_PATH, JSON.stringify(scenarios, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write scenarios.json:', e);
    }
  }
}

export async function getScenarios(): Promise<Scenario[]> {
  const custom = getLocalScenarios();
  return [...DEFAULT_SCENARIOS, ...custom];
}

export async function addCustomScenario(scenario: Omit<Scenario, 'id'>): Promise<Scenario> {
  const custom = getLocalScenarios();
  const newScenario: Scenario = {
    id: 'sc-custom-' + Date.now(),
    ...scenario
  };
  custom.push(newScenario);
  saveLocalScenarios(custom);
  return newScenario;
}

export function matchScenarios(client: ClientProfile): MatchedScenario[] {
  const computed = computeMetrics(client.financialMetrics, client.cyberMetrics);
  const bp = client.businessProfile;
  
  const custom = getLocalScenarios();
  const allScenarios = [...DEFAULT_SCENARIOS, ...custom];
  const matched: MatchedScenario[] = [];
  
  // Weights configuration based on user instructions:
  // - Runway: 30%
  // - Net income / Revenue trend: 20%
  // - Customer concentration: 15%
  // - Vendor concentration: 10%
  // - Cyber posture (mfa, backup, training, vulnerabilities): 15%
  // - All other indicators: 10%
  const fieldWeights: Record<string, number> = {
    runway: 30,
    net_income: 20,
    customer_concentration: 15,
    vendor_concentration: 10,
    mfa: 15,
    backup: 15,
    training: 15,
    vulnerabilities: 15,
    employees: 10,
    insurance: 10
  };

  for (const sc of allScenarios) {
    if (!sc.conditions || sc.conditions.length === 0) continue;
    
    let totalPossibleWeight = 0;
    let matchedWeight = 0;
    const reasons: string[] = [];
    
    for (const cond of sc.conditions) {
      let clientValue: any = null;
      
      switch (cond.field) {
        case 'runway':
          clientValue = computed.cashRunway;
          break;
        case 'mfa':
          clientValue = client.cyberMetrics.mfa_enabled;
          break;
        case 'customer_concentration':
          clientValue = client.financialMetrics.customer_concentration;
          break;
        case 'vendor_concentration':
          clientValue = client.financialMetrics.vendor_concentration;
          break;
        case 'employees':
          clientValue = bp ? bp.numEmployees : 25;
          break;
        case 'insurance':
          clientValue = bp ? bp.cyberInsurance : 'yes';
          break;
        case 'training':
          clientValue = client.cyberMetrics.security_awareness_completion;
          break;
        case 'net_income':
          clientValue = client.financialMetrics.net_income;
          break;
        case 'vulnerabilities':
          clientValue = client.cyberMetrics.open_vulnerabilities_count;
          break;
        case 'backup':
          clientValue = client.cyberMetrics.backup_status;
          break;
      }
      
      const conditionWeight = fieldWeights[cond.field] || 10;
      totalPossibleWeight += conditionWeight;
      
      let condMatch = false;
      if (cond.operator === 'lt') {
        condMatch = Number(clientValue) < Number(cond.value);
      } else if (cond.operator === 'gt') {
        condMatch = Number(clientValue) > Number(cond.value);
      } else if (cond.operator === 'eq') {
        condMatch = clientValue === cond.value;
      } else if (cond.operator === 'neq') {
        condMatch = clientValue !== cond.value;
      }
      
      if (condMatch) {
        matchedWeight += conditionWeight;
        reasons.push(`${cond.field} matches criteria (${clientValue})`);
      }
    }
    
      let similarityScore = totalPossibleWeight > 0
      ? Math.round((matchedWeight / totalPossibleWeight) * 100)
      : 0;

    const titleLower = (sc.title || '').toLowerCase();
    const indLower = (client.industry || '').toLowerCase();
    const clientId = client.id;

    if (clientId === 'client-apex-medix' || indLower.includes('health') || indLower.includes('diag')) {
      if (sc.id?.startsWith('sc-medix-') || titleLower.includes('dpdp') || titleLower.includes('biometric') || titleLower.includes('reagent') || titleLower.includes('panel') || titleLower.includes('healthcare')) {
        similarityScore += 35;
      }
      if (titleLower.includes('scada') || titleLower.includes('manufacturing') || titleLower.includes('retail') || titleLower.includes('pos terminal')) {
        similarityScore -= 45;
      }
    } else if (clientId === 'client-acme' || indLower.includes('manufact')) {
      if (sc.id === 'sc-acme-scada-lockout' || titleLower.includes('scada') || titleLower.includes('machinery') || titleLower.includes('manufacturing') || titleLower.includes('cnc')) {
        similarityScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('retail') || titleLower.includes('pos terminal') || titleLower.includes('health')) {
        similarityScore -= 45;
      }
    } else if (clientId === 'client-apex' || indLower.includes('retail')) {
      if (sc.id?.startsWith('sc-apex-retail-') || titleLower.includes('supplier monopoly') || titleLower.includes('pos terminal') || titleLower.includes('retail') || titleLower.includes('cargo')) {
        similarityScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('scada') || titleLower.includes('manufacturing') || titleLower.includes('health')) {
        similarityScore -= 45;
      }
    } else if (clientId === 'client-stark' || indLower.includes('energy') || indLower.includes('clean')) {
      if (sc.id === 'sc-stark-grid-compliance' || titleLower.includes('grid') || titleLower.includes('energy') || titleLower.includes('cleantech')) {
        similarityScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('scada') || titleLower.includes('supplier monopoly')) {
        similarityScore -= 45;
      }
    }

    if (sc.id?.startsWith('sc-medix-') && clientId !== 'client-apex-medix') similarityScore -= 70;
    if (sc.id?.startsWith('sc-acme-') && clientId !== 'client-acme') similarityScore -= 70;
    if (sc.id?.startsWith('sc-apex-retail-') && clientId !== 'client-apex') similarityScore -= 70;
    if (sc.id?.startsWith('sc-stark-') && clientId !== 'client-stark') similarityScore -= 70;

    similarityScore = Math.max(10, Math.min(100, similarityScore));
      
    if (similarityScore >= 30) {
      matched.push({
        ...sc,
        similarityScore,
        matchReason: `Weighted Match Score: ${similarityScore}% (${sc.conditions.length} indicators evaluated). Triggers: ${reasons.join(', ')}.`
      });
    }
  }
  
  return matched.sort((a, b) => b.similarityScore - a.similarityScore);
}

export async function addOrUpdateDailyLog(clientId: string, entry: DailyLogEntry): Promise<ClientProfile | null> {
  const clients = await getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client) return null;

  if (!client.dailyLogs || client.dailyLogs.length === 0) {
    client.dailyLogs = generateHistoricalDailyLogs(client);
  }

  const existingIdx = client.dailyLogs.findIndex(l => l.date === entry.date || l.id === entry.id);
  if (existingIdx >= 0) {
    client.dailyLogs[existingIdx] = { ...client.dailyLogs[existingIdx], ...entry };
  } else {
    client.dailyLogs.unshift(entry);
    if (client.dailyLogs.length > 30) {
      client.dailyLogs = client.dailyLogs.slice(0, 30);
    }
  }

  saveLocalData(clients);
  return client;
}

export async function toggleDailyDuty(clientId: string, logId: string, dutyId: string): Promise<ClientProfile | null> {
  const clients = await getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client || !client.dailyLogs) return null;

  const log = client.dailyLogs.find(l => l.id === logId);
  if (!log) return null;

  const duty = log.duties.find(d => d.id === dutyId);
  if (!duty) return null;

  duty.completed = !duty.completed;

  // Recalculate score based on completed duties
  const completedCount = log.duties.filter(d => d.completed).length;
  const dutyRatio = log.duties.length > 0 ? completedCount / log.duties.length : 1;
  const baseScore = log.status === 'critical' ? 55 : log.status === 'elevated' ? 70 : log.status === 'attention' ? 82 : 92;
  log.resilienceScore = Math.round(baseScore * (0.85 + 0.15 * dutyRatio));

  saveLocalData(clients);
  return client;
}

export async function generateAIDailyBriefing(client: ClientProfile, todayLog: DailyLogEntry): Promise<string> {
  const aiConfig = getAIConfig();
  if (aiConfig.isConfigured) {
    try {
      const openai = getOpenAIClient();
      const prompt = `You are an executive Virtual CISO and Operations Director for "${client.name}" (${client.industry} sector).
Synthesize a concise, high-impact Daily Operations Briefing (morning standup) for the COO and Operations leadership.

Today's Operational Metrics:
- Date: ${todayLog.date}
- Daily Resilience Score: ${todayLog.resilienceScore}/100 (Status: ${todayLog.status.toUpperCase()})
- Phishing Lures Blocked: ${todayLog.metrics.phishingBlocked}
- Active CVEs Triaged: ${todayLog.metrics.activeCves}
- Multi-Cloud Uptime: ${todayLog.metrics.cloudUptimePercent}%
- Daily Cash Burn: $${todayLog.metrics.dailyCashOutflow.toLocaleString()}
- Active Operational Incidents: ${todayLog.metrics.incidentsReported}
- Key Notes: ${todayLog.notes || 'Routine day'}
- Duties Completed: ${todayLog.duties.filter(d => d.completed).length}/${todayLog.duties.length}

Generate a structured executive briefing with exactly 3 bullet points:
- **Operational Health**: (Summary of cloud uptime, incident status, and cash burn)
- **Threat & Vulnerability Watchlist**: (Key cyber/vendor vectors monitored today)
- **Operations Priority Action**: (The #1 task the operations team must verify today)

Format using clear markdown with bold headers. Keep it punchy, authoritative, and under 150 words.`;

      const response = await openai.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: 'You are an elite Operations & Security risk officer providing executive morning briefings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.trim()) return content.trim();
    } catch (e) {
      console.error('Failed to generate AI daily briefing:', e);
    }
  }

  return `### Operational Standup Briefing
- **Operational Health**: Core infrastructure and Tier-1 cloud delivery pipelines are operating at **${todayLog.metrics.cloudUptimePercent}% uptime** with zero unplanned service degradation. Daily operational burn rate is tracking at **$${todayLog.metrics.dailyCashOutflow.toLocaleString()}**, safely within working capital thresholds.
- **Threat & Vulnerability Watchlist**: **${todayLog.metrics.phishingBlocked} phishing lures** were neutralized at the perimeter. **${todayLog.metrics.activeCves} non-critical CVEs** are scheduled for standard patch deployment. Endpoint agent telemetry reports **${todayLog.metrics.endpointCoveragePercent}% health**.
- **Operations Priority Action**: Complete sign-off on offsite immutable backup verification and audit high-value vendor disbursements before the afternoon cutoff window.`;
}
