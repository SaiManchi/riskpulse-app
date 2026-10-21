export interface FinancialMetrics {
  current_assets: number;
  current_liabilities: number;
  inventory: number;
  total_debt: number;
  total_equity: number;
  cash_balance: number;
  monthly_burn_rate: number;
  monthly_revenue: number;
  net_income: number;
  outstanding_receivables: number;
  upcoming_obligations: number;
  late_payment_percentage: number;
  working_capital?: number;
  customer_concentration: number; // percentage
  vendor_concentration: number; // percentage
  revenue_trend?: number; // MoM trend percentage
}

export interface CybersecurityMetrics {
  mfa_enabled: boolean;
  password_policy_enabled: boolean;
  backup_status: 'active' | 'outdated' | 'none';
  endpoint_protection: boolean;
  phishing_incidents_count: number;
  open_vulnerabilities_count: number;
  patch_status: 'current' | 'outdated' | 'critical_missing';
  security_awareness_completion: number; // 0 to 100
}

export interface ComputedRatios {
  currentRatio: number;
  quickRatio: number;
  debtRatio: number;
  cashRunway: number; // in months
  workingCapital: number;
  financialRiskScore: number;
  cyberRiskScore: number;
  overallHealthScore: number;
  explanations: {
    currentRatio: string;
    quickRatio: string;
    debtRatio: string;
    cashRunway: string;
    workingCapital: string;
    customerConcentration: string;
    vendorConcentration: string;
    operationalRisk: string;
  };
}

export function computeMetrics(
  financial: FinancialMetrics,
  cyber: CybersecurityMetrics
): ComputedRatios {
  // 1. Financial Ratio Calculations
  const currentRatio = financial.current_liabilities > 0 
    ? Number((financial.current_assets / financial.current_liabilities).toFixed(2))
    : 99.9;

  const quickRatio = financial.current_liabilities > 0
    ? Number(((financial.current_assets - financial.inventory) / financial.current_liabilities).toFixed(2))
    : 99.9;

  const totalAssets = financial.total_debt + financial.total_equity;
  const debtRatio = totalAssets > 0
    ? Number((financial.total_debt / totalAssets).toFixed(2))
    : 0;

  const cashRunway = financial.monthly_burn_rate > 0
    ? Number((financial.cash_balance / financial.monthly_burn_rate).toFixed(1))
    : 99.9; // infinite runway if burn is <= 0

  const workingCapital = financial.current_assets - financial.current_liabilities;

  // 2. Financial Risk Score (0-100)
  let finRisk = 0;
  // Current Ratio risk (ideal is >= 1.5)
  if (currentRatio < 1.0) finRisk += 25;
  else if (currentRatio < 1.5) finRisk += 12;

  // Quick Ratio risk (ideal is >= 1.0)
  if (quickRatio < 0.8) finRisk += 15;
  else if (quickRatio < 1.0) finRisk += 8;

  // Debt Ratio risk (ideal is <= 0.5)
  if (debtRatio > 0.7) finRisk += 20;
  else if (debtRatio > 0.5) finRisk += 10;

  // Cash Runway risk (ideal is >= 6 months)
  if (cashRunway < 3) finRisk += 25;
  else if (cashRunway < 6) finRisk += 12;

  // Customer Concentration risk
  if (financial.customer_concentration > 40) finRisk += 15;
  else if (financial.customer_concentration > 25) finRisk += 7;

  // Late Payment Risk
  if (financial.late_payment_percentage > 25) finRisk += 10;
  else if (financial.late_payment_percentage > 10) finRisk += 5;

  const financialRiskScore = Math.min(100, finRisk);

  // 3. Cybersecurity Risk Score (0-100)
  let cyberRisk = 0;
  if (!cyber.mfa_enabled) cyberRisk += 25;
  if (!cyber.password_policy_enabled) cyberRisk += 10;
  
  if (cyber.backup_status === 'none') cyberRisk += 20;
  else if (cyber.backup_status === 'outdated') cyberRisk += 10;

  if (!cyber.endpoint_protection) cyberRisk += 15;
  
  cyberRisk += Math.min(15, cyber.phishing_incidents_count * 5);
  cyberRisk += Math.min(15, cyber.open_vulnerabilities_count * 3);

  if (cyber.patch_status === 'critical_missing') cyberRisk += 15;
  else if (cyber.patch_status === 'outdated') cyberRisk += 7;

  // Security awareness completion weight
  cyberRisk += (100 - cyber.security_awareness_completion) * 0.15;

  const cyberRiskScore = Math.round(Math.min(100, cyberRisk));

  // 4. Overall Business Health (0-100)
  // Combination of safety scores: Health is the inverse of risk.
  const overallHealthScore = Math.round(
    Math.max(0, 100 - (financialRiskScore * 0.5 + cyberRiskScore * 0.5))
  );

  // 5. Generate human explanations
  const explanations = {
    currentRatio: currentRatio < 1.0
      ? `Your current ratio of ${currentRatio} is critical. You do not have enough short-term assets to cover immediate liabilities, indicating a severe liquidity risk.`
      : currentRatio < 1.5
      ? `Your current ratio is ${currentRatio}. This is a moderate liquidity buffer, but you may face cash squeezes under sudden market shifts.`
      : `Your current ratio of ${currentRatio} is healthy. Your short-term assets comfortably exceed liabilities.`,

    quickRatio: quickRatio < 0.8
      ? `Quick ratio of ${quickRatio} indicates that without selling inventory, you cannot meet short-term debt, creating immediate pressure on cash flow.`
      : quickRatio < 1.0
      ? `Quick ratio is ${quickRatio}. Solid, but a high percentage of liquidity is tied up in inventory which might not sell immediately.`
      : `Quick ratio is ${quickRatio}, indicating exceptional liquidity even when excluding inventory.`,

    debtRatio: debtRatio > 0.6
      ? `With a debt ratio of ${Math.round(debtRatio * 100)}%, your company is highly leveraged. Creditors hold the majority of your assets, making future borrowing harder.`
      : debtRatio > 0.4
      ? `Debt ratio is ${Math.round(debtRatio * 100)}%. Moderate leverage. Stable, but monitor interest commitments closely.`
      : `Debt ratio of ${Math.round(debtRatio * 100)}% is very low, showing high solvency and capital independence.`,

    cashRunway: cashRunway < 3
      ? `Critical: Your cash runway is only ${cashRunway} months. At the current burn rate, you will run out of cash unless revenue increases or expenses are cut immediately.`
      : cashRunway < 6
      ? `Your cash runway is ${cashRunway} months. This is a standard but tight runway. Plan your funding or revenue growth options now.`
      : `With a cash runway of ${cashRunway} months, your business is well capitalized and has adequate breathing room for R&D/growth.`,

    workingCapital: workingCapital < 0
      ? `Working capital is negative at $${workingCapital.toLocaleString()}. You are relying on supplier extensions or credit to keep daily operations active.`
      : `You have $${workingCapital.toLocaleString()} in net working capital, which is sufficient to cover day-to-day operational costs comfortably.`,

    customerConcentration: financial.customer_concentration > 35
      ? `High client concentration: ${financial.customer_concentration}% of revenue comes from a single customer. If this client leaves, your cash runway could evaporate.`
      : `Healthy customer diversification, with your top client accounting for less than ${financial.customer_concentration}% of total revenue.`,

    vendorConcentration: financial.vendor_concentration > 40
      ? `High vendor dependency: ${financial.vendor_concentration}% of your vendor expenses flow to one partner. A supply-chain breach or price hike poses a high threat.`
      : `Vendor dependency is well diversified, buffering you against individual vendor supplier shocks.`,

    operationalRisk: cyberRiskScore > 50
      ? `Cybersecurity gaps are driving up your operational risk. Outdated software and missing MFA can expose critical financial data to hackers, triggering costly downtime.`
      : `Cybersecurity practices are solid, keeping operational downtime risks low. Ensure continuous security training for all staff.`
  };

  return {
    currentRatio,
    quickRatio,
    debtRatio,
    cashRunway,
    workingCapital,
    financialRiskScore,
    cyberRiskScore,
    overallHealthScore,
    explanations
  };
}
