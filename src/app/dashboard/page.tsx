'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building, 
  Plus, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Upload, 
  TrendingUp, 
  Shield, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  PlusCircle,
  Play,
  Sparkles,
  CornerDownRight,
  Send,
  Pin,
  Edit,
  Activity,
  ChevronRight,
  Clock,
  DollarSign,
  CreditCard,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronLeft,
  Filter,
  Factory,
  ShoppingCart,
  Stethoscope,
  Zap,
  BookOpen,
  Target,
  Folder,
  Check,
  X,
  Layers,
  BarChart3
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import RiskGauge from '@/components/RiskGauge';
import Chatbot from '@/components/Chat/Chatbot';
import DailyTrackerTab from '@/components/DailyTracker/DailyTrackerTab';
import StressSimulatorTab from '@/components/StressSimulator/StressSimulatorTab';
import InsuranceReadinessTab from '@/components/Insurance/InsuranceReadinessTab';
import { computeMetrics, ComputedRatios } from '@/lib/formulas';
import { ClientProfile, Transaction, Vendor, DocumentMeta, DEFAULT_SCENARIOS, Scenario } from '@/lib/seedData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

function parseBoldOnly(text: string): (string | React.ReactNode)[] {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: (string | React.ReactNode)[] = [];
  let bLast = 0;
  let bMatch;
  while ((bMatch = boldRegex.exec(text)) !== null) {
    if (bMatch.index > bLast) {
      parts.push(text.substring(bLast, bMatch.index));
    }
    parts.push(<strong key={`b-only-${bMatch.index}`} className="font-bold text-white">{bMatch[1]}</strong>);
    bLast = boldRegex.lastIndex;
  }
  if (bLast < text.length) {
    parts.push(text.substring(bLast));
  }
  return parts.length > 0 ? parts : [text];
}

function parseInlineFormatting(text: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  
  const linkMatches: { start: number; end: number; text: string; url: string }[] = [];
  let match;
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    linkMatches.push({
      start: match.index,
      end: linkRegex.lastIndex,
      text: match[1],
      url: match[2]
    });
  }
  
  if (linkMatches.length === 0) {
    return parseBoldOnly(text);
  }
  
  let scanIdx = 0;
  linkMatches.forEach((lm, lmIdx) => {
    if (lm.start > scanIdx) {
      const slice = text.substring(scanIdx, lm.start);
      parts.push(...parseBoldOnly(slice));
    }
    parts.push(
      <a 
        key={`link-${lmIdx}`}
        href={lm.url}
        target={lm.url.startsWith('http') ? '_blank' : undefined}
        rel={lm.url.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-1 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/40 hover:bg-indigo-900/30 transition-all cursor-pointer"
      >
        {lm.text}
      </a>
    );
    scanIdx = lm.end;
  });
  
  if (scanIdx < text.length) {
    const slice = text.substring(scanIdx);
    parts.push(...parseBoldOnly(slice));
  }
  
  return parts;
}

function renderMarkdownContent(content: string) {
  if (!content) return null;
  const lines = content.split('\n');
  
  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();
        
        // Handle headings: #, ##, ###, ####
        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2];
            const sizeClass = 
              level === 1 ? 'text-sm font-extrabold text-white mt-3 mb-1 block' :
              level === 2 ? 'text-xs font-bold text-white mt-2 mb-1 block' :
              'text-[10px] font-bold text-gray-200 mt-1.5 mb-0.5 block uppercase tracking-wider';
            return (
              <span key={lineIdx} className={sizeClass}>
                {parseInlineFormatting(text)}
              </span>
            );
          }
        }
        
        // Handle lists: * or -
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.substring(2);
          return (
            <div key={lineIdx} className="flex gap-1.5 items-start pl-1 mt-0.5">
              <span className="text-indigo-400 mt-1.5 shrink-0 text-[8px]">▪</span>
              <span className="text-xs text-gray-300 leading-relaxed font-semibold">
                {parseInlineFormatting(text)}
              </span>
            </div>
          );
        }

        // Default: normal line
        if (trimmed === '') {
          return <div key={lineIdx} className="h-1" />;
        }
        
        return (
          <p key={lineIdx} className="text-xs text-gray-300 leading-relaxed font-semibold">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

const formatLargeMoney = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  return `$${value.toLocaleString()}`;
};

const formatChartValue = (v: number): string => {
  if (v >= 1_000_000_000) {
    return `$${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (v >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (v >= 1000) {
    return `$${(v / 1000).toFixed(0)}k`;
  }
  return `$${v}`;
};

const SIMULATIONS = [
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-gray-400">Loading MSP workspaces...</span>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeClientId = searchParams.get('client') || 'client-acme';
  
  // State
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [activeClient, setActiveClient] = useState<ClientProfile | null>(null);
  const [computed, setComputed] = useState<ComputedRatios | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('analyst');
  const [activeSim, setActiveSim] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'form' | 'calculating' | 'result'>('form');
  const [newClientScores, setNewClientScores] = useState<any>(null);

  const getSimulatedClient = (client: ClientProfile | null, simId: string | null) => {
    if (!client) return null;
    if (!simId) return client;
    const cloned = JSON.parse(JSON.stringify(client)) as ClientProfile;
    if (simId === 'low-runway-vendor') {
      cloned.financialMetrics.cash_balance = 15000;
      cloned.financialMetrics.monthly_burn_rate = 60000;
      cloned.financialMetrics.vendor_concentration = 48;
    } else if (simId === 'phishing-mfa-off') {
      cloned.cyberMetrics.mfa_enabled = false;
      cloned.cyberMetrics.phishing_incidents_count = 12;
    } else if (simId === 'vendor-near-expiry-risky') {
      cloned.vendors = [
        {
          id: 'v-sim',
          name: 'Apex Outsourcing Partner',
          criticality: 'critical',
          payment_history: 'delayed',
          security_score: 42,
          contract_renewal: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          country: 'RU'
        }
      ];
    } else if (simId === 'revenue-collapse-burn') {
      cloned.financialMetrics.monthly_revenue = 5000;
      cloned.financialMetrics.monthly_burn_rate = 55000;
      cloned.financialMetrics.net_income = -50000;
    } else if (simId === 'dr-backup-failed') {
      cloned.cyberMetrics.backup_status = 'none';
      cloned.cyberMetrics.open_vulnerabilities_count = 9;
    } else if (simId === 'geo-political-sanctions') {
      cloned.vendors = [
        {
          id: 'v-sim2',
          name: 'EastSourcing Corp LLC',
          criticality: 'critical',
          payment_history: 'good',
          security_score: 58,
          contract_renewal: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          country: 'RU'
        }
      ];
    } else if (simId === 'insider-threat-leak') {
      cloned.cyberMetrics.security_awareness_completion = 15;
      cloned.cyberMetrics.open_vulnerabilities_count = 14;
    } else if (simId === 'inflation-material-squeeze') {
      cloned.financialMetrics.monthly_burn_rate = Math.round(cloned.financialMetrics.monthly_burn_rate * 1.5);
      cloned.financialMetrics.late_payment_percentage = 45;
    } else if (simId === 'regulatory-non-compliance') {
      cloned.financialMetrics.cash_balance = Math.max(0, cloned.financialMetrics.cash_balance - 150000);
      cloned.cyberMetrics.backup_status = 'none';
    }
    return cloned;
  };

  const simulatedActiveClient = getSimulatedClient(activeClient, activeSim) || activeClient;

  // AI Advisor State
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorData, setAdvisorData] = useState<{
    summary: string;
    recommendations: string[];
    financialWarnings: string[];
    cybersecurityWarnings: string[];
    nextActions: string[];
  } | null>(null);

  // Modal / Onboarding Form States
  const [showAddClient, setShowAddClient] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [parsingFinancial, setParsingFinancial] = useState(false);
  
  const [showEditClient, setShowEditClient] = useState(false);
  const [editOnboardingStep, setEditOnboardingStep] = useState(1);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editObData, setEditObData] = useState<any>({
    companyName: '',
    industry: 'Manufacturing',
    businessDescription: '',
    yearFounded: '',
    hqLocation: '',
    numEmployees: 15,
    annualRevenue: '',
    estimatedExpenses: '',
    numLocations: 1,
    publicOrPrivate: 'private',
    website: '',
    primaryContact: '',
    primaryProducts: '',
    numCustomers: 25,
    largestCustomerPercentage: 15,
    numVendors: 8,
    criticalVendors: '',
    operatingHours: '09:00 - 17:00',
    remotePercentage: 20,
    cloudProviders: 'AWS',
    accountingSoftware: 'QuickBooks',
    bankingInstitution: 'Silicon Valley Bank',
    cyberInsurance: 'yes',
    cashBalance: 85000,
    monthlyExpenses: 20000,
    monthlyRevenue: 35000,
    existingDebt: 50000,
    accountsReceivable: 12000,
    accountsPayable: 8000,
    mfaEnabled: 'yes',
    passwordPolicyEnabled: 'yes',
    endpointProtection: 'yes',
    backupSolution: 'active',
    disasterRecoveryPlan: 'yes',
    securityTrainingCompletion: 80,
    patchManagementEnabled: 'yes',
    numCriticalVulnerabilities: 0,
    complianceCertifications: 'SOC2',
    biggestConcerns: '',
    primaryObjectives: '',
    expectedGrowth: '',
    plannedTechInvestments: '',
    plannedHiring: '',
    expansionPlans: ''
  });
  
  const [obData, setObData] = useState({
    companyName: '',
    industry: 'Manufacturing',
    businessDescription: '',
    yearFounded: '',
    hqLocation: '',
    numEmployees: 15,
    annualRevenue: '',
    estimatedExpenses: '',
    numLocations: 1,
    publicOrPrivate: 'private' as 'public' | 'private',
    website: '',
    primaryContact: '',

    primaryProducts: '',
    numCustomers: 25,
    largestCustomerPercentage: 15,
    numVendors: 8,
    criticalVendors: '',
    operatingHours: '09:00 - 17:00',
    remotePercentage: 20,
    cloudProviders: 'AWS',
    accountingSoftware: 'QuickBooks',
    bankingInstitution: 'Silicon Valley Bank',
    cyberInsurance: 'yes' as 'yes' | 'no',

    cashBalance: 85000,
    monthlyExpenses: 20000,
    monthlyRevenue: 35000,
    existingDebt: 50000,
    accountsReceivable: 12000,
    accountsPayable: 8000,

    mfaEnabled: 'yes' as 'yes' | 'no',
    passwordPolicyEnabled: 'yes' as 'yes' | 'no',
    endpointProtection: 'yes' as 'yes' | 'no',
    backupSolution: 'active' as 'active' | 'outdated' | 'none',
    disasterRecoveryPlan: 'yes' as 'yes' | 'no',
    securityTrainingCompletion: 80,
    patchManagementEnabled: 'yes' as 'yes' | 'no',
    numCriticalVulnerabilities: 0,
    complianceCertifications: 'SOC2',

    biggestConcerns: '',
    primaryObjectives: '',
    expectedGrowth: '',
    plannedTechInvestments: '',
    plannedHiring: '',
    expansionPlans: ''
  });

  const runwayMissing = obData.cashBalance === 0 || obData.monthlyExpenses === 0;
  const currentRatioMissing = obData.accountsPayable === 0;
  const quickRatioMissing = (obData.cashBalance + obData.accountsReceivable) === 0 || obData.accountsPayable === 0;
  const debtRatioMissing = obData.existingDebt === 0;
  const hasMissingRatios = runwayMissing || currentRatioMissing || quickRatioMissing || debtRatioMissing;
  
  // Tab control (read from URL search parameter, default to dashboard)
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Load clients & verify auth
  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
      
      const active = data.find((c: any) => c.id === activeClientId) || data[0];
      if (active) {
        setActiveClient(active);
        const comp = computeMetrics(active.financialMetrics, active.cyberMetrics);
        setComputed(comp);
      }
    } catch (e) {
      console.error('Failed to load clients:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check local storage for simple auth
    const role = localStorage.getItem('riskpulse_role');
    if (!role) {
      router.push('/login');
      return;
    }
    setUserRole(role);
    loadClients();
  }, [activeClientId, router]);

  // Recalculate computed ratios when active client or active simulation updates
  useEffect(() => {
    if (activeClient) {
      const simulated = getSimulatedClient(activeClient, activeSim);
      if (simulated) {
        const comp = computeMetrics(simulated.financialMetrics, simulated.cyberMetrics);
        setComputed(comp);
      }
    }
  }, [activeClient, activeSim]);

  const handleSelectClient = (clientId: string) => {
    const target = clients.find(c => c.id === clientId);
    if (target) {
      setActiveClient(target);
      const comp = computeMetrics(target.financialMetrics, target.cyberMetrics);
      setComputed(comp);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('client', clientId);
    router.push(`/dashboard?${params.toString()}`);
  };

  if (loading || !activeClient || !computed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-gray-400">Loading MSP workspaces...</span>
        </div>
      </div>
    );
  }

  // Handle Financial Statement Parsing and prefilling
  const handleParseFinancialFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFinancial(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-financial', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.metrics) {
        setObData(prev => ({
          ...prev,
          companyName: data.companyName || prev.companyName || 'Extracted Client',
          industry: data.industry || prev.industry || 'Technology',
          cashBalance: data.metrics.cashBalance,
          monthlyExpenses: data.metrics.monthlyExpenses,
          monthlyRevenue: data.metrics.monthlyRevenue,
          existingDebt: data.metrics.existingDebt,
          accountsReceivable: data.metrics.accountsReceivable,
          accountsPayable: data.metrics.accountsPayable
        }));
      } else {
        alert(data.error || 'Failed to extract metrics from statement.');
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing statement file.');
    } finally {
      setParsingFinancial(false);
      e.target.value = '';
    }
  };

  // Handle Client Add Onboarding Submit
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obData.companyName) return;

    setOnboardingStatus('calculating');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: obData.companyName,
          industry: obData.industry,
          businessProfile: obData
        })
      });
      const data = await res.json();
      
      // Calculate scores on the fly
      const comp = computeMetrics(data.financialMetrics, data.cyberMetrics);
      
      // Build detailed CFO and CISO explanations
      const runwayVal = data.financialMetrics.monthly_burn_rate > 0 
        ? (data.financialMetrics.cash_balance / data.financialMetrics.monthly_burn_rate).toFixed(1)
        : '99+';
      const curRatio = data.financialMetrics.current_liabilities > 0
        ? (data.financialMetrics.current_assets / data.financialMetrics.current_liabilities).toFixed(2)
        : '99+';
      const qkRatio = data.financialMetrics.current_liabilities > 0
        ? ((data.financialMetrics.cash_balance + data.financialMetrics.outstanding_receivables) / data.financialMetrics.current_liabilities).toFixed(2)
        : '99+';
      const debtRatioVal = data.financialMetrics.current_assets > 0
        ? ((data.financialMetrics.total_debt / data.financialMetrics.current_assets) * 100).toFixed(0)
        : '0';

      const finExpls = [
        `Cash Runway is ${runwayVal} months (Target: >12 months). ${Number(runwayVal) < 3 ? 'Critical runway level (< 3 months) adds 25 risk points.' : Number(runwayVal) < 6 ? 'Warning runway level (< 6 months) adds 12 risk points.' : 'Healthy runway keeps operating reserves safe.'}`,
        `Current Ratio is ${curRatio} (Target: >1.5). ${Number(curRatio) < 1.0 ? 'Critical current ratio (< 1.0) indicates high immediate cash crush, adding 25 points.' : Number(curRatio) < 1.5 ? 'Caution ratio level (< 1.5) adds 12 points.' : 'Healthy assets cover current obligations.'}`,
        `Quick Ratio is ${qkRatio} (Target: >1.0). ${Number(qkRatio) < 0.8 ? 'Insufficient quick assets (< 0.8) to meet liabilities adds 15 points.' : Number(qkRatio) < 1.0 ? 'Caution quick ratio (< 1.0) adds 8 points.' : 'Sufficient quick liquidity is maintained.'}`,
        `Debt-to-Assets is ${debtRatioVal}% (Target: <50%). ${Number(debtRatioVal) > 70 ? 'Extreme leverage (>70%) adds 20 risk points.' : Number(debtRatioVal) > 50 ? 'Moderate leverage (>50%) adds 10 points.' : 'Healthy leverage profile.'}`
      ];

      const cybExpls = [
        `MFA Status: ${data.cyberMetrics.mfa_enabled ? 'Enforced' : 'Disabled'}. ${data.cyberMetrics.mfa_enabled ? 'Strong identity control prevents unauthorized portal logins.' : 'Disabled MFA is a critical security vulnerability that adds 25 risk points.'}`,
        `Backup System: ${data.cyberMetrics.backup_status}. ${data.cyberMetrics.backup_status === 'active' ? 'Active daily backups insulate the firm against data loss.' : data.cyberMetrics.backup_status === 'none' ? 'No backup configuration adds 20 risk points and leaves systems vulnerable to ransomware data loss.' : 'Outdated backups add 10 risk points.'}`,
        `Employee Awareness Training: ${data.cyberMetrics.security_awareness_completion}% completed. ${data.cyberMetrics.security_awareness_completion < 70 ? `Low training completion (< 70%) adds ${Math.round(15 * (1 - data.cyberMetrics.security_awareness_completion/100))} risk points due to phishing susceptibility.` : 'Healthy security awareness minimizes human traps.'}`
      ];

      const overallRating = comp.overallHealthScore > 80 ? 'Excellent / Low Risk' : comp.overallHealthScore > 50 ? 'Moderate Risk' : 'Critical / High Risk';

      setTimeout(() => {
        setNewClientScores({
          client: data,
          computed: comp,
          overallRating,
          finExplain: finExpls,
          cybExplain: cybExpls
        });
        setOnboardingStatus('result');
      }, 2500);
      
    } catch (e) {
      console.error(e);
      alert('Error creating client onboarding profile.');
      setOnboardingStatus('form');
    }
  };

  const handleOnboardingFinish = () => {
    setOnboardingStatus('form');
    setShowAddClient(false);
    setOnboardingStep(1);
    // Reset form
    setObData({
      companyName: '',
      industry: 'Manufacturing',
      businessDescription: '',
      yearFounded: '',
      hqLocation: '',
      numEmployees: 15,
      annualRevenue: '',
      estimatedExpenses: '',
      numLocations: 1,
      publicOrPrivate: 'private',
      website: '',
      primaryContact: '',
      primaryProducts: '',
      numCustomers: 25,
      largestCustomerPercentage: 15,
      numVendors: 8,
      criticalVendors: '',
      operatingHours: '09:00 - 17:00',
      remotePercentage: 20,
      cloudProviders: 'AWS',
      accountingSoftware: 'QuickBooks',
      bankingInstitution: 'Silicon Valley Bank',
      cyberInsurance: 'yes',
      cashBalance: 85000,
      monthlyExpenses: 20000,
      monthlyRevenue: 35000,
      existingDebt: 50000,
      accountsReceivable: 12000,
      accountsPayable: 8000,
      mfaEnabled: 'yes',
      passwordPolicyEnabled: 'yes',
      endpointProtection: 'yes',
      backupSolution: 'active',
      disasterRecoveryPlan: 'yes',
      securityTrainingCompletion: 80,
      patchManagementEnabled: 'yes',
      numCriticalVulnerabilities: 0,
      complianceCertifications: 'SOC2',
      biggestConcerns: '',
      primaryObjectives: '',
      expectedGrowth: '',
      plannedTechInvestments: '',
      plannedHiring: '',
      expansionPlans: ''
    });
    
    // Select newly created client as active
    if (newClientScores && newClientScores.client) {
      loadClients();
      router.push(`/dashboard?client=${newClientScores.client.id}&tab=dashboard`);
    }
    setNewClientScores(null);
  };

  // Handle Edit Client trigger
  const handleEditClientClick = (clientToEdit?: ClientProfile) => {
    if (userRole !== 'admin') {
      alert('Action Denied: MSP Analyst does not have edit administrative permissions.');
      return;
    }
    const target = clientToEdit || activeClient;
    if (!target) return;

    setEditingClientId(target.id);
    
    const bp = target.businessProfile || {
      companyName: target.name,
      industry: target.industry,
      businessDescription: '',
      yearFounded: '',
      hqLocation: '',
      numEmployees: 15,
      annualRevenue: '',
      estimatedExpenses: '',
      numLocations: 1,
      publicOrPrivate: 'private',
      website: '',
      primaryContact: '',
      primaryProducts: '',
      numCustomers: 25,
      largestCustomerPercentage: 15,
      numVendors: 8,
      criticalVendors: '',
      operatingHours: '09:00 - 17:00',
      remotePercentage: 20,
      cloudProviders: 'AWS',
      accountingSoftware: 'QuickBooks',
      bankingInstitution: 'Silicon Valley Bank',
      cyberInsurance: 'yes',
      cashBalance: target.financialMetrics.cash_balance,
      monthlyExpenses: target.financialMetrics.monthly_burn_rate,
      monthlyRevenue: target.financialMetrics.monthly_revenue,
      existingDebt: target.financialMetrics.total_debt,
      accountsReceivable: target.financialMetrics.outstanding_receivables,
      accountsPayable: target.financialMetrics.upcoming_obligations,
      mfaEnabled: target.cyberMetrics.mfa_enabled ? 'yes' : 'no',
      passwordPolicyEnabled: target.cyberMetrics.password_policy_enabled ? 'yes' : 'no',
      endpointProtection: target.cyberMetrics.endpoint_protection ? 'yes' : 'no',
      backupSolution: target.cyberMetrics.backup_status,
      disasterRecoveryPlan: 'yes',
      securityTrainingCompletion: target.cyberMetrics.security_awareness_completion,
      patchManagementEnabled: target.cyberMetrics.patch_status === 'current' ? 'yes' : 'no',
      numCriticalVulnerabilities: target.cyberMetrics.open_vulnerabilities_count,
      complianceCertifications: 'SOC2',
      biggestConcerns: '',
      primaryObjectives: '',
      expectedGrowth: '',
      plannedTechInvestments: '',
      plannedHiring: '',
      expansionPlans: ''
    };

    setEditObData({
      ...bp,
      companyName: bp.companyName || target.name,
      industry: bp.industry || target.industry,
      cashBalance: bp.cashBalance !== undefined ? bp.cashBalance : target.financialMetrics.cash_balance,
      monthlyExpenses: bp.monthlyExpenses !== undefined ? bp.monthlyExpenses : target.financialMetrics.monthly_burn_rate,
      monthlyRevenue: bp.monthlyRevenue !== undefined ? bp.monthlyRevenue : target.financialMetrics.monthly_revenue,
      existingDebt: bp.existingDebt !== undefined ? bp.existingDebt : target.financialMetrics.total_debt,
      accountsReceivable: bp.accountsReceivable !== undefined ? bp.accountsReceivable : target.financialMetrics.outstanding_receivables,
      accountsPayable: bp.accountsPayable !== undefined ? bp.accountsPayable : target.financialMetrics.upcoming_obligations,
      mfaEnabled: bp.mfaEnabled || (target.cyberMetrics.mfa_enabled ? 'yes' : 'no'),
      passwordPolicyEnabled: bp.passwordPolicyEnabled || (target.cyberMetrics.password_policy_enabled ? 'yes' : 'no'),
      endpointProtection: bp.endpointProtection || (target.cyberMetrics.endpoint_protection ? 'yes' : 'no'),
      backupSolution: bp.backupSolution || target.cyberMetrics.backup_status,
      securityTrainingCompletion: bp.securityTrainingCompletion !== undefined ? bp.securityTrainingCompletion : target.cyberMetrics.security_awareness_completion,
      patchManagementEnabled: bp.patchManagementEnabled || (target.cyberMetrics.patch_status === 'current' ? 'yes' : 'no'),
      numCriticalVulnerabilities: bp.numCriticalVulnerabilities !== undefined ? bp.numCriticalVulnerabilities : target.cyberMetrics.open_vulnerabilities_count,
    });
    setEditOnboardingStep(1);
    setShowEditClient(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObData.companyName || !editingClientId) return;

    try {
      const res = await fetch(`/api/clients/${editingClientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessProfile: editObData
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update client profile');
      }

      setShowEditClient(false);
      setEditingClientId(null);
      await loadClients();
      alert('Client profile updated successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to update client profile.');
    }
  };

  const handleDeleteClientClick = async (idToDelete?: string) => {
    if (userRole !== 'admin') {
      alert('Action Denied: MSP Analyst does not have delete administrative permissions.');
      return;
    }
    const targetId = idToDelete || activeClient.id;
    const targetClient = clients.find(c => c.id === targetId);
    const targetName = targetClient ? targetClient.name : 'this client';
    
    if (!confirm(`Are you sure you want to permanently delete client profile "${targetName}"? This will delete all associated metrics, documents, and logs.`)) return;

    try {
      const res = await fetch(`/api/clients/${targetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Refresh clients list, select another client
        const resList = await fetch('/api/clients');
        const data = await resList.json();
        setClients(data);
        
        const remaining = data.filter((c: any) => c.id !== targetId);
        const nextActive = remaining[0] || null;
        if (targetId === activeClient.id) {
          if (nextActive) {
            router.push(`/dashboard?client=${nextActive.id}&tab=dashboard`);
          } else {
            setActiveClient(null);
            setComputed(null);
            router.push(`/dashboard?tab=admin`);
          }
        }
        alert('Client deleted successfully.');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to delete client.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while deleting the client.');
    }
  };

  // Generate Report Trigger
  const handleDownloadReport = () => {
    window.open(`/api/report?clientId=${activeClient.id}`, '_blank');
  };

  // Run AI Advisor analysis
  const runAiAdvisor = async () => {
    setAdvisorLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: activeClient.id })
      });
      const data = await res.json();
      setAdvisorData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar Navigation */}
      <Sidebar 
        clients={clients} 
        activeClientId={activeClient.id} 
        onAddClient={() => setShowAddClient(true)} 
        onEditClient={handleEditClientClick}
        onDeleteClient={handleDeleteClientClick}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="h-16 border-b border-gray-800 px-8 flex items-center justify-between bg-gray-900/60 sticky top-0 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-white capitalize">{currentTab.replace('-', ' ')}</h2>
            <span className="text-xs py-1 px-2.5 rounded bg-indigo-900/40 text-indigo-400 font-semibold border border-indigo-850/50">
              {activeClient.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadReport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Download size={14} />
              <span>Download PDF Report</span>
            </button>
            
            <button
              onClick={() => router.push('/login')}
              className="text-xs font-semibold text-gray-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Active Simulation Alert Banner */}
        {activeSim && (
          <div className="bg-amber-955/20 border-b border-amber-900/40 px-8 py-3 flex items-center justify-between text-xs text-amber-300 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>
                <strong>Simulation Active:</strong> Currently running <em>"{SIMULATIONS.find(s => s.id === activeSim)?.title}"</em> stress test. Operational metrics, cyber scores, and matched playbooks are overridden.
              </span>
            </div>
            <button
              onClick={() => setActiveSim(null)}
              className="bg-amber-900/45 hover:bg-amber-900/60 text-amber-250 font-bold px-3 py-1 rounded border border-amber-800/50 transition-all cursor-pointer"
            >
              End Simulation
            </button>
          </div>
        )}

        {/* Tab content panel */}
        <div className="flex-1 p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              advisorData={advisorData}
              advisorLoading={advisorLoading}
              onRunAdvisor={runAiAdvisor}
              onResetAdvisor={() => setAdvisorData(null)}
            />
          )}
          {currentTab === 'simulator' && (
            <StressSimulatorTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
            />
          )}
          {currentTab === 'insurance' && (
            <InsuranceReadinessTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              onUpdate={loadClients}
            />
          )}
          {currentTab === 'daily' && (
            <DailyTrackerTab 
              client={simulatedActiveClient || activeClient} 
              onUpdateClient={loadClients} 
              userRole={userRole} 
            />
          )}
          {currentTab === 'situational' && (
            <SituationalTab 
              activeClient={simulatedActiveClient || activeClient} 
              activeSim={activeSim}
              setActiveSim={setActiveSim}
              computed={computed}
              setComputed={setComputed}
              clients={clients}
              onSelectClient={handleSelectClient}
            />
          )}
          {currentTab === 'financials' && (
            <FinancialsTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              onUpdate={loadClients} 
            />
          )}
          {currentTab === 'cybersecurity' && (
            <CybersecurityTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              onUpdate={loadClients} 
            />
          )}
          {currentTab === 'vendors' && (
            <VendorsTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              onUpdate={loadClients} 
            />
          )}
          {currentTab === 'fraud' && (
            <FraudTab 
              activeClient={simulatedActiveClient || activeClient} 
              computed={computed} 
              onUpdate={loadClients} 
            />
          )}
          {currentTab === 'documents' && (
            <DocumentsTab 
              activeClient={simulatedActiveClient || activeClient} 
              onUpdate={loadClients} 
              userRole={userRole}
            />
          )}
          {currentTab === 'admin' && (
            <AdminTab 
              clients={clients} 
              onUpdate={loadClients} 
              userRole={userRole} 
              onEditClient={handleEditClientClick}
              onDeleteClient={handleDeleteClientClick}
            />
          )}
        </div>
      </main>

      {/* Floating RAG Assistant Chatbot */}
      <Chatbot clientId={activeClient.id} clientName={activeClient.name} />

      {/* Add Client Dialog Modal (Intelligent Onboarding Guided 5-Step Process) */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md overflow-y-auto py-8 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in duration-200">
            {onboardingStatus === 'form' && (
              <>
                {/* Header with Step Tracker */}
                <div className="border-b border-gray-800 p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Intelligent Client Onboarding</h3>
                  <p className="text-xs text-gray-500 mb-6">Complete the steps below to initialize the AI Risk assessment profile.</p>
              
              {/* Progress Indicator */}
              <div className="grid grid-cols-5 gap-2 relative">
                {[
                  { step: 1, label: 'Company Info' },
                  { step: 2, label: 'Operations' },
                  { step: 3, label: 'Financials' },
                  { step: 4, label: 'Cybersecurity' },
                  { step: 5, label: 'Business Goals' }
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                      onboardingStep === s.step ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110' :
                      onboardingStep > s.step ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                      'bg-gray-950 border-gray-850 text-gray-500'
                    }`}>
                      {onboardingStep > s.step ? <Check size={14} className="stroke-[3]" /> : s.step}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 text-center transition-colors duration-300 ${
                      onboardingStep === s.step ? 'text-indigo-400' :
                      onboardingStep > s.step ? 'text-emerald-500' : 'text-gray-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content Scroll Region */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* STEP 1: Company Information */}
              {onboardingStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 1 - Company Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={obData.companyName}
                        onChange={(e) => setObData({ ...obData, companyName: e.target.value })}
                        placeholder="e.g. Stark Labs Inc"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Industry Sector</label>
                      <select
                        value={obData.industry}
                        onChange={(e) => setObData({ ...obData, industry: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option>Manufacturing</option>
                        <option>Technology</option>
                        <option>Consumer Retail</option>
                        <option>Healthcare</option>
                        <option>Clean Tech</option>
                        <option>Professional Services</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Description</label>
                    <textarea
                      rows={2}
                      value={obData.businessDescription}
                      onChange={(e) => setObData({ ...obData, businessDescription: e.target.value })}
                      placeholder="e.g. Cloud software vendor developing HIPAA compliant clinical tools."
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Year Founded</label>
                      <input
                        type="text"
                        value={obData.yearFounded}
                        onChange={(e) => setObData({ ...obData, yearFounded: e.target.value })}
                        placeholder="e.g. 2018"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">HQ Location</label>
                      <input
                        type="text"
                        value={obData.hqLocation}
                        onChange={(e) => setObData({ ...obData, hqLocation: e.target.value })}
                        placeholder="e.g. Austin, TX"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Employees</label>
                      <input
                        type="number"
                        value={obData.numEmployees}
                        onChange={(e) => setObData({ ...obData, numEmployees: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Number of Sites/Locations</label>
                      <input
                        type="number"
                        value={obData.numLocations}
                        onChange={(e) => setObData({ ...obData, numLocations: parseInt(e.target.value, 10) || 1 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ownership Type</label>
                      <select
                        value={obData.publicOrPrivate}
                        onChange={(e) => setObData({ ...obData, publicOrPrivate: e.target.value as 'public' | 'private' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="private">Private Company</option>
                        <option value="public">Publicly Traded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Website URL</label>
                      <input
                        type="text"
                        value={obData.website}
                        onChange={(e) => setObData({ ...obData, website: e.target.value })}
                        placeholder="e.g. website.com"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Contact Details</label>
                    <input
                      type="text"
                      value={obData.primaryContact}
                      onChange={(e) => setObData({ ...obData, primaryContact: e.target.value })}
                      placeholder="e.g. Alice Smith (CEO, alice@stark.com)"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Operations */}
              {onboardingStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 2 - Operations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Products/Services</label>
                      <input
                        type="text"
                        value={obData.primaryProducts}
                        onChange={(e) => setObData({ ...obData, primaryProducts: e.target.value })}
                        placeholder="e.g. Precision components"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operating Business Hours</label>
                      <input
                        type="text"
                        value={obData.operatingHours}
                        onChange={(e) => setObData({ ...obData, operatingHours: e.target.value })}
                        placeholder="e.g. 08:00 - 18:00"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Number of Customers</label>
                      <input
                        type="number"
                        value={obData.numCustomers}
                        onChange={(e) => setObData({ ...obData, numCustomers: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Top Client Share (%) *</label>
                      <input
                        type="number"
                        max={100}
                        value={obData.largestCustomerPercentage}
                        onChange={(e) => setObData({ ...obData, largestCustomerPercentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Vendors</label>
                      <input
                        type="number"
                        value={obData.numVendors}
                        onChange={(e) => setObData({ ...obData, numVendors: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Critical Vendors Names</label>
                      <input
                        type="text"
                        value={obData.criticalVendors}
                        onChange={(e) => setObData({ ...obData, criticalVendors: e.target.value })}
                        placeholder="e.g. Iron Suppliers LLC, CloudTech"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remote Employees (%)</label>
                      <input
                        type="number"
                        max={100}
                        value={obData.remotePercentage}
                        onChange={(e) => setObData({ ...obData, remotePercentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cloud Providers Used</label>
                      <input
                        type="text"
                        value={obData.cloudProviders}
                        onChange={(e) => setObData({ ...obData, cloudProviders: e.target.value })}
                        placeholder="e.g. AWS, GCP"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ERP / Accounting Suite</label>
                      <input
                        type="text"
                        value={obData.accountingSoftware}
                        onChange={(e) => setObData({ ...obData, accountingSoftware: e.target.value })}
                        placeholder="e.g. NetSuite, QuickBooks"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Banking Institution</label>
                      <input
                        type="text"
                        value={obData.bankingInstitution}
                        onChange={(e) => setObData({ ...obData, bankingInstitution: e.target.value })}
                        placeholder="e.g. Chase Bank"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Maintain Cyber Insurance Coverage?</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer font-medium">
                        <input
                          type="radio"
                          value="yes"
                          checked={obData.cyberInsurance === 'yes'}
                          onChange={() => setObData({ ...obData, cyberInsurance: 'yes' })}
                          className="text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer font-medium">
                        <input
                          type="radio"
                          value="no"
                          checked={obData.cyberInsurance === 'no'}
                          onChange={() => setObData({ ...obData, cyberInsurance: 'no' })}
                          className="text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              )}              {/* STEP 3: Financial Information */}
              {onboardingStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 3 - Financial Information</h4>
                  
                  {/* Prefill Statement Uploader Drop Zone */}
                  <div className="border border-dashed border-gray-800 hover:border-indigo-500/60 bg-gray-950/40 rounded-xl p-6 text-center transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        {parsingFinancial ? (
                          <RefreshCw size={24} className="animate-spin text-indigo-400" />
                        ) : (
                          <Upload size={24} />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Auto-Extract Statement Ledger</span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">Drop Balance Sheet, Income Statement or Bank Statement PDF/DOCX</span>
                      </div>
                      
                      <label className="bg-gray-900 border border-gray-800 hover:bg-gray-850 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer block mt-2 shadow">
                        {parsingFinancial ? 'Scanning numbers...' : 'Browse Statement File'}
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          disabled={parsingFinancial}
                          onChange={handleParseFinancialFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Missing Ratio Input Checker Alerts */}
                  {hasMissingRatios && (
                    <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl space-y-2 animate-in fade-in duration-200">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                        Action Required: Missing Ratios Inputs
                      </span>
                      <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                        Some key risk ratios cannot be calculated from current inputs. Please enter or verify the highlighted details below:
                      </p>
                      <ul className="list-disc pl-4 text-[10px] text-amber-300/80 space-y-1 font-medium">
                        {runwayMissing && (
                          <li>Provide **Cash Balance** and **Monthly Expenses** to calculate **Cash Runway**.</li>
                        )}
                        {currentRatioMissing && (
                          <li>Provide **Accounts Payable** (Current Liabilities) to calculate **Current Ratio**.</li>
                        )}
                        {quickRatioMissing && (
                          <li>Provide **Cash Balance**, **Accounts Receivable**, and **Accounts Payable** to calculate **Quick Ratio**.</li>
                        )}
                        {debtRatioMissing && (
                          <li>Provide **Existing Debt** to calculate **Debt-to-Assets Ratio**.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cash Balance ($)</label>
                      <input
                        type="number"
                        value={obData.cashBalance}
                        onChange={(e) => setObData({ ...obData, cashBalance: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full bg-gray-955 border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium ${
                          obData.cashBalance === 0 && runwayMissing
                            ? 'border-amber-500/50 bg-amber-955/5 focus:border-amber-500'
                            : 'border-gray-800 bg-gray-950'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Operating Expenses ($)</label>
                      <input
                        type="number"
                        value={obData.monthlyExpenses}
                        onChange={(e) => setObData({ ...obData, monthlyExpenses: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full bg-gray-955 border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium ${
                          obData.monthlyExpenses === 0 && runwayMissing
                            ? 'border-amber-500/50 bg-amber-955/5 focus:border-amber-500'
                            : 'border-gray-800 bg-gray-950'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Revenue ($)</label>
                      <input
                        type="number"
                        value={obData.monthlyRevenue}
                        onChange={(e) => setObData({ ...obData, monthlyRevenue: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Existing Debt ($)</label>
                      <input
                        type="number"
                        value={obData.existingDebt}
                        onChange={(e) => setObData({ ...obData, existingDebt: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full bg-gray-955 border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium ${
                          obData.existingDebt === 0 && debtRatioMissing
                            ? 'border-amber-500/50 bg-amber-955/5 focus:border-amber-500'
                            : 'border-gray-800 bg-gray-950'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accounts Receivable ($)</label>
                      <input
                        type="number"
                        value={obData.accountsReceivable}
                        onChange={(e) => setObData({ ...obData, accountsReceivable: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full bg-gray-955 border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium ${
                          obData.accountsReceivable === 0 && quickRatioMissing
                            ? 'border-amber-500/50 bg-amber-955/5 focus:border-amber-500'
                            : 'border-gray-800 bg-gray-950'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accounts Payable ($)</label>
                      <input
                        type="number"
                        value={obData.accountsPayable}
                        onChange={(e) => setObData({ ...obData, accountsPayable: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full bg-gray-955 border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium ${
                          obData.accountsPayable === 0 && (currentRatioMissing || quickRatioMissing)
                            ? 'border-amber-500/50 bg-amber-955/5 focus:border-amber-500'
                            : 'border-gray-800 bg-gray-950'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Cybersecurity Assessment */}
              {onboardingStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 4 - Cybersecurity Assessment</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">MFA Enforced?</label>
                      <select
                        value={obData.mfaEnabled}
                        onChange={(e) => setObData({ ...obData, mfaEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (Enabled)</option>
                        <option value="no">No (Disabled)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Password Policy?</label>
                      <select
                        value={obData.passwordPolicyEnabled}
                        onChange={(e) => setObData({ ...obData, passwordPolicyEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (Enforced)</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endpoint Protection (EDR)?</label>
                      <select
                        value={obData.endpointProtection}
                        onChange={(e) => setObData({ ...obData, endpointProtection: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (EDR Active)</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Backup Solution</label>
                      <select
                        value={obData.backupSolution}
                        onChange={(e) => setObData({ ...obData, backupSolution: e.target.value as 'active' | 'outdated' | 'none' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="active">Active & Tested</option>
                        <option value="outdated">Outdated / Ad-hoc</option>
                        <option value="none">No Backup System</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Disaster Recovery Plan?</label>
                      <select
                        value={obData.disasterRecoveryPlan}
                        onChange={(e) => setObData({ ...obData, disasterRecoveryPlan: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes, Documented</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Security Training Completion (%)</label>
                      <input
                        type="number"
                        max={100}
                        value={obData.securityTrainingCompletion}
                        onChange={(e) => setObData({ ...obData, securityTrainingCompletion: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Patch Cycle Managed?</label>
                      <select
                        value={obData.patchManagementEnabled}
                        onChange={(e) => setObData({ ...obData, patchManagementEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes, Automated</option>
                        <option value="no">No (Manual/Ad-hoc)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Critical Vulnerabilities</label>
                      <input
                        type="number"
                        value={obData.numCriticalVulnerabilities}
                        onChange={(e) => setObData({ ...obData, numCriticalVulnerabilities: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Compliance Certs</label>
                      <input
                        type="text"
                        value={obData.complianceCertifications}
                        onChange={(e) => setObData({ ...obData, complianceCertifications: e.target.value })}
                        placeholder="e.g. HIPAA, SOC 2, ISO 27001"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Business Goals */}
              {onboardingStep === 5 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 5 - Business Goals</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Biggest Security Concerns</label>
                      <textarea
                        rows={2}
                        value={obData.biggestConcerns}
                        onChange={(e) => setObData({ ...obData, biggestConcerns: e.target.value })}
                        placeholder="e.g. Ransomware threats, phishing traps"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Business Objectives</label>
                      <textarea
                        rows={2}
                        value={obData.primaryObjectives}
                        onChange={(e) => setObData({ ...obData, primaryObjectives: e.target.value })}
                        placeholder="e.g. Establish credit expansion, secure SOC2 validation"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">12-Month Expected Growth</label>
                      <input
                        type="text"
                        value={obData.expectedGrowth}
                        onChange={(e) => setObData({ ...obData, expectedGrowth: e.target.value })}
                        placeholder="e.g. Double revenue size"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Technology Investments</label>
                      <input
                        type="text"
                        value={obData.plannedTechInvestments}
                        onChange={(e) => setObData({ ...obData, plannedTechInvestments: e.target.value })}
                        placeholder="e.g. EDR security suite"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Team Hiring</label>
                      <input
                        type="text"
                        value={obData.plannedHiring}
                        onChange={(e) => setObData({ ...obData, plannedHiring: e.target.value })}
                        placeholder="e.g. 3 new DevOps engineers"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expansion / Site Plans</label>
                      <input
                        type="text"
                        value={obData.expansionPlans}
                        onChange={(e) => setObData({ ...obData, expansionPlans: e.target.value })}
                        placeholder="e.g. Opening EU distribution office"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-gray-800 p-6 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowAddClient(false);
                  setOnboardingStep(1);
                }}
                className="py-2 px-4 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                {onboardingStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(onboardingStep - 1)}
                    className="bg-gray-850 hover:bg-gray-800 text-gray-300 font-bold py-2 px-4 rounded-lg text-xs"
                  >
                    Back
                  </button>
                )}
                
                {onboardingStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onboardingStep === 1 && !obData.companyName) {
                        alert('Company name is required.');
                        return;
                      }
                      setOnboardingStep(onboardingStep + 1);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow shadow-emerald-500/20"
                  >
                    Complete Onboarding & Run AI
                  </button>
                )}
              </div>
            </div>
            </>)}

            {onboardingStatus === 'calculating' && (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-indigo-500/15" />
                <div className="space-y-2">
                  <h3 className="text-lg font-black tracking-wide text-white animate-pulse">Calculating Baseline Metrics...</h3>
                  <p className="text-xs text-gray-400 font-medium">Please wait while the AI engine computes risk scores and profiles the client.</p>
                </div>
                
                {/* Dynamic checklist step simulator */}
                <div className="w-full max-w-sm bg-gray-950/60 rounded-2xl p-4 border border-gray-850 space-y-2.5 text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-gray-300">Calculating Financial Risk Score...</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-gray-400">Evaluating Cybersecurity Posture...</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-gray-400">Synthesizing Overall Business Health...</span>
                  </div>
                </div>
              </div>
            )}

            {onboardingStatus === 'result' && newClientScores && (
              <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <div className="text-center space-y-1">
                  <div className="inline-flex p-3 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20 mb-2">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white">Onboarding Diagnostics Completed!</h3>
                  <p className="text-xs text-gray-400">Here is the baseline risk profiles calculated for <strong className="text-indigo-400">{newClientScores.client.name}</strong>.</p>
                </div>

                {/* Ratios & Scores Dashboard */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Score Dials */}
                  <div className="bg-gray-950/60 border border-gray-850 p-4 rounded-2xl text-center space-y-1 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Overall Health</span>
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative my-2">
                      <span className="text-lg font-black text-indigo-400">{newClientScores.computed.overallHealthScore}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-300">{newClientScores.overallRating}</span>
                  </div>

                  <div className="bg-gray-950/60 border border-gray-850 p-4 rounded-2xl text-center space-y-1 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Financial Risk</span>
                    <div className="w-16 h-16 rounded-full border-4 border-red-500/20 flex items-center justify-center relative my-2">
                      <span className="text-lg font-black text-red-400">{newClientScores.computed.financialRiskScore}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-300">Capped at 100 max</span>
                  </div>

                  <div className="bg-gray-950/60 border border-gray-850 p-4 rounded-2xl text-center space-y-1 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Cybersecurity Risk</span>
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 flex items-center justify-center relative my-2">
                      <span className="text-lg font-black text-amber-400">{newClientScores.computed.cyberRiskScore}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-300">Capped at 100 max</span>
                  </div>
                </div>

                {/* Diagnostic Breakdowns */}
                <div className="grid grid-cols-2 gap-4">
                  {/* CFO Financial Score Diagnostic */}
                  <div className="bg-gray-950/40 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-850 pb-2">
                      <BarChart3 size={14} className="text-indigo-400 shrink-0" />
                      <span>CFO Financial Ratios & Point Summary</span>
                    </h4>
                    <div className="space-y-2 text-[10.5px] text-gray-400 font-semibold leading-relaxed">
                      {newClientScores.finExplain.map((exp: string, idx: number) => (
                        <p key={idx} className="flex gap-2">
                          <span className="text-indigo-400 shrink-0">•</span>
                          <span>{exp}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* CISO Cyber Score Diagnostic */}
                  <div className="bg-gray-950/40 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-850 pb-2">
                      <Shield size={14} className="text-amber-400 shrink-0" />
                      <span>CISO Security Posture & Point Summary</span>
                    </h4>
                    <div className="space-y-2 text-[10.5px] text-gray-400 font-semibold leading-relaxed">
                      {newClientScores.cybExplain.map((exp: string, idx: number) => (
                        <p key={idx} className="flex gap-2">
                          <span className="text-amber-400 shrink-0">•</span>
                          <span>{exp}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer trigger */}
                <div className="border-t border-gray-850 pt-4 flex justify-end">
                  <button
                    onClick={handleOnboardingFinish}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow transition-all duration-200"
                  >
                    Proceed to Client Workspace Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Client Dialog Modal (Intelligent Editing Guided 5-Step Process) */}
      {showEditClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md overflow-y-auto py-8 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in duration-200">
            {/* Header with Step Tracker */}
            <div className="border-b border-gray-800 p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">Edit Client Profile</h3>
                <span className="text-[10px] font-bold py-1 px-2.5 rounded bg-indigo-900/40 text-indigo-400 border border-indigo-850/50">
                  Target: {activeClient.name}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-6">Modify the fields below to update the client's risk profile details.</p>
              
              {/* Progress Indicator */}
              <div className="grid grid-cols-5 gap-2 relative">
                {[
                  { step: 1, label: 'Company Info' },
                  { step: 2, label: 'Operations' },
                  { step: 3, label: 'Financials' },
                  { step: 4, label: 'Cybersecurity' },
                  { step: 5, label: 'Business Goals' }
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                      editOnboardingStep === s.step ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110' :
                      editOnboardingStep > s.step ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                      'bg-gray-950 border-gray-850 text-gray-500'
                    }`}>
                      {editOnboardingStep > s.step ? <Check size={14} className="stroke-[3]" /> : s.step}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 text-center transition-colors duration-300 ${
                      editOnboardingStep === s.step ? 'text-indigo-400' :
                      editOnboardingStep > s.step ? 'text-emerald-500' : 'text-gray-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content Scroll Region */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* STEP 1: Company Information */}
              {editOnboardingStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 1 - Company Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={editObData.companyName}
                        onChange={(e) => setEditObData({ ...editObData, companyName: e.target.value })}
                        placeholder="e.g. Stark Labs Inc"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Industry Sector</label>
                      <select
                        value={editObData.industry}
                        onChange={(e) => setEditObData({ ...editObData, industry: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option>Manufacturing</option>
                        <option>Technology</option>
                        <option>Consumer Retail</option>
                        <option>Healthcare</option>
                        <option>Clean Tech</option>
                        <option>Professional Services</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Description</label>
                    <textarea
                      rows={2}
                      value={editObData.businessDescription}
                      onChange={(e) => setEditObData({ ...editObData, businessDescription: e.target.value })}
                      placeholder="e.g. Cloud software vendor developing HIPAA compliant clinical tools."
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Year Founded</label>
                      <input
                        type="text"
                        value={editObData.yearFounded}
                        onChange={(e) => setEditObData({ ...editObData, yearFounded: e.target.value })}
                        placeholder="e.g. 2018"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">HQ Location</label>
                      <input
                        type="text"
                        value={editObData.hqLocation}
                        onChange={(e) => setEditObData({ ...editObData, hqLocation: e.target.value })}
                        placeholder="e.g. Austin, TX"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Employees</label>
                      <input
                        type="number"
                        value={editObData.numEmployees}
                        onChange={(e) => setEditObData({ ...editObData, numEmployees: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Number of Sites/Locations</label>
                      <input
                        type="number"
                        value={editObData.numLocations}
                        onChange={(e) => setEditObData({ ...editObData, numLocations: parseInt(e.target.value, 10) || 1 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ownership Type</label>
                      <select
                        value={editObData.publicOrPrivate}
                        onChange={(e) => setEditObData({ ...editObData, publicOrPrivate: e.target.value as 'public' | 'private' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="private">Private Company</option>
                        <option value="public">Publicly Traded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Website URL</label>
                      <input
                        type="text"
                        value={editObData.website}
                        onChange={(e) => setEditObData({ ...editObData, website: e.target.value })}
                        placeholder="e.g. website.com"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Contact Details</label>
                    <input
                      type="text"
                      value={editObData.primaryContact}
                      onChange={(e) => setEditObData({ ...editObData, primaryContact: e.target.value })}
                      placeholder="e.g. Alice Smith (CEO, alice@stark.com)"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Operations */}
              {editOnboardingStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 2 - Operations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Products/Services</label>
                      <input
                        type="text"
                        value={editObData.primaryProducts}
                        onChange={(e) => setEditObData({ ...editObData, primaryProducts: e.target.value })}
                        placeholder="e.g. Precision components"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operating Business Hours</label>
                      <input
                        type="text"
                        value={editObData.operatingHours}
                        onChange={(e) => setEditObData({ ...editObData, operatingHours: e.target.value })}
                        placeholder="e.g. 08:00 - 18:00"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Number of Customers</label>
                      <input
                        type="number"
                        value={editObData.numCustomers}
                        onChange={(e) => setEditObData({ ...editObData, numCustomers: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Top Client Share (%) *</label>
                      <input
                        type="number"
                        max={100}
                        value={editObData.largestCustomerPercentage}
                        onChange={(e) => setEditObData({ ...editObData, largestCustomerPercentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Vendors</label>
                      <input
                        type="number"
                        value={editObData.numVendors}
                        onChange={(e) => setEditObData({ ...editObData, numVendors: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Critical Vendors Names</label>
                      <input
                        type="text"
                        value={editObData.criticalVendors}
                        onChange={(e) => setEditObData({ ...editObData, criticalVendors: e.target.value })}
                        placeholder="e.g. Iron Suppliers LLC, CloudTech"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remote Employees (%)</label>
                      <input
                        type="number"
                        max={100}
                        value={editObData.remotePercentage}
                        onChange={(e) => setEditObData({ ...editObData, remotePercentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cloud Providers Used</label>
                      <input
                        type="text"
                        value={editObData.cloudProviders}
                        onChange={(e) => setEditObData({ ...editObData, cloudProviders: e.target.value })}
                        placeholder="e.g. AWS, GCP"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ERP / Accounting Suite</label>
                      <input
                        type="text"
                        value={editObData.accountingSoftware}
                        onChange={(e) => setEditObData({ ...editObData, accountingSoftware: e.target.value })}
                        placeholder="e.g. NetSuite, QuickBooks"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Banking Institution</label>
                      <input
                        type="text"
                        value={editObData.bankingInstitution}
                        onChange={(e) => setEditObData({ ...editObData, bankingInstitution: e.target.value })}
                        placeholder="e.g. Chase Bank"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Maintain Cyber Insurance Coverage?</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer font-medium">
                        <input
                          type="radio"
                          value="yes"
                          checked={editObData.cyberInsurance === 'yes'}
                          onChange={() => setEditObData({ ...editObData, cyberInsurance: 'yes' })}
                          className="text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer font-medium">
                        <input
                          type="radio"
                          value="no"
                          checked={editObData.cyberInsurance === 'no'}
                          onChange={() => setEditObData({ ...editObData, cyberInsurance: 'no' })}
                          className="text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Financial Information */}
              {editOnboardingStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 3 - Financial Information</h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cash Balance ($)</label>
                      <input
                        type="number"
                        value={editObData.cashBalance}
                        onChange={(e) => setEditObData({ ...editObData, cashBalance: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Operating Expenses ($)</label>
                      <input
                        type="number"
                        value={editObData.monthlyExpenses}
                        onChange={(e) => setEditObData({ ...editObData, monthlyExpenses: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Revenue ($)</label>
                      <input
                        type="number"
                        value={editObData.monthlyRevenue}
                        onChange={(e) => setEditObData({ ...editObData, monthlyRevenue: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Existing Debt ($)</label>
                      <input
                        type="number"
                        value={editObData.existingDebt}
                        onChange={(e) => setEditObData({ ...editObData, existingDebt: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accounts Receivable ($)</label>
                      <input
                        type="number"
                        value={editObData.accountsReceivable}
                        onChange={(e) => setEditObData({ ...editObData, accountsReceivable: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-405 uppercase tracking-wider mb-1">Accounts Payable ($)</label>
                      <input
                        type="number"
                        value={editObData.accountsPayable}
                        onChange={(e) => setEditObData({ ...editObData, accountsPayable: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Cybersecurity Assessment */}
              {editOnboardingStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 4 - Cybersecurity Assessment</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">MFA Enforced?</label>
                      <select
                        value={editObData.mfaEnabled}
                        onChange={(e) => setEditObData({ ...editObData, mfaEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (Enabled)</option>
                        <option value="no">No (Disabled)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Password Policy?</label>
                      <select
                        value={editObData.passwordPolicyEnabled}
                        onChange={(e) => setEditObData({ ...editObData, passwordPolicyEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (Enforced)</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endpoint Protection (EDR)?</label>
                      <select
                        value={editObData.endpointProtection}
                        onChange={(e) => setEditObData({ ...editObData, endpointProtection: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes (EDR Active)</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Backup Solution</label>
                      <select
                        value={editObData.backupSolution}
                        onChange={(e) => setEditObData({ ...editObData, backupSolution: e.target.value as 'active' | 'outdated' | 'none' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="active">Active & Tested</option>
                        <option value="outdated">Outdated / Ad-hoc</option>
                        <option value="none">No Backup System</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Disaster Recovery Plan?</label>
                      <select
                        value={editObData.disasterRecoveryPlan}
                        onChange={(e) => setEditObData({ ...editObData, disasterRecoveryPlan: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes, Documented</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Security Training Completion (%)</label>
                      <input
                        type="number"
                        max={100}
                        value={editObData.securityTrainingCompletion}
                        onChange={(e) => setEditObData({ ...editObData, securityTrainingCompletion: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Patch Cycle Managed?</label>
                      <select
                        value={editObData.patchManagementEnabled}
                        onChange={(e) => setEditObData({ ...editObData, patchManagementEnabled: e.target.value as 'yes' | 'no' })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="yes">Yes, Automated</option>
                        <option value="no">No (Manual/Ad-hoc)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Critical Vulnerabilities</label>
                      <input
                        type="number"
                        value={editObData.numCriticalVulnerabilities}
                        onChange={(e) => setEditObData({ ...editObData, numCriticalVulnerabilities: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Compliance Certs</label>
                      <input
                        type="text"
                        value={editObData.complianceCertifications}
                        onChange={(e) => setEditObData({ ...editObData, complianceCertifications: e.target.value })}
                        placeholder="e.g. HIPAA, SOC 2, ISO 27001"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Business Goals */}
              {editOnboardingStep === 5 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                  <h4 className="text-sm font-bold text-gray-300 border-b border-gray-850 pb-2 mb-4">Step 5 - Business Goals</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Biggest Security Concerns</label>
                      <textarea
                        rows={2}
                        value={editObData.biggestConcerns}
                        onChange={(e) => setEditObData({ ...editObData, biggestConcerns: e.target.value })}
                        placeholder="e.g. Ransomware threats, phishing traps"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primary Business Objectives</label>
                      <textarea
                        rows={2}
                        value={editObData.primaryObjectives}
                        onChange={(e) => setEditObData({ ...editObData, primaryObjectives: e.target.value })}
                        placeholder="e.g. Establish credit expansion, secure SOC2 validation"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">12-Month Expected Growth</label>
                      <input
                        type="text"
                        value={editObData.expectedGrowth}
                        onChange={(e) => setEditObData({ ...editObData, expectedGrowth: e.target.value })}
                        placeholder="e.g. Double revenue size"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Technology Investments</label>
                      <input
                        type="text"
                        value={editObData.plannedTechInvestments}
                        onChange={(e) => setEditObData({ ...editObData, plannedTechInvestments: e.target.value })}
                        placeholder="e.g. EDR security suite"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Team Hiring</label>
                      <input
                        type="text"
                        value={editObData.plannedHiring}
                        onChange={(e) => setEditObData({ ...editObData, plannedHiring: e.target.value })}
                        placeholder="e.g. 3 new DevOps engineers"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expansion / Site Plans</label>
                      <input
                        type="text"
                        value={editObData.expansionPlans}
                        onChange={(e) => setEditObData({ ...editObData, expansionPlans: e.target.value })}
                        placeholder="e.g. Opening EU distribution office"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-gray-800 p-6 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowEditClient(false);
                  setEditOnboardingStep(1);
                }}
                className="py-2 px-4 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                {editOnboardingStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setEditOnboardingStep(editOnboardingStep - 1)}
                    className="bg-gray-850 hover:bg-gray-800 text-gray-300 font-bold py-2 px-4 rounded-lg text-xs"
                  >
                    Back
                  </button>
                )}
                
                {editOnboardingStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editOnboardingStep === 1 && !editObData.companyName) {
                        alert('Company name is required.');
                        return;
                      }
                      setEditOnboardingStep(editOnboardingStep + 1);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpdateClient}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow shadow-emerald-500/20"
                  >
                    Save Changes & Run AI
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 1. DASHBOARD TAB VIEW
// ==========================================
function DashboardTab({ 
  activeClient, 
  computed, 
  advisorData,
  advisorLoading,
  onRunAdvisor,
  onResetAdvisor
}: { 
  activeClient: ClientProfile; 
  computed: ComputedRatios; 
  advisorData: any;
  advisorLoading: boolean;
  onRunAdvisor: () => void;
  onResetAdvisor: () => void;
}) {
  const flaggedCount = activeClient.transactions.filter(t => t.is_flagged).length;
  
  const getScoreJustifications = (comp: ComputedRatios, client: ClientProfile) => {
    const finPenalties: string[] = [];
    const currentRatio = comp.currentRatio;
    const quickRatio = comp.quickRatio;
    const debtRatio = comp.debtRatio;
    const cashRunway = comp.cashRunway;
    const customerConcentration = client.financialMetrics.customer_concentration;
    const latePayment = client.financialMetrics.late_payment_percentage;

    if (currentRatio < 1.0) finPenalties.push(`Current Ratio is critical (${currentRatio} < 1.0) [+25 pts]`);
    else if (currentRatio < 1.5) finPenalties.push(`Current Ratio is low (${currentRatio} < 1.5) [+12 pts]`);

    if (quickRatio < 0.8) finPenalties.push(`Quick Ratio is critical (${quickRatio} < 0.8) [+15 pts]`);
    else if (quickRatio < 1.0) finPenalties.push(`Quick Ratio is low (${quickRatio} < 1.0) [+8 pts]`);

    if (debtRatio > 0.7) finPenalties.push(`Debt Ratio is high (${Math.round(debtRatio * 100)}% > 70%) [+20 pts]`);
    else if (debtRatio > 0.5) finPenalties.push(`Debt Ratio is moderate (${Math.round(debtRatio * 100)}% > 50%) [+10 pts]`);

    if (cashRunway < 3) finPenalties.push(`Cash Runway is critical (${cashRunway} mo < 3 mo) [+25 pts]`);
    else if (cashRunway < 6) finPenalties.push(`Cash Runway is short (${cashRunway} mo < 6 mo) [+12 pts]`);

    if (customerConcentration > 40) finPenalties.push(`Customer Concentration is high (${customerConcentration}% > 40%) [+15 pts]`);
    else if (customerConcentration > 25) finPenalties.push(`Customer Concentration is moderate (${customerConcentration}% > 25%) [+7 pts]`);

    if (latePayment > 25) finPenalties.push(`Late payment ratio is high (${latePayment}% > 25%) [+10 pts]`);
    else if (latePayment > 10) finPenalties.push(`Late payment ratio is moderate (${latePayment}% > 10%) [+5 pts]`);

    const cyberPenalties: string[] = [];
    const cyber = client.cyberMetrics;
    if (!cyber.mfa_enabled) cyberPenalties.push(`MFA is disabled globally [+25 pts]`);
    if (!cyber.password_policy_enabled) cyberPenalties.push(`Password policy is inactive [+10 pts]`);
    if (cyber.backup_status === 'none') cyberPenalties.push(`No backup solution configured [+20 pts]`);
    else if (cyber.backup_status === 'outdated') cyberPenalties.push(`Backups are outdated [+10 pts]`);
    if (!cyber.endpoint_protection) cyberPenalties.push(`Endpoint antivirus protection is inactive [+15 pts]`);
    if (cyber.phishing_incidents_count > 0) cyberPenalties.push(`${cyber.phishing_incidents_count} Phishing incidents [+${Math.min(15, cyber.phishing_incidents_count * 5)} pts]`);
    if (cyber.open_vulnerabilities_count > 0) cyberPenalties.push(`${cyber.open_vulnerabilities_count} Open CVEs [+${Math.min(15, cyber.open_vulnerabilities_count * 3)} pts]`);
    if (cyber.patch_status === 'critical_missing') cyberPenalties.push(`Critical software patches missing [+15 pts]`);
    else if (cyber.patch_status === 'outdated') cyberPenalties.push(`Software patching is outdated [+7 pts]`);
    if (cyber.security_awareness_completion < 100) {
      cyberPenalties.push(`Security awareness training incomplete (${cyber.security_awareness_completion}% completed) [+${Math.round((100 - cyber.security_awareness_completion) * 0.15)} pts]`);
    }

    return {
      financial: finPenalties,
      cybersecurity: cyberPenalties
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 3 Risk Gauges Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <RiskGauge score={computed.overallHealthScore} title="Overall Business Health" type="health" size={140} />
        <RiskGauge score={computed.financialRiskScore} title="Financial Risk Score" type="financial" size={140} />
        <RiskGauge score={computed.cyberRiskScore} title="Cybersecurity Risk Score" type="cyber" size={140} />
      </div>

      {/* 4 Financial & Security KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cash Runway */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 hover:border-gray-700/80 p-5 rounded-2xl shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              Cash Runway
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              computed.cashRunway < 3 
                ? 'bg-red-950/60 text-red-400 border-red-800/60' 
                : computed.cashRunway < 6 
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            }`}>
              {computed.cashRunway < 3 ? 'Critical' : computed.cashRunway < 6 ? 'Warning' : 'Healthy'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-3xl font-black tracking-tight ${computed.cashRunway < 3 ? 'text-red-500' : 'text-white'}`}>
              {computed.cashRunway}
            </span>
            <span className="text-xs font-semibold text-gray-400">months</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span className="text-[11px] text-gray-400">Monthly Burn</span>
            <span className="font-semibold text-gray-200">{formatLargeMoney(activeClient.financialMetrics.monthly_burn_rate)}/mo</span>
          </div>
        </div>

        {/* Card 2: Outstanding A/R */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 hover:border-gray-700/80 p-5 rounded-2xl shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-cyan-400" />
              Outstanding A/R
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              activeClient.financialMetrics.late_payment_percentage > 25 
                ? 'bg-red-950/60 text-red-400 border-red-800/60' 
                : activeClient.financialMetrics.late_payment_percentage > 10 
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                : 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
            }`}>
              {activeClient.financialMetrics.late_payment_percentage}% Late
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">
              {formatLargeMoney(activeClient.financialMetrics.outstanding_receivables)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span className="text-[11px] text-gray-400">Late Payment Rate</span>
            <span className={`font-semibold ${activeClient.financialMetrics.late_payment_percentage > 20 ? 'text-amber-400' : 'text-gray-200'}`}>
              {activeClient.financialMetrics.late_payment_percentage}% of invoices
            </span>
          </div>
        </div>

        {/* Card 3: Upcoming Obligations */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 hover:border-gray-700/80 p-5 rounded-2xl shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-purple-400" />
              Upcoming Obligations
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-400 border border-purple-800/60">
              Short-Term
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">
              {formatLargeMoney(activeClient.financialMetrics.upcoming_obligations)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span className="text-[11px] text-gray-400">Working Capital</span>
            <span className={`font-semibold ${computed.workingCapital < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatLargeMoney(computed.workingCapital)}
            </span>
          </div>
        </div>

        {/* Card 4: Fraud Alerts */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 hover:border-gray-700/80 p-5 rounded-2xl shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} className={flaggedCount > 0 ? 'text-red-400' : 'text-emerald-400'} />
              Fraud Alerts
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              flaggedCount > 0 
                ? 'bg-red-950/60 text-red-400 border-red-800/60' 
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            }`}>
              {flaggedCount > 2 ? 'High Risk' : flaggedCount > 0 ? 'Review Needed' : 'Clean'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-3xl font-black tracking-tight ${flaggedCount > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
              {flaggedCount}
            </span>
            <span className="text-xs font-semibold text-gray-400">flagged items</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span className="text-[11px] text-gray-400">Fraud Probability</span>
            <span className={`font-semibold ${flaggedCount > 2 ? 'text-red-400' : flaggedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {flaggedCount > 2 ? 'High' : flaggedCount > 0 ? 'Moderate' : 'Low'}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Daily Operations Pulse Snapshot */}
      {activeClient.dailyLogs && activeClient.dailyLogs.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-955/40 via-gray-900/80 to-gray-900/80 border border-indigo-900/50 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-xl">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">Today's Operations Pulse</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  {activeClient.dailyLogs[0].status.toUpperCase()}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">({activeClient.dailyLogs[0].date})</span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-1 line-clamp-1">
                {activeClient.dailyLogs[0].summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Resilience Rating</span>
              <span className="text-base font-black text-white">{activeClient.dailyLogs[0].resilienceScore} / 100</span>
            </div>

            <Link
              href={`/dashboard?client=${activeClient.id}&tab=daily`}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <span>Open Daily Tracker</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Score Formula Explainer Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg space-y-3">
        <details className="group">
          <summary className="list-none flex items-center justify-between cursor-pointer text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <HelpCircle size={14} className="text-indigo-400" />
              How are these scores calculated? (Score Formula Details)
            </span>
            <ChevronRight size={14} className="transition-transform duration-200 group-open:rotate-90 text-gray-500" />
          </summary>
          <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-300 space-y-4 leading-relaxed">
            <div>
              <h5 className="font-extrabold text-white mb-1 flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-400 shrink-0" />
                <span>Overall Business Health Score</span>
              </h5>
              <p>Computed as: <code className="bg-gray-950 px-1.5 py-0.5 rounded text-indigo-400 font-mono">100 - (0.5 × Financial Risk Score + 0.5 × Cybersecurity Risk Score)</code></p>
              <p className="text-gray-500 mt-1">A higher score indicates better operational resilience and lower risk exposure.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-extrabold text-white mb-1 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-cyan-400 shrink-0" />
                  <span>Financial Risk Score (Capped at 100)</span>
                </h5>
                <p className="mb-2">Accumulates risk penalty points based on liquidity and leverage indicators:</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                  <li><strong>Current Ratio:</strong> Current Ratio &lt; 1.0 (<code className="text-red-400">+25 pts</code>), &lt; 1.5 (<code className="text-amber-400">+12 pts</code>)</li>
                  <li><strong>Quick Ratio:</strong> Quick Ratio &lt; 0.8 (<code className="text-red-400">+15 pts</code>), &lt; 1.0 (<code className="text-amber-400">+8 pts</code>)</li>
                  <li><strong>Debt Ratio:</strong> Debt Ratio &gt; 70% (<code className="text-red-400">+20 pts</code>), &gt; 50% (<code className="text-amber-400">+10 pts</code>)</li>
                  <li><strong>Cash Runway:</strong> Runway &lt; 3 months (<code className="text-red-400">+25 pts</code>), &lt; 6 months (<code className="text-amber-400">+12 pts</code>)</li>
                  <li><strong>Customer Concentration:</strong> Concentration &gt; 40% (<code className="text-red-400">+15 pts</code>), &gt; 25% (<code className="text-amber-400">+7 pts</code>)</li>
                  <li><strong>Late Payments:</strong> Overdue invoices &gt; 25% (<code className="text-red-400">+10 pts</code>), &gt; 10% (<code className="text-amber-400">+5 pts</code>)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-extrabold text-white mb-1 flex items-center gap-1.5">
                  <Shield size={14} className="text-purple-400 shrink-0" />
                  <span>Cybersecurity Risk Score (Capped at 100)</span>
                </h5>
                <p className="mb-2">Accumulates risk penalty points based on identity, endpoint, and training postures:</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                  <li><strong>MFA:</strong> Disabled globally (<code className="text-red-400">+25 pts</code>)</li>
                  <li><strong>Password Policy:</strong> Inactive complexity policy (<code className="text-amber-400">+10 pts</code>)</li>
                  <li><strong>Backup Security:</strong> Backup status is None (<code className="text-red-400">+20 pts</code>), Outdated (<code className="text-amber-400">+10 pts</code>)</li>
                  <li><strong>Endpoint Protection:</strong> Inactive antivirus protection (<code className="text-amber-400">+15 pts</code>)</li>
                  <li><strong>Phishing Incidents:</strong> <code className="text-gray-300">5 pts</code> per quarterly incident (up to <code className="text-amber-400">15 pts</code>)</li>
                  <li><strong>Open Vulnerabilities:</strong> <code className="text-gray-300">3 pts</code> per open CVE vulnerability (up to <code className="text-amber-400">15 pts</code>)</li>
                  <li><strong>Software Patching:</strong> Critical updates missing (<code className="text-red-400">+15 pts</code>), Outdated (<code className="text-amber-400">+7 pts</code>)</li>
                  <li><strong>Awareness Training:</strong> Up to <code className="text-amber-400">15 pts</code> depending on training completion rate</li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Executive Score Justifications */}
      {(() => {
        const justifications = getScoreJustifications(computed, activeClient);
        return (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Audit Score Justification Report
              </h4>
              <span className="text-[10px] text-gray-500 font-mono font-bold uppercase">Correlated Live Client Analytics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Risk Score Justifications */}
              <div className="bg-gray-950/30 border border-gray-850/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={12} className="shrink-0" />
                    <span>Financial Risk Factors</span>
                  </span>
                  <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/30">
                    {computed.financialRiskScore}/100 pts
                  </span>
                </div>
                <div className="space-y-2 pl-2 border-l border-cyan-800/40">
                  {justifications.financial.length > 0 ? (
                    justifications.financial.map((p, idx) => (
                      <p key={idx} className="text-xs text-gray-300 leading-relaxed font-semibold flex items-start gap-1.5">
                        <span className="text-cyan-400 mt-0.5">▪</span>
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-400 font-semibold italic">No financial risk penalties applied! Client represents an excellent liquidity and debt profile.</p>
                  )}
                </div>
              </div>

              {/* Cybersecurity Risk Score Justifications */}
              <div className="bg-gray-950/30 border border-gray-850/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} className="shrink-0" />
                    <span>Cybersecurity Risk Factors</span>
                  </span>
                  <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-purple-950 border border-purple-800/30">
                    {computed.cyberRiskScore}/100 pts
                  </span>
                </div>
                <div className="space-y-2 pl-2 border-l border-purple-800/40">
                  {justifications.cybersecurity.length > 0 ? (
                    justifications.cybersecurity.map((p, idx) => (
                      <p key={idx} className="text-xs text-gray-300 leading-relaxed font-semibold flex items-start gap-1.5">
                        <span className="text-purple-400 mt-0.5">▪</span>
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-400 font-semibold italic">No cybersecurity risk penalties applied! Client has mature system postures and training completion.</p>
                  )}
                </div>
              </div>
            </div>
            {/* Overall Health Justification summary */}
            <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-850 text-[10px] text-gray-400 leading-relaxed">
              <strong>Methodology Summary:</strong> The Overall Business Health is the average of safety margins (each 100 - risk score). Calculated as 100 - (0.5 × {computed.financialRiskScore} Fin Risk + 0.5 × {computed.cyberRiskScore} Cyber Risk) = <strong>{computed.overallHealthScore}/100</strong>.
            </div>
          </div>
        );
      })()}

      {/* Historical Cash Flow Trend & Concentration Ratios */}
      <div className="grid grid-cols-3 gap-6">
        {/* Cash Flow Line Chart */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-indigo-400" />
              Cash Flow & Revenue trends (Historical)
            </h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Monthly Balances</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeClient.historicalCashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={formatChartValue} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} 
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concentration Card */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <h3 className="text-sm font-bold text-gray-300 mb-4">Concentration Risk Indexes</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-around">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-400">Customer Concentration</span>
                <span className={activeClient.financialMetrics.customer_concentration > 30 ? 'text-red-400' : 'text-gray-300'}>
                  {activeClient.financialMetrics.customer_concentration}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${activeClient.financialMetrics.customer_concentration > 30 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${activeClient.financialMetrics.customer_concentration}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Top customer share of total sales</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-400">Vendor Concentration</span>
                <span className={activeClient.financialMetrics.vendor_concentration > 30 ? 'text-red-400' : 'text-gray-300'}>
                  {activeClient.financialMetrics.vendor_concentration}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${activeClient.financialMetrics.vendor_concentration > 30 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                  style={{ width: `${activeClient.financialMetrics.vendor_concentration}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Top vendor share of expenditures</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Company Profile & Strategic Maturity */}
      {activeClient.aiCompanyProfile && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles size={120} className="text-white" />
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-850 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">AI Company Profile</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Maturity Analysis & Strategic Diagnostics</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Risk Classification</span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                  activeClient.aiCompanyProfile.assignedRiskProfile === 'Low' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                  activeClient.aiCompanyProfile.assignedRiskProfile === 'Medium' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/60' :
                  activeClient.aiCompanyProfile.assignedRiskProfile === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
                  'bg-red-950 text-red-400 border border-red-800/60'
                }`}>
                  {activeClient.aiCompanyProfile.assignedRiskProfile} Risk
                </span>
              </div>
              
              <div className="h-10 w-px bg-gray-800" />
              
              <div className="text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Resilience Index</span>
                <span className="text-lg font-black text-white block mt-0.5">
                  {activeClient.aiCompanyProfile.overallOperationalResilienceIndex}/100
                </span>
              </div>
            </div>
          </div>
          
          {/* Maturity ratings meters */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-850/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Financial Maturity</span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                  activeClient.aiCompanyProfile.financialMaturity === 'high' ? 'text-emerald-400 bg-emerald-950/40' :
                  activeClient.aiCompanyProfile.financialMaturity === 'medium' ? 'text-indigo-400 bg-indigo-950/40' :
                  'text-red-400 bg-red-950/40'
                }`}>
                  {activeClient.aiCompanyProfile.financialMaturity}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden">
                <div className={`h-full ${
                  activeClient.aiCompanyProfile.financialMaturity === 'high' ? 'bg-emerald-500' :
                  activeClient.aiCompanyProfile.financialMaturity === 'medium' ? 'bg-indigo-500' : 'bg-red-500'
                }`} style={{ width: activeClient.aiCompanyProfile.financialMaturity === 'high' ? '100%' : activeClient.aiCompanyProfile.financialMaturity === 'medium' ? '65%' : '30%' }} />
              </div>
            </div>

            <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-850/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Cyber Maturity</span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                  activeClient.aiCompanyProfile.cybersecurityMaturity === 'high' ? 'text-emerald-400 bg-emerald-950/40' :
                  activeClient.aiCompanyProfile.cybersecurityMaturity === 'medium' ? 'text-indigo-400 bg-indigo-950/40' :
                  'text-red-400 bg-red-950/40'
                }`}>
                  {activeClient.aiCompanyProfile.cybersecurityMaturity}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden">
                <div className={`h-full ${
                  activeClient.aiCompanyProfile.cybersecurityMaturity === 'high' ? 'bg-emerald-500' :
                  activeClient.aiCompanyProfile.cybersecurityMaturity === 'medium' ? 'bg-indigo-500' : 'bg-red-500'
                }`} style={{ width: activeClient.aiCompanyProfile.cybersecurityMaturity === 'high' ? '100%' : activeClient.aiCompanyProfile.cybersecurityMaturity === 'medium' ? '65%' : '30%' }} />
              </div>
            </div>

            <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-850/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Operational Maturity</span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                  activeClient.aiCompanyProfile.operationalMaturity === 'high' ? 'text-emerald-400 bg-emerald-950/40' :
                  activeClient.aiCompanyProfile.operationalMaturity === 'medium' ? 'text-indigo-400 bg-indigo-950/40' :
                  'text-red-400 bg-red-950/40'
                }`}>
                  {activeClient.aiCompanyProfile.operationalMaturity}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden">
                <div className={`h-full ${
                  activeClient.aiCompanyProfile.operationalMaturity === 'high' ? 'bg-emerald-500' :
                  activeClient.aiCompanyProfile.operationalMaturity === 'medium' ? 'bg-indigo-500' : 'bg-red-500'
                }`} style={{ width: activeClient.aiCompanyProfile.operationalMaturity === 'high' ? '100%' : activeClient.aiCompanyProfile.operationalMaturity === 'medium' ? '65%' : '30%' }} />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950/20 p-4 rounded-xl border border-gray-850/40">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Corporate Context Summary</span>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">{activeClient.aiCompanyProfile.overview}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Growth Stage:</span>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">{activeClient.aiCompanyProfile.growthStage}</span>
                </div>
              </div>
              
              <div className="bg-gray-950/20 p-4 rounded-xl border border-gray-850/40">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Sector & Compliance Risk Insights</span>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {typeof activeClient.aiCompanyProfile.industryInsights === 'string'
                    ? activeClient.aiCompanyProfile.industryInsights
                    : typeof activeClient.aiCompanyProfile.industryInsights === 'object' && activeClient.aiCompanyProfile.industryInsights !== null
                      ? Object.entries(activeClient.aiCompanyProfile.industryInsights)
                          .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join('. ')
                      : String(activeClient.aiCompanyProfile.industryInsights || '')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950/10 p-4 rounded-xl border border-gray-850/30">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">Strengths</span>
                <ul className="space-y-1.5">
                  {(Array.isArray(activeClient.aiCompanyProfile.strengths) ? activeClient.aiCompanyProfile.strengths : []).map((str, idx) => (
                    <li key={idx} className="text-xs text-gray-300 font-medium flex items-start gap-1.5">
                      <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>{typeof str === 'object' ? JSON.stringify(str) : String(str)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-950/10 p-4 rounded-xl border border-gray-850/30">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-2">Weaknesses & Liabilities</span>
                <ul className="space-y-1.5">
                  {(Array.isArray(activeClient.aiCompanyProfile.weaknesses) ? activeClient.aiCompanyProfile.weaknesses : []).map((weak, idx) => (
                    <li key={idx} className="text-xs text-gray-300 font-medium flex items-start gap-1.5">
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <span>{typeof weak === 'object' ? JSON.stringify(weak) : String(weak)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-4">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-3">Top Prioritized Strategic CFO & CISO Actions</span>
              <ol className="space-y-2">
                {(Array.isArray(activeClient.aiCompanyProfile.topFiveRecommendedActions) ? activeClient.aiCompanyProfile.topFiveRecommendedActions : []).map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-300 font-medium flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{typeof rec === 'object' ? JSON.stringify(rec) : String(rec)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* AI Risk Advisor Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 glow-card shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="text-indigo-400" size={20} />
            <h3 className="font-bold text-white text-sm">AI operational Risk Advisor</h3>
          </div>
          {!advisorData && (
            <button
              onClick={onRunAdvisor}
              disabled={advisorLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {advisorLoading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>{advisorLoading ? 'Analyzing risks...' : 'Run Risk Analysis'}</span>
            </button>
          )}
        </div>

        {advisorLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Scanning balances, duplicate transactions, and firewall audits...</span>
          </div>
        )}

        {!advisorLoading && !advisorData && (
          <div className="py-6 text-center text-xs text-gray-500 font-medium">
            No active audit loaded. Click "Run Risk Analysis" to compile summaries using OpenAI capabilities.
          </div>
        )}

        {advisorData && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Executive Summary */}
            <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Executive Summary</span>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                {renderMarkdownContent(advisorData.summary)}
              </p>
            </div>

            {/* Warnings Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-950/20 border border-red-900/35 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <AlertCircle size={10} />
                  Financial Risk Warnings
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-gray-300 font-medium">
                  {advisorData.financialWarnings.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                  {advisorData.financialWarnings.length === 0 && (
                    <li className="text-gray-500 list-none -ml-4">No critical financial warning triggered.</li>
                  )}
                </ul>
              </div>

              <div className="bg-red-950/20 border border-red-900/35 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <Shield size={10} />
                  Cybersecurity Posture Warnings
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-gray-300 font-medium">
                  {advisorData.cybersecurityWarnings.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                  {advisorData.cybersecurityWarnings.length === 0 && (
                    <li className="text-gray-500 list-none -ml-4">No critical cybersecurity warnings.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Next actions & recommendations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Recommended Next Actions</span>
                <ul className="space-y-1.5 text-xs text-gray-300 font-medium">
                  {advisorData.nextActions.map((a: string, i: number) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="w-5 h-5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {i+1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Business Rationale & Ratios</span>
                <ul className="space-y-1.5 text-xs text-gray-300 font-medium">
                  {advisorData.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Clear advisor trigger */}
            <div className="flex justify-end pt-2">
              <button
                onClick={onResetAdvisor}
                className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Reset analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. FINANCIALS TAB VIEW
// ==========================================
function FinancialsTab({ 
  activeClient, 
  computed, 
  onUpdate 
}: { 
  activeClient: ClientProfile; 
  computed: ComputedRatios; 
  onUpdate: () => void; 
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...activeClient.financialMetrics });

  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Sync state with active client updates
  useEffect(() => {
    setFormData({ ...activeClient.financialMetrics });
  }, [activeClient]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/clients/${activeClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialMetrics: formData })
      });
      if (res.ok) {
        setEditing(false);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mock QuickBooks / CSV upload processing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // Simulate parsing QuickBooks CSV ledger export
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);

    // Add a couple of dummy transactions to state to represent QuickBooks ledger records
    try {
      const mockCSVTransactions = [
        { date: new Date().toISOString(), description: 'QuickBooks Export Invoice Ref #33', amount: 15400, category: 'Revenue' },
        { date: new Date().toISOString(), description: 'AWS Cloud Hosting Charge', amount: -1800, category: 'Operations' }
      ];

      await fetch(`/api/clients/${activeClient.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCSVTransactions)
      });

      // Boost assets/balance by parsed transactions count
      const updatedBalance = activeClient.financialMetrics.cash_balance + 13600;
      await fetch(`/api/clients/${activeClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          financialMetrics: { 
            cash_balance: updatedBalance,
            current_assets: activeClient.financialMetrics.current_assets + 13600 
          } 
        })
      });

      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Metrics Editor Panel */}
      <div className="col-span-2 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-300">Balance Sheet & Income Statement Ratios</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg cursor-pointer transition-colors"
              >
                Edit Parameters
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setFormData({ ...activeClient.financialMetrics }); }}
                  className="text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer"
                >
                  Save Metrics
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Current Assets ($)', key: 'current_assets' },
              { label: 'Current Liabilities ($)', key: 'current_liabilities' },
              { label: 'Inventory ($)', key: 'inventory' },
              { label: 'Total Debt ($)', key: 'total_debt' },
              { label: 'Total Equity ($)', key: 'total_equity' },
              { label: 'Cash Balance ($)', key: 'cash_balance' },
              { label: 'Monthly Burn Rate ($)', key: 'monthly_burn_rate' },
              { label: 'Monthly Revenue ($)', key: 'monthly_revenue' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 font-semibold mb-1">{label}</label>
                <input
                  type="number"
                  disabled={!editing}
                  value={(formData as any)[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: Number(e.target.value) })}
                  className="w-full bg-gray-950/60 border border-gray-800 disabled:bg-gray-900/40 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Upload File panel */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-500/5' 
              : 'border-gray-800 bg-gray-900/30'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-850 flex items-center justify-center mb-4">
            <Upload size={24} className="text-gray-400" />
          </div>
          <span className="text-sm font-bold text-white">Import QuickBooks exports or Bank CSV transactions</span>
          <span className="text-xs text-gray-500 mt-1 max-w-xs font-semibold">
            Drag & drop files here to parse ledgers and update financial metrics in real-time.
          </span>
          
          {uploadSuccess && (
            <div className="mt-4 p-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              <span>Parsed 2 transactions. Health scores updated.</span>
            </div>
          )}
        </div>
      </div>

      {/* Calculated Explanations Panel */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-gray-300">Automated Calculations & Explanations</h3>
        
        {[
          { title: 'Current Ratio (Liquidity)', value: computed.currentRatio, text: computed.explanations.currentRatio },
          { title: 'Quick Ratio (Acid Test)', value: computed.quickRatio, text: computed.explanations.quickRatio },
          { title: 'Debt Ratio (Solvency)', value: `${Math.round(computed.debtRatio * 100)}%`, text: computed.explanations.debtRatio },
          { title: 'Cash Runway', value: `${computed.cashRunway} months`, text: computed.explanations.cashRunway },
        ].map((item, idx) => (
          <div key={idx} className="bg-gray-900 border border-gray-850 p-4 rounded-xl space-y-1.5 shadow">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400 font-bold">{item.title}</span>
              <span className="text-base font-extrabold text-white">{item.value}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. CYBERSECURITY TAB VIEW
// ==========================================
function CybersecurityTab({ 
  activeClient, 
  computed, 
  onUpdate 
}: { 
  activeClient: ClientProfile; 
  computed: ComputedRatios; 
  onUpdate: () => void; 
}) {
  const [cyberData, setCyberData] = useState({ ...activeClient.cyberMetrics });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCyberData({ ...activeClient.cyberMetrics });
  }, [activeClient]);

  const handleToggle = (key: keyof typeof cyberData) => {
    const newVal = !cyberData[key];
    setCyberData(prev => ({ ...prev, [key]: newVal }));
  };

  const handleSelect = (key: keyof typeof cyberData, val: string) => {
    setCyberData(prev => ({ ...prev, [key]: val }));
  };

  const handleSlider = (val: number) => {
    setCyberData(prev => ({ ...prev, security_awareness_completion: val }));
  };

  const handleNumber = (key: keyof typeof cyberData, val: number) => {
    setCyberData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/clients/${activeClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cyberMetrics: cyberData })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Questionnaire Form */}
      <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-md">
        <h3 className="font-bold text-sm text-gray-300">MSP Security Assessment Checklist</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-950/40 rounded-xl border border-gray-800">
            <div>
              <span className="block text-xs font-bold text-white">Multi-Factor Authentication (MFA)</span>
              <span className="text-[10px] text-gray-500 font-semibold">Enforced across all admin and user accounts</span>
            </div>
            <button
              onClick={() => handleToggle('mfa_enabled')}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                cyberData.mfa_enabled ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                cyberData.mfa_enabled ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-950/40 rounded-xl border border-gray-800">
            <div>
              <span className="block text-xs font-bold text-white">Password Policy</span>
              <span className="text-[10px] text-gray-500 font-semibold">Complex lengths and mandatory periodic rotations</span>
            </div>
            <button
              onClick={() => handleToggle('password_policy_enabled')}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                cyberData.password_policy_enabled ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                cyberData.password_policy_enabled ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-950/40 rounded-xl border border-gray-800">
            <div>
              <span className="block text-xs font-bold text-white">Endpoint Threat Protection</span>
              <span className="text-[10px] text-gray-500 font-semibold">Antivirus/EDR active on all company laptops & servers</span>
            </div>
            <button
              onClick={() => handleToggle('endpoint_protection')}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                cyberData.endpoint_protection ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                cyberData.endpoint_protection ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Disaster Backups Status</label>
              <select
                value={cyberData.backup_status}
                onChange={(e) => handleSelect('backup_status', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="active">Active & Tested</option>
                <option value="outdated">Outdated (&gt; 30 days)</option>
                <option value="none">No Active Backups</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Software Patching Status</label>
              <select
                value={cyberData.patch_status}
                onChange={(e) => handleSelect('patch_status', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="current">Current & Up to Date</option>
                <option value="outdated">Outdated Patches</option>
                <option value="critical_missing">Critical Missing Patches</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Phishing Incidents (QTD)</label>
              <input
                type="number"
                value={cyberData.phishing_incidents_count}
                onChange={(e) => handleNumber('phishing_incidents_count', Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Open Vulnerabilities (CVE)</label>
              <input
                type="number"
                value={cyberData.open_vulnerabilities_count}
                onChange={(e) => handleNumber('open_vulnerabilities_count', Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
              <span>Security Awareness Training Completion</span>
              <span className="text-white">{cyberData.security_awareness_completion}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cyberData.security_awareness_completion}
              onChange={(e) => handleSlider(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Saves successfully applied!
            </span>
          )}
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-6 rounded-lg cursor-pointer shadow-md"
          >
            Apply Changes
          </button>
        </div>
      </div>

      {/* Cyber Score Explanations */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-gray-300">Operational Risk Summary</h3>

        <div className="bg-gray-900 border border-gray-850 p-6 rounded-2xl flex flex-col items-center">
          <RiskGauge score={computed.cyberRiskScore} title="Cyber Risk Score" type="cyber" size={130} />
          <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium text-center">
            Your Cyber Risk Score is computed by weighting missing critical controls like MFA and Endpoint threat coverage.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-850 p-4 rounded-xl space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Operational Resilience Impact</span>
          <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
            {computed.explanations.operationalRisk}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. VENDOR RISK TAB VIEW
// ==========================================
function VendorsTab({ 
  activeClient, 
  computed, 
  onUpdate 
}: { 
  activeClient: ClientProfile; 
  computed: ComputedRatios; 
  onUpdate: () => void; 
}) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  
  // New Vendor Form State
  const [vName, setVName] = useState('');
  const [vCrit, setVCrit] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [vHistory, setVHistory] = useState<'excellent' | 'good' | 'delayed' | 'critical'>('good');
  const [vScore, setVScore] = useState(80);
  const [vRenewal, setVRenewal] = useState('');
  const [vCountry, setVCountry] = useState('USA');

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;

    try {
      const res = await fetch(`/api/clients/${activeClient.id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vName,
          criticality: vCrit,
          payment_history: vHistory,
          security_score: vScore,
          contract_renewal: vRenewal,
          country: vCountry
        })
      });

      if (res.ok) {
        setShowAddVendor(false);
        setVName('');
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-gray-300">Vendor Management and Dependency Risks</h3>
          <p className="text-xs text-gray-500 font-semibold">Diversify suppliers to buffer against supply chain shocks and cybersecurity exposures.</p>
        </div>
        <button
          onClick={() => setShowAddVendor(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Vendor Partner</span>
        </button>
      </div>

      {/* Vendors Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-950/60 text-gray-400 font-bold border-b border-gray-800">
              <th className="p-4">Vendor Name</th>
              <th className="p-4">Criticality</th>
              <th className="p-4">Payment Health</th>
              <th className="p-4 text-center">Security Score</th>
              <th className="p-4">Renewal Contract</th>
              <th className="p-4">Country</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {activeClient.vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-850/30 transition-all font-medium text-gray-300">
                <td className="p-4 font-bold text-white">{vendor.name}</td>
                <td className="p-4">
                  <span className={`py-1 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    vendor.criticality === 'critical' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                    vendor.criticality === 'high' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                    'bg-gray-800/80 text-gray-400'
                  }`}>
                    {vendor.criticality}
                  </span>
                </td>
                <td className="p-4 capitalize">{vendor.payment_history}</td>
                <td className="p-4 text-center">
                  <span className={`font-bold ${
                    vendor.security_score < 60 ? 'text-red-400' :
                    vendor.security_score < 80 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {vendor.security_score}/100
                  </span>
                </td>
                <td className="p-4">{vendor.contract_renewal}</td>
                <td className="p-4">{vendor.country}</td>
              </tr>
            ))}
            {activeClient.vendors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-semibold">
                  No vendors registered. Click "Add Vendor Partner" to populate dependencies.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Dialog Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleAddVendor} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-white mb-4">Register Vendor Dependency</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 font-bold mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g. Amazon Web Services"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Criticality</label>
                <select
                  value={vCrit}
                  onChange={(e) => setVCrit(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Payment History</label>
                <select
                  value={vHistory}
                  onChange={(e) => setVHistory(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="delayed">Delayed</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Security Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vScore}
                  onChange={(e) => setVScore(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Country</label>
                <input
                  type="text"
                  value={vCountry}
                  onChange={(e) => setVCountry(e.target.value)}
                  placeholder="e.g. USA"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-gray-400 font-bold mb-1">Contract Renewal Date</label>
                <input
                  type="date"
                  required
                  value={vRenewal}
                  onChange={(e) => setVRenewal(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddVendor(false)}
                className="py-2 px-4 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer"
              >
                Add Partner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. FRAUD TAB VIEW
// ==========================================
function FraudTab({ 
  activeClient, 
  computed,
  onUpdate 
}: { 
  activeClient: ClientProfile; 
  computed: ComputedRatios;
  onUpdate: () => void; 
}) {
  const [showAddTx, setShowAddTx] = useState(false);
  const flagged = activeClient.transactions.filter(t => t.is_flagged);

  // New transaction Form State
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState('Cost of Goods Sold');
  const [dateStr, setDateStr] = useState('');

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amt) return;

    try {
      const res = await fetch(`/api/clients/${activeClient.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: desc,
          amount: -Math.abs(Number(amt)), // Outgoings represented as negative
          category: cat,
          date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()
        })
      });

      if (res.ok) {
        setShowAddTx(false);
        setDesc('');
        setAmt('');
        setDateStr('');
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Flagged Alerts list */}
      <div className="col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-gray-300">Automated Fraud Audit Ledger</h3>
            <p className="text-xs text-gray-500 font-semibold">Flags transactions triggered off-hours, duplicates, or unusual spending spikes.</p>
          </div>
          <button
            onClick={() => setShowAddTx(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <PlusCircle size={14} />
            <span>Add Test Transaction</span>
          </button>
        </div>

        {/* Flagged logs display */}
        <div className="space-y-4">
          {flagged.map(tx => (
            <div key={tx.id} className="bg-red-950/20 border border-red-900/40 p-5 rounded-2xl flex items-start gap-4 shadow pulse-danger animate-in slide-in-from-top-3 duration-300">
              <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-900 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-white">{tx.description}</span>
                  <span className="text-xs font-extrabold text-red-400">${tx.amount.toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-red-400/80 font-bold block bg-red-950/40 border border-red-900/25 px-2.5 py-1 rounded w-fit my-1 uppercase tracking-wide">
                  Flag: {tx.flag_reason}
                </span>
                <span className="text-[10px] text-gray-500 block">Recorded: {new Date(tx.date).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {flagged.length === 0 && (
            <div className="p-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl bg-gray-900/10 font-semibold">
              Excellent! No suspicious transaction patterns detected in recent ledger history.
            </div>
          )}
        </div>

        {/* Ledger table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mt-6">
          <div className="p-4 border-b border-gray-850 font-bold text-xs text-gray-400 uppercase tracking-wider">All Recent Bank Transactions</div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-950/40 text-gray-500 font-bold border-b border-gray-800">
                <th className="p-3">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-gray-300 font-medium">
              {activeClient.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-850/15">
                  <td className="p-3 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="p-3 flex items-center gap-1.5 font-bold text-white">
                    {tx.description}
                    {tx.is_flagged && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                  </td>
                  <td className="p-3">{tx.category}</td>
                  <td className={`p-3 text-right font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {tx.amount > 0 ? `+$${tx.amount.toLocaleString()}` : `-$${Math.abs(tx.amount).toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fraud logic rules advisor card */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-gray-300">Fraud Engine Audit Rules</h3>
        <div className="bg-gray-900 border border-gray-850 rounded-2xl p-5 space-y-4 shadow">
          <div>
            <span className="block text-xs font-bold text-white mb-1">1. Off-hours Activity Alert</span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
              Flags any bank wires or payments processed outside of standard business window hours (7:00 AM - 8:00 PM).
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold text-white mb-1">2. Double Invoice Matching</span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
              Flags duplicates where the description, category, and exact dollar amount match an invoice in the prior 48 hours.
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold text-white mb-1">3. Volume Spending Spikes</span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
              Flags singular transactions that exceed 4x the client's average historical outgoing payment sizes.
            </p>
          </div>
        </div>
      </div>

      {/* Add transaction modal */}
      {showAddTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleAddTx} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-white mb-4">Add Test Ledger Line</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Atlas Parts - Double Invoice"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Outlay Amount ($)</label>
                <input
                  type="number"
                  required
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  placeholder="e.g. 9500"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Category</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option>Cost of Goods Sold</option>
                  <option>Operations</option>
                  <option>Payroll</option>
                  <option>Software Licences</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">Custom Date/Time (Leave blank for now)</label>
                <input
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddTx(false)}
                className="py-2 px-4 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer"
              >
                Submit Outlay
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. DOCUMENTS RAG TAB VIEW
// ==========================================
function DocumentsTab({ 
  activeClient, 
  onUpdate,
  userRole
}: { 
  activeClient: ClientProfile; 
  onUpdate: () => void; 
  userRole: string;
}) {
  const isAdmin = userRole === 'admin';
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', activeClient.id);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully uploaded, parsed, and embedded "${file.name}" (${Math.round(data.characterCount / 1000)}k characters)`);
        onUpdate();
      } else {
        alert(`Upload Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during document uploading.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docContent) return;

    setUploading(true);
    try {
      const res = await fetch(`/api/clients/${activeClient.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: docName, file_type: 'TXT', content: docContent })
      });

      if (res.ok) {
        setDocName('');
        setDocContent('');
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/clients/${activeClient.id}/documents?docId=${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Document Uploader Form */}
      <div className="col-span-2 space-y-6">
        <form onSubmit={handleUploadDoc} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-gray-300 flex items-center gap-1.5">
            <FileCheck size={16} className="text-indigo-400" />
            Upload Document context (Mini RAG Knowledge Base)
          </h3>
          <p className="text-[10px] text-gray-500 font-semibold -mt-2">
            Upload policies, contracts, cybersecurity audits, SOC2 reports, and insurance agreements to embed them.
          </p>

          {!isAdmin && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/35 rounded-xl text-indigo-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>View-Only Mode: You are logged in as an Analyst. Uploading and embedding documents is restricted to Administrators.</span>
            </div>
          )}

          {/* Premium Selector */}
          <div className="border border-dashed border-gray-800 rounded-xl p-4 bg-gray-950/30 hover:border-indigo-650 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative">
            <Upload size={18} className="text-indigo-400 mb-2 shrink-0" />
            <span className="text-xs font-bold text-gray-200 block">Select document file (PDF, DOCX, TXT)</span>
            <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">Automated server text extraction & vector similarity embedding</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              disabled={!isAdmin || uploading}
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-850" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-wider">
              <span className="bg-gray-900 px-3 text-gray-500 font-bold">Or paste raw text context</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-bold mb-1">Document Title</label>
            <input
              type="text"
              required
              disabled={!isAdmin || uploading}
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. microsoft_licence_agreement.pdf"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-bold mb-1">Document text Content</label>
            <textarea
              rows={5}
              required
              disabled={!isAdmin || uploading}
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Paste policy contents or legal provisions here..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isAdmin || uploading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-xs py-2 px-6 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Chunking & Indexing...' : 'Upload & Embed'}
            </button>
          </div>
        </form>

        {/* Uploaded Documents List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
          <div className="p-4 border-b border-gray-850 font-bold text-xs text-gray-400">Indexed Document Catalog ({activeClient.documents.length})</div>
          <div className="divide-y divide-gray-800">
            {activeClient.documents.map((doc) => (
              <div key={doc.id} className="p-4 flex justify-between items-center hover:bg-gray-850/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-900/30 border border-indigo-750 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{doc.name}</span>
                    <span className="text-[10px] text-gray-500 block">Indexed on: {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                 {isAdmin && (
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {activeClient.documents.length === 0 && (
              <div className="p-8 text-center text-gray-500 font-semibold text-xs">
                No custom policies loaded yet. Index files to enable specific chatbot questions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested RAG queries */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-gray-300">Try these RAG Questions</h3>
        <div className="bg-gray-900 border border-gray-850 rounded-2xl p-5 space-y-4 shadow">
          <p className="text-xs text-gray-400 font-semibold leading-normal">
            After uploading a document, use the **Chatbot widget** at the bottom right to trigger semantic retrieval.
          </p>
          <div className="space-y-2 text-xs">
            <span className="font-bold text-gray-500 uppercase tracking-wider block">Sample Prompts:</span>
            {[
              `"What insurance coverage do we currently have?"`,
              `"When does our Microsoft agreement expire?"`,
              `"What is our debt-to-equity ratio?"`,
              `"Which vendors require MFA?"`
            ].map((p, idx) => (
              <div key={idx} className="p-2 bg-gray-950 rounded-lg border border-gray-850 text-indigo-400 font-medium font-mono text-[10px] break-words">
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. ADMIN PANEL TAB VIEW
// ==========================================
function AdminTab({ 
  clients, 
  onUpdate, 
  userRole,
  onEditClient,
  onDeleteClient
}: { 
  clients: ClientProfile[]; 
  onUpdate: () => void; 
  userRole: string; 
  onEditClient?: (client: ClientProfile) => void;
  onDeleteClient?: (id: string) => void;
}) {
  const [orgName, setOrgName] = useState('RiskPulse MSP Partners');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invited, setInvited] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInvited(true);
    setTimeout(() => {
      setInvited(false);
      setInviteEmail('');
    }, 2000);
  };

  const handleDeleteClientProfile = async (id: string) => {
    if (userRole !== 'admin') {
      alert('Action Denied: MSP Analyst does not have delete administrative permissions.');
      return;
    }
    if (onDeleteClient) {
      onDeleteClient(id);
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this client portfolio? This deletes historical ledger caches.')) return;
    
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mock admin usage statistics
  const adminStats = [
    { name: 'Jan', queries: 24, uploads: 5 },
    { name: 'Feb', queries: 45, uploads: 8 },
    { name: 'Mar', queries: 78, uploads: 12 },
    { name: 'Apr', queries: 92, uploads: 15 },
    { name: 'May', queries: 140, uploads: 22 },
    { name: 'Jun', queries: 198, uploads: 28 },
  ];

  const isAdmin = userRole === 'admin';

  return (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300">
      {!isAdmin && (
        <div className="col-span-3 p-4 bg-indigo-950/30 border border-indigo-900/35 rounded-2xl text-indigo-400 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>View-Only Mode: You are logged in as an MSP Analyst. Administrative controls (company management, invites, configuration settings) are restricted to Administrators.</span>
        </div>
      )}

      <div className="col-span-2 space-y-6">
        {/* Organization config */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-gray-300 flex items-center gap-1.5">
            <Building size={16} className="text-indigo-400" />
            MSP Organization settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">MSP Partner Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 disabled:opacity-50 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">License Tier</label>
              <input
                type="text"
                disabled
                value="Enterprise Multi-Tenant"
                className="w-full bg-gray-900 border border-gray-800 disabled:text-indigo-400 rounded-lg py-2 px-3 text-xs focus:outline-none font-bold"
              />
            </div>
          </div>
        </div>

        {/* Invite Users */}
        <form onSubmit={handleInvite} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-gray-300">Invite Team Analysts</h3>
          <div className="flex gap-2">
            <input
              type="email"
              required
              disabled={!isAdmin}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="analyst-name@msp.com"
              className="flex-1 bg-gray-950 border border-gray-800 disabled:opacity-50 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-medium"
            />
            <button
              type="submit"
              disabled={!isAdmin}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-850 text-white font-bold text-xs py-2 px-6 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Send Invite
            </button>
          </div>
          {invited && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Invite link sent!
            </span>
          )}
        </form>

        {/* Client Portfolios List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
          <div className="p-4 border-b border-gray-850 font-bold text-xs text-gray-400">Manage Monitored Client Portfolios ({clients.length})</div>
          <div className="divide-y divide-gray-800">
            {clients.map((c) => (
              <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-850/10">
                <div>
                  <span className="text-xs font-bold text-white block">{c.name}</span>
                  <span className="text-[10px] text-gray-500 block">{c.industry} Sector</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditClient?.(c)}
                      title="Edit client details"
                      className="text-gray-500 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteClientProfile(c.id)}
                      title="Delete client profile"
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage statistics */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-gray-300">MSP Platform Usage</h3>
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg">
          <span className="text-xs text-gray-400 font-bold block mb-4">Monthly API RAG Queries</span>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adminStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                <Bar dataKey="queries" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. SITUATIONAL AI ADVISOR TAB VIEW
// ==========================================
function SituationalTab({ 
  activeClient, 
  activeSim, 
  setActiveSim,
  computed,
  setComputed,
  clients = [],
  onSelectClient
}: { 
  activeClient: ClientProfile; 
  activeSim: string | null; 
  setActiveSim: (simId: string | null) => void; 
  computed: ComputedRatios | null;
  setComputed: React.Dispatch<React.SetStateAction<ComputedRatios | null>>;
  clients?: ClientProfile[];
  onSelectClient?: (clientId: string) => void;
}) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'scenarios' | 'scoping' | 'library'>('scenarios');
  const [phase, setPhase] = useState<'setup' | 'interview' | 'analysis' | 'playbooks'>('setup');
  
  // 532 Threat Scenarios Matrix state
  const [scenariosList, setScenariosList] = useState<Scenario[]>(DEFAULT_SCENARIOS || []);
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(false);
  const [scenarioSearch, setScenarioSearch] = useState<string>('');
  const [scenarioCategory, setScenarioCategory] = useState<string>('All');
  const [scenarioUrgency, setScenarioUrgency] = useState<string>('All');
  const [scenarioSort, setScenarioSort] = useState<'match' | 'urgency' | 'title'>('match');
  const [scenarioPage, setScenarioPage] = useState<number>(1);
  const itemsPerPage = 24;

  // Setup inputs
  const [compName, setCompName] = useState(activeClient?.name || '');
  const [industry, setIndustry] = useState('');
  const [compSize, setCompSize] = useState('Mid-size (50-250 employees)');
  const [businessModel, setBusinessModel] = useState('');

  // Diagnostic states
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answerHistory, setAnswerHistory] = useState<{ questionText: string; answer: string }[]>([]);
  const [answerInput, setAnswerInput] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  // Report & playbooks states
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);
  const [playbooksList, setPlaybooksList] = useState<any[]>([]);
  const [selectedPlaybookIdx, setSelectedPlaybookIdx] = useState(0);

  // Loading states
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(false);

  // Library States
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [selectedLibPlaybookIdx, setSelectedLibPlaybookIdx] = useState<number>(0);
  const [selectedLibScenario, setSelectedLibScenario] = useState<any | null>(null);
  const [liveAnalysisLoading, setLiveAnalysisLoading] = useState<boolean>(false);
  const [liveAnalysisData, setLiveAnalysisData] = useState<any | null>(null);

  // Fetch scenarios from API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadScenarios() {
      try {
        setLoadingScenarios(true);
        const res = await fetch('/api/situational/scenarios');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setScenariosList(data);
          }
        }
      } catch (err) {
        console.warn('Could not refresh scenarios from API, using default seed:', err);
      } finally {
        if (isMounted) setLoadingScenarios(false);
      }
    }
    loadScenarios();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    setScenarioPage(1);
  }, [scenarioSearch, scenarioCategory, scenarioUrgency, scenarioSort]);

  // Pre-fill suggestions
  const industriesList = ['Cybersecurity & MSP', 'FinTech / Lending', 'Retail / E-commerce', 'Healthcare Services', 'Logistics / Supply Chain', 'SaaS / Cloud Software'];
  const sizesList = ['Small (< 50 employees)', 'Mid-size (50-250 employees)', 'Large (250-1000 employees)', 'Enterprise (> 1000 employees)'];

  // Static Library Playbooks Data
  const DEFAULT_PLAYBOOKS = [
    {
      id: 'pb-financial',
      title: 'Financial Crisis & Liquidity Playbook',
      category: 'Financial',
      overview: 'Operational playbook for managing cash runway squeezes, revenue collapses, customer defaults, and emergency funding cycles.',
      description: 'Provides standardized contingency plans to optimize working capital, negotiate vendor extensions, and establish credit facilities under severe cash distress.',
      triggerConditions: 'Cash runway < 6 months, customer concentration > 35%, or monthly burn rate > monthly revenue.',
      riskLevel: 'High',
      recommendedActions: 'Freeze discretionary spending, audit recurring SaaS tools, execute accounts receivable factoring, and establish bank lines of credit.',
      aiAnalysis: 'Cash flow volatility represents the leading cause of business insolvencies. High concentration in single-customer revenue pools exposes the business to massive payment-delay vulnerability.',
      decisionTree: 'Runway > 6 months: Continue standard operations. Runway 3-6 months: Implement 15% CapEx/OpEx freeze. Runway < 3 months: Freeze hiring, negotiate Net 60 vendor terms, factor outstanding invoices.',
      preventiveMeasures: 'Maintain a minimum 6-month cash reserve, diversify client portfolio so no single account represents >20% revenue, and secure standby credit lines.',
      recoveryPlan: 'Liquidity recovery phase: Restructure short-term debt, negotiate extended vendor payment terms, and launch immediate upsell promotions to existing clients.',
      expectedOutcomes: 'Preservation of baseline solvency, prevention of payroll defaults, and extension of cash runway by 3-4 months.',
      kpis: 'Cash Runway (Months), Days Sales Outstanding (DSO), Working Capital Ratio, Burn Rate.',
      scenarios: [
        {
          id: 'sc-runway-squeeze',
          title: 'Cash Runway Squeeze',
          context: 'The company is experiencing a rapid cash burn relative to cash reserves, jeopardizing payroll and core vendor payments within the short term.',
          description: 'Cash runway has dropped below the critical threshold. Operating expenses remain elevated while monthly revenue is insufficient to cover standard liabilities.',
          rootCause: 'High fixed overhead cost structure combined with delayed client payments (high DSO) and flat month-over-month revenue growth.',
          severity: 'Critical',
          recommendedResponse: 'Implement an immediate freeze on all non-essential hiring and travel. Execute invoice factoring for outstanding receivables. Negotiate Net-60 terms with major suppliers.',
          alternativeActions: 'Draw down on existing revolving lines of credit, or initiate short-term working capital loans from bridge lending partners.',
          bestPractices: 'Establish a rolling 13-week cash flow forecasting model updated weekly by the finance controller.',
          lessonsLearned: 'Waiting until cash runway drops below 2 months to negotiate credit lines results in unfavorable interest rates and unfavorable terms.',
          similarScenarios: 'Top Customer Invoice Default, Inflation-Driven OpEx Squeeze',
          impactMetrics: 'Extends cash runway by 2.5 months, increases short-term interest expense by 1.2%, reduces discretionary OpEx by 18%.'
        },
        {
          id: 'sc-customer-default',
          title: 'Top Customer Invoice Default',
          context: 'A key client representing a significant portion of revenue fails to pay outstanding invoices or files for bankruptcy, cutting off immediate cash inflows.',
          description: 'The largest customer accounts for a substantial portion of total revenue. A sudden payment default creates an immediate cash flow gap.',
          rootCause: 'Inadequate customer credit scoring, high client concentration, and failure to purchase accounts receivable insurance.',
          severity: 'Critical',
          recommendedResponse: 'Initiate formal collections proceedings, dispute claims in bankruptcy court, and immediately freeze any active custom project deliverables for this client.',
          alternativeActions: 'Sell the non-performing debt to a collections agency at a discount to recover partial cash immediately.',
          bestPractices: 'Set strict credit limits for individual customers and run semi-annual Dun & Bradstreet risk evaluations.',
          lessonsLearned: 'Failing to diversify the customer portfolio makes core operational cash flows extremely fragile.',
          similarScenarios: 'Cash Runway Squeeze, Competitor Aggressive Underpricing',
          impactMetrics: 'Reduces monthly cash inflows by 35%, increases debt write-offs, drops overall business health score by 15 points.'
        },
        {
          id: 'sc-vendor-squeeze',
          title: 'Vendor Pricing Squeeze',
          context: 'A critical supplier or single-source software host raises subscription pricing or materials costs by 20%+, driving up burn rates.',
          description: 'Key vendor leverages high switching costs to enforce a significant price increase, squeezing operating margins.',
          rootCause: 'Lack of secondary vendors, multi-year lock-in without fixed price caps, and failure to negotiate inflation index boundaries.',
          severity: 'Medium',
          recommendedResponse: 'Negotiate bulk-purchase discounts in exchange for longer contract terms. Request quotes from alternative vendors to build negotiation leverage.',
          alternativeActions: 'Pass the price increase down to customers via a temporary raw-material or software hosting surcharge.',
          bestPractices: 'Always identify and pre-qualify a secondary supplier for every critical operational dependency.',
          lessonsLearned: 'Centralizing critical business workflows with a single vendor without price guarantees invites price gouging.',
          similarScenarios: 'Supply Chain Disruption, Critical Vendor Bankruptcy',
          impactMetrics: 'Increases monthly burn rate by 8%, decreases gross margins by 4.5%.'
        }
      ]
    },
    {
      id: 'pb-cybersecurity',
      title: 'Cybersecurity Breach & Incident Playbook',
      category: 'Cybersecurity',
      overview: 'Standardized protocols for responding to ransomware attacks, administrative credentials phishing, and vulnerability exploits.',
      description: 'Defines incident command structures, legal notifications, technical containment procedures, and automated backup restorations.',
      triggerConditions: 'Unusual network traffic anomalies, disabled MFA alerts, phishing escalation reports, or CVE patch announcements.',
      riskLevel: 'Critical',
      recommendedActions: 'Isolate affected servers, revoke administrative API tokens, disable network tunnels, and initiate offline backup validation.',
      aiAnalysis: 'Administrative credential hijacking remains the number one entry vector for corporate ransomware groups. Security awareness deficits exacerbate phishing vulnerability.',
      decisionTree: 'Minor leak: Reset passwords, run antivirus scan. Major breach: Activate incident response plan, contain network segments, notify insurance. Extortion: Refuse payout, deploy clean backups.',
      preventiveMeasures: 'Mandate hardware-based MFA for all logins, enforce strict 90-day patch policies, and maintain disconnected/immutable daily backups.',
      recoveryPlan: 'Isolate compromised endpoints, rebuild active directory, deploy immutable backups, and audit user permission logs.',
      expectedOutcomes: 'Containment of security breaches within 6 hours, minimization of data leak parameters, and compliance with data breach disclosure laws.',
      kpis: 'Mean Time to Contain (MTTC), Patch Latency (Days), Security Training Rate, Vulnerability Backlog.',
      scenarios: [
        {
          id: 'sc-ransomware',
          title: 'Ransomware Extortion Attack',
          context: 'A malicious actor gains local administrative access, encrypts core databases, and demands cryptocurrency payment to unlock files.',
          description: 'Critical servers are inaccessible, data files are encrypted, and a text extortion note is left on internal systems.',
          rootCause: 'Lack of endpoint monitoring, disabled Multi-Factor Authentication on remote access portals, and delayed patch updates.',
          severity: 'Critical',
          recommendedResponse: 'Immediately disconnect local database servers from the network. Notify cyber liability insurance carriers and activate the forensic team. Refuse ransom negotiation and validate offline backup integrity.',
          alternativeActions: 'Assess the cost-benefit of payment if backups are damaged, under strict guidance of corporate legal counsel.',
          bestPractices: 'Isolate operations using a Zero-Trust network architecture and maintain a dedicated cold site server.',
          lessonsLearned: 'Relying on a single cloud hosting provider without a separated local backup leaves the company highly vulnerable.',
          similarScenarios: 'MFA Disabled Account Compromise, CVE-255 Kernel Exploit',
          impactMetrics: 'Stops operational database accessibility for 36 hours, incurs forensic investigator fees, risks legal compliance compliance warnings.'
        },
        {
          id: 'sc-mfa-compromise',
          title: 'MFA Disabled Account Compromise',
          context: 'An administrative user account lacking active MFA gets targeted by a targeted phishing campaign, leading to configuration hijacking.',
          description: 'A key administrative user falls victim to credential harvesting. The attacker logs in, disables login policies, and starts generating API tokens.',
          rootCause: 'Failure to enforce global conditional access policies mandating MFA on all administrative user roles.',
          severity: 'High',
          recommendedResponse: 'Revoke the compromised user session immediately. Delete all API keys and secondary admin profiles generated during the breach window. Enforce a global password reset and activate MFA.',
          alternativeActions: 'Lock all administrative console access temporarily until a hardware keys audit is finished.',
          bestPractices: 'Set up automated alerts in Azure AD or Google Workspace that trigger whenever a user disables security settings.',
          lessonsLearned: 'Allowing even a single user profile to bypass MFA controls opens a massive back door for threat actors.',
          similarScenarios: 'Ransomware Extortion Attack, Insider Data Exfiltration',
          impactMetrics: 'Compromises system configuration control, risks database leak, drops Cybersecurity posture rating by 25 points.'
        },
        {
          id: 'sc-cve-exploit',
          title: 'CVE-2026-9912 Kernel RCE Vulnerability',
          context: 'An active exploit is discovered in the wild targeting CVE-2026-9912, allowing remote code execution on internal application hosts.',
          description: 'Security vulnerability database publishes a CVSS 9.8 vulnerability. Attackers are scanning public IP blocks to exploit unpatched systems.',
          rootCause: 'Extended patch management delays and failure to run routine server vulnerability scans.',
          severity: 'High',
          recommendedResponse: 'Apply the official vendor security patch to all affected web servers immediately. Review server access logs for any indicators of pre-patch web attacks.',
          alternativeActions: 'If the patch cannot be deployed immediately, isolate the application servers behind a strict web application firewall.',
          bestPractices: 'Automate weekly vulnerability scans and maintain a dev-staging-production pipeline for rapid security patching.',
          lessonsLearned: 'Lagging behind official vendor patch announcements by more than 7 days exposes servers to automated script exploits.',
          similarScenarios: 'Ransomware Extortion Attack, Cloud Hosting Core Outage',
          impactMetrics: 'Risks server remote takeover, requires 8 hours of administrative downtime, fixes vulnerability point additions.'
        }
      ]
    },
    {
      id: 'pb-operational',
      title: 'Operational & Supply Chain Resilience Playbook',
      category: 'Operational',
      overview: 'Strategic roadmap for mitigating vendor bankruptcies, core cloud hosting outages, and key employee departures.',
      description: 'Details secondary source vendor onboarding checklists, data migration templates, and redundant infrastructure staging.',
      triggerConditions: 'Supplier delivery delays, database latency spikes, key personnel resignation notices, or SLA failures.',
      riskLevel: 'High',
      recommendedActions: 'Maintain a warm backup server on a separate cloud host, sign SLA guarantees with critical vendors, and implement cross-training programs.',
      aiAnalysis: 'Single-source dependencies represent the highest operational bottleneck risk. Restructuring standard workflows to avoid key-person dependencies reduces operational failure rates by 70%.',
      decisionTree: 'Vendor delay < 5 days: Alert internal team. Delay 5-15 days: Activate secondary supplier. Vendor bankruptcy: Transition 100% of operations to pre-qualified backups.',
      preventiveMeasures: 'Cross-train key operational functions, audit vendor SLA conformance monthly, and keep redundant production components in reserve.',
      recoveryPlan: 'Migrate active tasks to secondary suppliers, spin up warm backup servers, and assign emergency team leads.',
      expectedOutcomes: 'Maintenance of delivery agreements under vendor default, 99.9% application availability, and minimization of operational downtime.',
      kpis: 'Vendor Concentration (%), Server Availability (%), Key Person Redundancy Rate, SLA Violation Counts.',
      scenarios: [
        {
          id: 'sc-vendor-bankruptcy',
          title: 'Critical Vendor Sudden Bankruptcy',
          context: 'Your primary logistics or manufacturing vendor files for Chapter 7 bankruptcy and halts operations without prior warning.',
          description: 'Core inventory deliveries are frozen, raw materials supply chains stop, and critical shipments to clients are delayed.',
          rootCause: 'Failure to perform vendor financial risk audits and lack of pre-qualified backup suppliers.',
          severity: 'Critical',
          recommendedResponse: 'Activate your emergency agreement with your pre-qualified secondary supplier. Contact the bankruptcy trustee to retrieve trapped inventory. Notify affected clients of schedule changes.',
          alternativeActions: 'Negotiate a temporary high-rate contract with a local shipping company to prevent immediate inventory delivery collapse.',
          bestPractices: 'Perform annual credit and financial health reviews on all critical vendors representing >15% OpEx.',
          lessonsLearned: 'Relying exclusively on one logistics provider to save on costs exposes the entire distribution model to sudden collapse.',
          similarScenarios: 'Vendor Pricing Squeeze, Cloud Hosting Core Outage',
          impactMetrics: 'Delays inventory distributions by 12 days, increases shipping costs by 22%, risks customer attrition.'
        },
        {
          id: 'sc-cloud-outage',
          title: 'Cloud Hosting Core Outage',
          context: 'The main data center of your primary cloud host experiences a major fire or fiber cut, taking down your user console for 24+ hours.',
          description: 'Client databases are offline, staff cannot access web services, and dashboard monitoring throws connection timeout errors.',
          rootCause: 'Lack of multi-region database replication and failover hosting architecture.',
          severity: 'High',
          recommendedResponse: 'Redirect domain traffic to a backup status page. Spin up your standby cloud host instances using your offsite backup images. Restore user databases from the latest daily offsite snapshot.',
          alternativeActions: 'Utilize local staging servers to run manual operations for critical users during the cloud provider outage.',
          bestPractices: 'Deploy application services across multiple cloud providers (Multi-Cloud) or at least across separate geographical regions.',
          lessonsLearned: 'Trusting a single cloud zone to run all business-critical workloads invites catastrophic operational downtime.',
          similarScenarios: 'CVE-255 Kernel Exploit, Critical Vendor Sudden Bankruptcy',
          impactMetrics: 'Disrupts database accessibility for 18 hours, increases client support ticket volume by 400%, risks SLA compliance penalties.'
        },
        {
          id: 'sc-key-person',
          title: 'Key Personnel Sudden Departure',
          context: 'A lead developer or principal consultant with exclusive knowledge of custom database structures resigns to join a competitor.',
          description: 'Critical code documentation is missing, core database passwords are undocumented, and pending project milestones are stalled.',
          rootCause: 'Lack of structured knowledge transfers, poor code documentation requirements, and single-point database admin access.',
          severity: 'Medium',
          recommendedResponse: 'Conduct an immediate exit audit to retrieve active credentials. Delegate system administration tasks to a senior team member. Mandate that all code updates undergo peer review and documentation cycles.',
          alternativeActions: 'Retain the departing developer as an external advisor at an hourly consulting rate for a 30-day transition period.',
          bestPractices: 'Implement mandatory documentation guidelines and ensure every administrative role has a trained secondary backup employee.',
          lessonsLearned: 'Allowing a single employee to possess exclusive access to key systems creates an unacceptable operational vulnerability.',
          similarScenarios: 'MFA Disabled Account Compromise, Regulatory Compliance Non-Compliance Fine',
          impactMetrics: 'Stalls pending project deadlines by 4 weeks, increases onboarding expenses, reduces operational momentum.'
        }
      ]
    },
    {
      id: 'pb-strategic',
      title: 'Market & Strategic Posture Playbook',
      category: 'Strategic',
      overview: 'Playbook for addressing competitor underpricing, IP infringement allegations, and inflation-driven cost increases.',
      description: 'Helps businesses evaluate market shifts, pivot services to high-margin niches, and implement dynamic product pricing adjustments.',
      triggerConditions: 'Competitor price drops, decline in lead conversion rates, raw materials inflation, or lawyer warning letters.',
      riskLevel: 'Medium',
      recommendedActions: 'Focus on high-value custom packages, consult legal counsel on patent filings, and establish dynamic index pricing.',
      aiAnalysis: 'Attempting to compete on raw price alone in a commodity market results in margin erosion. Pivot focus to proprietary features, custom SLAs, and high switching costs.',
      decisionTree: 'Price war: Focus on premium service layers. IP claim: Verify patent search database, execute non-disclosure audits. Cost squeeze: Implement supplier pricing index triggers.',
      preventiveMeasures: 'Acquire defensive patents, maintain price review guidelines, and secure long-term client contracts with price escalation clauses.',
      recoveryPlan: 'Restructure pricing tiers, launch value-add upsell options, and initiate defensive legal counter-actions.',
      expectedOutcomes: 'Preservation of net profit margins, protection of intellectual property, and stabilization of customer retention.',
      kpis: 'Gross Profit Margin (%), Customer Retention Rate (CRR), Competitor Price Variance, Customer Acquisition Cost (CAC).',
      scenarios: [
        {
          id: 'sc-competitor-price',
          title: 'Competitor Aggressive Price Squeeze',
          context: 'A venture-backed competitor launches a copycat product at a 40% discount, targeting your primary client base.',
          description: 'Client loss rates increase, sales leads demand price concessions, and gross operating profit margins contract.',
          rootCause: 'Lack of custom features or services that differentiate the product, making it easy for customers to switch to a cheaper alternative.',
          severity: 'High',
          recommendedResponse: 'Do not enter a price war. Launch high-tier custom service SLAs and dedicated account management packages. Highlight your security audits and compliance certifications.',
          alternativeActions: 'Create a cheaper, feature-restricted basic tier to capture price-sensitive leads without diluting premium margins.',
          bestPractices: 'Build strong customer relationships and integrate deep API configurations into client operations to raise switching costs.',
          lessonsLearned: 'Failing to establish a clear, non-commodity value proposition leaves the business highly vulnerable to price competition.',
          similarScenarios: 'Top Customer Invoice Default, Inflation-Driven OpEx Squeeze',
          impactMetrics: 'Increases customer attrition by 12%, reduces average contract value, pushes marketing budget upward.'
        },
        {
          id: 'sc-ip-claim',
          title: 'Intellectual Property Claim',
          context: 'A large competitor issues a formal cease-and-desist letter alleging that your main web application violates their software patents.',
          description: 'Corporate counsel flags high legal defense fees, prospective enterprise deals are stalled due to IP disputes, and key product updates are delayed.',
          rootCause: 'Failure to perform formal freedom-to-operate patent searches during the initial application design phase.',
          severity: 'High',
          recommendedResponse: 'Engage a specialized patent attorney to review the claims. Identify potential prior art to invalidate the competitor\'s claims. Initiate confidential settlement negotiations.',
          alternativeActions: 'Design a rapid software patch to bypass the specific patented code modules without impacting system performance.',
          bestPractices: 'Maintain a defensive patent portfolio and require all engineering teams to review patent filings regularly.',
          lessonsLearned: 'Ignoring competitive patent databases during early staging cycles results in extremely expensive legal claims later.',
          similarScenarios: 'Key Personnel Sudden Departure, Regulatory Compliance Non-Compliance Fine',
          impactMetrics: 'Increases legal administrative expenses, delays pending contracts, risks software rework.'
        },
        {
          id: 'sc-inflation-squeeze',
          title: 'Inflation-Driven OpEx Squeeze',
          context: 'A sudden spike in utility rates, software hosting, and labor costs increases operational expenditures by 15% within a single quarter.',
          description: 'Gross operating profits drop, cash runway shortens, and cash flow projections indicate a net loss by the next fiscal quarter.',
          rootCause: 'Fixed-price customer agreements without inflation adjustment clauses and lack of recurring software license audits.',
          severity: 'Medium',
          recommendedResponse: 'Implement a strict audit of all software SaaS licenses and eliminate unused accounts. Add standard annual price adjustment index clauses to all new client contracts.',
          alternativeActions: 'Transition non-core operational tasks to qualified outsourcing partners to control labor costs.',
          bestPractices: 'Establish a rolling quarterly review of fixed overhead costs to identify optimization targets.',
          lessonsLearned: 'Signing long-term contracts without inflation protections leads to margin erosion when overhead costs rise.',
          similarScenarios: 'Cash Runway Squeeze, Vendor Pricing Squeeze',
          impactMetrics: 'Reduces net profit margin by 6%, increases monthly burn rate, accelerates cash consumption.'
        }
      ]
    },
    {
      id: 'pb-compliance',
      title: 'HR & Compliance Risk Playbook',
      category: 'Compliance & HR',
      overview: 'Playbook for managing regulatory compliance audits, data privacy investigations, and workplace safety incidents.',
      description: 'Establishes clear procedures for internal audits, documenting regulatory compliance, and addressing employee training gaps.',
      triggerConditions: 'Audit notices from regulatory bodies, database compliance compliance warnings, or low security awareness training completion.',
      riskLevel: 'Medium',
      recommendedActions: 'Conduct monthly internal audits, enforce compliance training completions, and document data privacy procedures.',
      aiAnalysis: 'Non-compliance with data privacy regulations (e.g. HIPAA, GDPR) leads to severe financial fines. Maintaining updated compliance logs protects the firm from operational liability.',
      decisionTree: 'Minor violation: Implement self-correction, update training logs. Regulatory audit: Form audit response team, prepare documentation, engage external compliance counsel.',
      preventiveMeasures: 'Mandate compliance training for all staff, automate document version controls, and conduct annual external risk audits.',
      recoveryPlan: 'Remediate compliance gaps immediately, submit correction plans to auditors, and re-train staff.',
      expectedOutcomes: 'Successful completion of regulatory audits, zero compliance fines, and 100% staff training completion rates.',
      kpis: 'Compliance Rate (%), Staff Training Rate (%), Active Vulnerabilities count, Open Audit Findings.',
      scenarios: [
        {
          id: 'sc-compliance-audit',
          title: 'Regulatory Audit & Compliance Investigation',
          context: 'Your company receives a formal notice of a regulatory compliance audit regarding data privacy controls and server logs.',
          description: 'State auditors demand access to system log files, data processing agreements, and security policy documents within 10 business days.',
          rootCause: 'Lack of centralized policy documentation and incomplete employee training tracking records.',
          severity: 'High',
          recommendedResponse: 'Form a dedicated audit response team led by the compliance officer. Gather all data processing agreements and policy documents. Identify and document any compliance gaps along with a clear correction plan.',
          alternativeActions: 'Request a formal extension of the audit timeline to allow the team to complete documentation updates.',
          bestPractices: 'Maintain a compliance documentation portal updated in real-time as policies change.',
          lessonsLearned: 'Failing to keep documentation organized in centralized portals makes responding to audits highly stressful and increases compliance warnings.',
          similarScenarios: 'Intellectual Property Claim, Remote Security Awareness Deficit',
          impactMetrics: 'Requires 40 hours of team coordination, risks compliance fines, reduces operational capacity.'
        },
        {
          id: 'sc-training-deficit',
          title: 'Remote Security Awareness Deficit',
          context: 'An audit flags that employee security awareness training completion has dropped below 40%, violating client contract compliance covenants.',
          description: 'A major customer threatens contract termination unless employee security awareness training completion reaches 90% within 30 days.',
          rootCause: 'Lack of automated reminders, poor supervisor tracking, and boring training content that employees avoid.',
          severity: 'Medium',
          recommendedResponse: 'Deploy a modernized security awareness training module. Automate weekly reminder emails to non-compliant staff. Report progress metrics to the client weekly.',
          alternativeActions: 'Schedule a mandatory team-wide live training session to achieve immediate completion compliance.',
          bestPractices: 'Link annual employee bonuses or performance reviews to the completion of mandatory security training.',
          lessonsLearned: 'Treating security training as optional leads to low compliance rates and client contract defaults.',
          similarScenarios: 'MFA Disabled Account Compromise, Regulatory Audit & Compliance Investigation',
          impactMetrics: 'Requires 30 days of training tracking, improves compliance rating by 15 points, reduces user security risk.'
        }
      ]
    }
  ];

  // Helper to adapt text dynamically to company profile
  const adaptText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/the company/gi, compName || activeClient.name)
      .replace(/The client/gi, compName || activeClient.name)
      .replace(/your company/gi, compName || activeClient.name)
      .replace(/your business/gi, compName || activeClient.name);
  };

  // Start scoping assessment and get Q1
  const handleStartAssessment = async () => {
    if (!compName.trim() || !industry.trim() || !businessModel.trim()) {
      alert('Please fill out the Company Name, Industry, and Core Business Model.');
      return;
    }
    setLoadingInit(true);
    setPhase('interview');
    setAnswerHistory([]);
    setAnswerInput('');
    setWarningMessage('');
    setCurrentQuestion(null);
    try {
      const res = await fetch('/api/situational/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init_assessment',
          companyProfile: {
            name: compName,
            industry,
            size: compSize,
            businessModel
          }
        })
      });
      const data = await res.json();
      if (data.success && data.question) {
        setCurrentQuestion(data.question);
        setQuestions([data.question]);
      } else {
        alert(data.error || 'Failed to initialize strategic risk audit.');
        setPhase('setup');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to RiskPulse custom engine.');
      setPhase('setup');
    } finally {
      setLoadingInit(false);
    }
  };

  // Submit dynamic Q&A response
  const handleSubmitAnswer = async () => {
    const answer = answerInput.trim();
    if (!answer) {
      alert('Please enter a response.');
      return;
    }

    if (currentQuestion.type === 'open_ended' && answer.length < 15) {
      setWarningMessage('Notice: Providing a detailed explanation of your dependencies, vendors, or critical tools will help compile a much more accurate risk playbook.');
      return;
    }

    setLoadingAnswer(false);
    setWarningMessage('');
    
    const updatedHistory = [
      ...answerHistory,
      { questionText: currentQuestion.text, answer }
    ];
    setAnswerHistory(updatedHistory);
    setAnswerInput('');
    setLoadingAnswer(true);

    try {
      const res = await fetch('/api/situational/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_answer',
          companyProfile: {
            name: compName,
            industry,
            size: compSize,
            businessModel
          },
          history: updatedHistory,
          currentAnswer: answer
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.canProceed) {
          setPhase('analysis');
          setLoadingPlaybooks(true);
          try {
            const repRes = await fetch('/api/situational/custom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'generate_playbooks',
                companyProfile: {
                  name: compName,
                  industry,
                  size: compSize,
                  businessModel
                },
                history: updatedHistory
              })
            });
            const repData = await repRes.json();
            if (repData.success && repData.analysis && repData.playbooks) {
              setAnalysisReport(repData.analysis);
              setPlaybooksList(repData.playbooks);
              setSelectedPlaybookIdx(0);
            } else {
              alert('Could not compile playbooks.');
              setPhase('setup');
            }
          } catch (e) {
            console.error(e);
            setPhase('setup');
          } finally {
            setLoadingPlaybooks(false);
          }
        } else if (data.followUpQuestion) {
          setCurrentQuestion(data.followUpQuestion);
          setQuestions(prev => [...prev, data.followUpQuestion]);
        }
      } else {
        alert('Diagnostic process encountered an error.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating assessment logs.');
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleReset = () => {
    setPhase('setup');
    setIndustry('');
    setBusinessModel('');
    setQuestions([]);
    setCurrentQuestion(null);
    setAnswerHistory([]);
    setAnswerInput('');
    setAnalysisReport(null);
    setPlaybooksList([]);
    setSelectedPlaybookIdx(0);
  };

  // Perform Live Real-time AI Analysis on a scenario from the library
  const handleTriggerLiveAnalysis = async (scenario: any) => {
    setLiveAnalysisLoading(true);
    setLiveAnalysisData(null);
    try {
      const res = await fetch('/api/situational/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_live_scenario_analysis',
          companyProfile: {
            name: activeClient.name,
            industry: activeClient.businessProfile?.industry || 'MSP Client Services'
          },
          clientMetrics: {
            cashBalance: activeClient.financialMetrics.cash_balance,
            monthlyRevenue: activeClient.financialMetrics.monthly_revenue,
            monthlyBurn: activeClient.financialMetrics.monthly_burn_rate,
            mfaEnabled: activeClient.cyberMetrics.mfa_enabled,
            backupStatus: activeClient.cyberMetrics.backup_status,
            openCVEs: activeClient.cyberMetrics.open_vulnerabilities_count
          },
          scenario
        })
      });
      const data = await res.json();
      if (data.success) {
        setLiveAnalysisData(data);
      } else {
        alert('Failed to trigger live AI simulation analysis.');
      }
    } catch (err) {
      console.error(err);
      alert('Error conducting live AI assessment.');
    } finally {
      setLiveAnalysisLoading(false);
    }
  };

  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-950/80 text-red-400 border-red-900/60';
      case 'High':
        return 'bg-amber-955/80 text-amber-400 border-amber-900/60';
      case 'Medium':
        return 'bg-yellow-955/80 text-yellow-400 border-yellow-900/60';
      default:
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-900/60';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'financial':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
      case 'cybersecurity':
        return 'bg-purple-950/40 text-purple-400 border-purple-800/60';
      case 'operational':
        return 'bg-blue-950/40 text-blue-400 border-blue-800/60';
      case 'combined':
        return 'bg-amber-955/40 text-amber-400 border-amber-800/60';
      default:
        return 'bg-gray-800/60 text-gray-300 border-gray-700';
    }
  };

  // Helper to evaluate a condition against current client metrics
  const evaluateCondition = (cond: any) => {
    const comp = computed || computeMetrics(activeClient.financialMetrics, activeClient.cyberMetrics);
    const bp = activeClient.businessProfile;
    let val: any = null;
    switch (cond.field) {
      case 'runway': val = comp.cashRunway; break;
      case 'mfa': val = activeClient.cyberMetrics.mfa_enabled; break;
      case 'customer_concentration': val = activeClient.financialMetrics.customer_concentration; break;
      case 'vendor_concentration': val = activeClient.financialMetrics.vendor_concentration; break;
      case 'employees': val = bp?.numEmployees || 25; break;
      case 'insurance': val = bp?.cyberInsurance || 'yes'; break;
      case 'training': val = activeClient.cyberMetrics.security_awareness_completion; break;
      case 'net_income': val = activeClient.financialMetrics.net_income; break;
      case 'vulnerabilities': val = activeClient.cyberMetrics.open_vulnerabilities_count; break;
      case 'backup': val = activeClient.cyberMetrics.backup_status; break;
      case 'late_payment_percentage': val = activeClient.financialMetrics.late_payment_percentage; break;
      case 'industry': val = activeClient.industry; break;
      default: return false;
    }
    if (cond.operator === 'lt') return Number(val) < Number(cond.value);
    if (cond.operator === 'gt') return Number(val) > Number(cond.value);
    if (cond.operator === 'eq') return val === cond.value;
    if (cond.operator === 'neq') return val !== cond.value;
    if (cond.operator === 'lte') return Number(val) <= Number(cond.value);
    if (cond.operator === 'gte') return Number(val) >= Number(cond.value);
    return false;
  };

  // Helper to calculate similarity / risk match with active client
  const calculateScenarioMatch = (sc: any) => {
    if (!sc.conditions || sc.conditions.length === 0) return 40;
    const fieldWeights: Record<string, number> = {
      runway: 30,
      net_income: 20,
      customer_concentration: 15,
      vendor_concentration: 15,
      mfa: 20,
      backup: 15,
      training: 15,
      vulnerabilities: 15,
      employees: 10,
      insurance: 15,
      late_payment_percentage: 15,
      industry: 25
    };

    let totalWeight = 0;
    let matchedWeight = 0;

    for (const cond of sc.conditions) {
      const weight = fieldWeights[cond.field] || 10;
      totalWeight += weight;
      if (evaluateCondition(cond)) {
        matchedWeight += weight;
      }
    }

    let baseScore = totalWeight === 0 ? 40 : Math.round((matchedWeight / totalWeight) * 100);

    // Apply corporate identity and industry relevance scoring so each company has distinct, customized situations:
    const titleLower = (sc.title || '').toLowerCase();
    const indLower = (activeClient.industry || '').toLowerCase();
    const clientId = activeClient.id;

    // 1. Medix Diagnostics (Indian Clinical Pathology & Healthcare)
    if (clientId === 'client-apex-medix' || indLower.includes('health') || indLower.includes('diag')) {
      if (sc.id?.startsWith('sc-medix-') || titleLower.includes('dpdp') || titleLower.includes('biometric') || titleLower.includes('reagent') || titleLower.includes('panel') || titleLower.includes('healthcare')) {
        baseScore += 35;
      }
      if (titleLower.includes('scada') || titleLower.includes('manufacturing') || titleLower.includes('retail') || titleLower.includes('pos terminal')) {
        baseScore -= 45;
      }
    }
    // 2. Acme Industrial (Manufacturing & Industrial Tools)
    else if (clientId === 'client-acme' || indLower.includes('manufact')) {
      if (sc.id === 'sc-acme-scada-lockout' || titleLower.includes('scada') || titleLower.includes('machinery') || titleLower.includes('manufacturing') || titleLower.includes('cnc')) {
        baseScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('retail') || titleLower.includes('pos terminal') || titleLower.includes('health')) {
        baseScore -= 45;
      }
    }
    // 3. Apex Retail Stores (Consumer Retail & Overseas Supply)
    else if (clientId === 'client-apex' || indLower.includes('retail')) {
      if (sc.id?.startsWith('sc-apex-retail-') || titleLower.includes('supplier monopoly') || titleLower.includes('pos terminal') || titleLower.includes('retail') || titleLower.includes('cargo')) {
        baseScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('scada') || titleLower.includes('manufacturing') || titleLower.includes('health')) {
        baseScore -= 45;
      }
    }
    // 4. Stark Energy (CleanTech & Energy Grid)
    else if (clientId === 'client-stark' || indLower.includes('energy') || indLower.includes('clean')) {
      if (sc.id === 'sc-stark-grid-compliance' || titleLower.includes('grid') || titleLower.includes('energy') || titleLower.includes('cleantech')) {
        baseScore += 35;
      }
      if (titleLower.includes('dpdp') || titleLower.includes('scada') || titleLower.includes('supplier monopoly')) {
        baseScore -= 45;
      }
    }

    // Isolation for signature scenarios
    if (sc.id?.startsWith('sc-medix-') && clientId !== 'client-apex-medix') baseScore -= 70;
    if (sc.id?.startsWith('sc-acme-') && clientId !== 'client-acme') baseScore -= 70;
    if (sc.id?.startsWith('sc-apex-retail-') && clientId !== 'client-apex') baseScore -= 70;
    if (sc.id?.startsWith('sc-stark-') && clientId !== 'client-stark') baseScore -= 70;

    return Math.max(10, Math.min(100, baseScore));
  };

  // Filtered and sorted scenarios
  const filteredScenarios = scenariosList.filter((sc: any) => {
    const matchesCat = scenarioCategory === 'All' || sc.category?.toLowerCase() === scenarioCategory.toLowerCase();
    const matchesUrg = scenarioUrgency === 'All' || sc.urgency?.toLowerCase() === scenarioUrgency.toLowerCase();
    const q = scenarioSearch.trim().toLowerCase();
    const matchesSearch = !q || 
      (sc.title && sc.title.toLowerCase().includes(q)) || 
      (sc.description && sc.description.toLowerCase().includes(q)) || 
      (sc.potentialImpact && sc.potentialImpact.toLowerCase().includes(q)) ||
      (sc.category && sc.category.toLowerCase().includes(q));
    return matchesCat && matchesUrg && matchesSearch;
  });

  const sortedScenarios = [...filteredScenarios].sort((a: any, b: any) => {
    if (scenarioSort === 'match') {
      return calculateScenarioMatch(b) - calculateScenarioMatch(a);
    }
    if (scenarioSort === 'urgency') {
      const order: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (order[b.urgency] || 0) - (order[a.urgency] || 0);
    }
    return (a.title || '').localeCompare(b.title || '');
  });

  const totalPages = Math.ceil(sortedScenarios.length / itemsPerPage) || 1;
  const paginatedScenarios = sortedScenarios.slice((scenarioPage - 1) * itemsPerPage, scenarioPage * itemsPerPage);

  const scenarioCounts = {
    All: scenariosList.length,
    Financial: scenariosList.filter(s => s.category?.toLowerCase() === 'financial').length,
    Cybersecurity: scenariosList.filter(s => s.category?.toLowerCase() === 'cybersecurity').length,
    Operational: scenariosList.filter(s => s.category?.toLowerCase() === 'operational').length,
    Combined: scenariosList.filter(s => s.category?.toLowerCase() === 'combined').length
  };

  // Filter playbooks based on category and search query
  const filteredPlaybooks = DEFAULT_PLAYBOOKS.filter(pb => {
    const matchesCategory = libraryCategory === 'All' || pb.category.toLowerCase() === libraryCategory.toLowerCase();
    const matchesSearch = pb.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
                          pb.overview.toLowerCase().includes(librarySearch.toLowerCase()) ||
                          pb.scenarios.some(sc => sc.title.toLowerCase().includes(librarySearch.toLowerCase()) || sc.context.toLowerCase().includes(librarySearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Sleek Sub-tab Switcher */}
      <div className="flex flex-wrap bg-gray-950 border border-gray-805 p-1 rounded-2xl w-max gap-1 font-sans">
        <button
          onClick={() => setMainTab('scenarios')}
          className={`py-2 px-5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'scenarios'
              ? 'bg-indigo-650 text-white shadow shadow-indigo-600/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles size={14} />
          <span>Threat Scenarios Matrix ({scenariosList.length})</span>
        </button>
        <button
          onClick={() => setMainTab('scoping')}
          className={`py-2 px-5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'scoping'
              ? 'bg-indigo-650 text-white shadow shadow-indigo-600/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search size={14} />
          <span>Strategic Risk Diagnostic</span>
        </button>
        <button
          onClick={() => setMainTab('library')}
          className={`py-2 px-5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'library'
              ? 'bg-indigo-650 text-white shadow shadow-indigo-600/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BookOpen size={14} />
          <span>Executive Playbook Frameworks</span>
        </button>
      </div>

      {/* SUBTAB 0: THREAT SCENARIOS MATRIX (532 SCENARIOS) */}
      {mainTab === 'scenarios' && (
        <div className="space-y-6 animate-in fade-in duration-200 font-sans">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-wrap gap-4 justify-between items-center shadow-lg font-sans">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shrink-0">
                <ShieldAlert size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">
                    Global Threat Scenarios & Stress-Test Matrix
                  </h3>
                  <span className="text-[9px] bg-indigo-600/20 text-indigo-400 border border-indigo-600/40 px-2.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider">
                    {scenariosList.length} Situations Indexed
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Browse and stress-test comprehensive industry risk situations across Financial Liquidity, Ransomware/Cyber Posture, and Supply Chain vectors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href="/situations.json"
                download="situations.json"
                className="bg-gray-850 hover:bg-gray-800 text-xs text-indigo-350 hover:text-white px-4 py-2.5 rounded-xl border border-gray-750 font-bold transition-all cursor-pointer flex items-center gap-2 shadow"
              >
                <Download size={14} />
                <span>Export JSON Database ({scenariosList.length})</span>
              </a>
            </div>
          </div>

          {/* Quick Presentation Switcher: Compare Different Companies */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 font-sans">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/90 border border-indigo-800/70 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Contrast Simulation
                </span>
                <span className="text-sm font-extrabold text-white whitespace-nowrap">
                  Compare Company Risk Portfolios
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Switch profiles to observe how 532 situational threats re-rank in real time based on each company&apos;s financial and cyber posture.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectClient ? onSelectClient('client-acme') : router.push(`/dashboard?client=client-acme&tab=situational`)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-between sm:justify-start gap-2.5 ${
                  activeClient.id === 'client-acme'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Factory size={14} className={activeClient.id === 'client-acme' ? 'text-white' : 'text-gray-400'} />
                  <span>Acme Industrial</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/70 text-red-300 font-mono font-bold whitespace-nowrap">
                  Ransomware & Burn
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectClient ? onSelectClient('client-apex') : router.push(`/dashboard?client=client-apex&tab=situational`)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-between sm:justify-start gap-2.5 ${
                  activeClient.id === 'client-apex'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <ShoppingCart size={14} className={activeClient.id === 'client-apex' ? 'text-white' : 'text-gray-400'} />
                  <span>Apex Retail</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 font-mono font-bold whitespace-nowrap">
                  Supplier Monopoly
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectClient ? onSelectClient('client-apex-medix') : router.push(`/dashboard?client=client-apex-medix&tab=situational`)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-between sm:justify-start gap-2.5 ${
                  activeClient.id === 'client-apex-medix'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Stethoscope size={14} className={activeClient.id === 'client-apex-medix' ? 'text-white' : 'text-purple-400'} />
                  <span>Medix Diagnostics</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 font-mono font-bold whitespace-nowrap">
                  DPDP & Debt
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectClient ? onSelectClient('client-stark') : router.push(`/dashboard?client=client-stark&tab=situational`)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-between sm:justify-start gap-2.5 ${
                  activeClient.id === 'client-stark'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Zap size={14} className={activeClient.id === 'client-stark' ? 'text-white' : 'text-emerald-400'} />
                  <span>Stark Energy</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 font-mono font-bold whitespace-nowrap">
                  Flush & Safe
                </span>
              </button>
            </div>
          </div>

          {/* Active Client Evaluation Context Banner */}
          <div className="bg-gray-900/80 border border-gray-800 px-5 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-gray-400">
              <span className="font-bold text-gray-300 whitespace-nowrap">Live Client Baseline:</span>
              <span className="font-extrabold text-white bg-gray-800 px-2 py-0.5 rounded whitespace-nowrap">{activeClient.name}</span>
              <span className="text-gray-600">•</span>
              <span className="whitespace-nowrap">Cash: <strong className="text-white">${activeClient.financialMetrics.cash_balance.toLocaleString()}</strong></span>
              <span className="text-gray-600">•</span>
              <span className="whitespace-nowrap">Runway: <strong className="text-white">{(computed?.cashRunway ?? 0).toFixed(1)} mo</strong></span>
              <span className="text-gray-600">•</span>
              <span className="whitespace-nowrap">MFA: <strong className={activeClient.cyberMetrics.mfa_enabled ? "text-emerald-400" : "text-red-400"}>{activeClient.cyberMetrics.mfa_enabled ? 'Active' : 'Disabled'}</strong></span>
              <span className="text-gray-600">•</span>
              <span className="whitespace-nowrap">Open CVEs: <strong className={activeClient.cyberMetrics.open_vulnerabilities_count > 0 ? "text-amber-400" : "text-emerald-400"}>{activeClient.cyberMetrics.open_vulnerabilities_count}</strong></span>
            </div>
            <div className="text-[11px] text-indigo-400 font-bold flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
              <span>Dynamic Telemetry Risk Correlation Active</span>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search size={15} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="text"
                  value={scenarioSearch}
                  onChange={(e) => setScenarioSearch(e.target.value)}
                  placeholder="Search 500+ situations by title, threat, CVE..."
                  className="w-full bg-gray-955 border border-gray-800 rounded-xl py-2.5 pl-10 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-semibold"
                />
                {scenarioSearch && (
                  <button
                    onClick={() => setScenarioSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-gray-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Urgency & Sort Selectors */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Urgency:</span>
                  <select
                    value={scenarioUrgency}
                    onChange={(e) => setScenarioUrgency(e.target.value)}
                    className="bg-gray-955 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Urgencies</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                  <select
                    value={scenarioSort}
                    onChange={(e) => setScenarioSort(e.target.value as any)}
                    className="bg-gray-955 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="match">Highest Risk Match ({activeClient.name})</option>
                    <option value="urgency">Urgency (Critical First)</option>
                    <option value="title">Title (A - Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-850">
              {(['All', 'Financial', 'Cybersecurity', 'Operational', 'Combined'] as const).map((cat) => {
                const count = scenarioCounts[cat] || 0;
                const isSelected = scenarioCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setScenarioCategory(cat)}
                    className={`text-xs font-black border px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-650 border-indigo-500 text-white shadow shadow-indigo-600/30'
                        : 'bg-gray-955 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-indigo-900/60 text-indigo-200' : 'bg-gray-850 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex justify-between items-center text-xs text-gray-400 px-1">
            <span>
              Showing <strong className="text-white">{sortedScenarios.length > 0 ? (scenarioPage - 1) * itemsPerPage + 1 : 0}</strong> - <strong className="text-white">{Math.min(scenarioPage * itemsPerPage, sortedScenarios.length)}</strong> of <strong className="text-white">{sortedScenarios.length}</strong> matching situations
            </span>
            <span>
              Page <strong className="text-white">{scenarioPage}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>
          </div>

          {/* Scenarios Grid */}
          {paginatedScenarios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedScenarios.map((sc: any) => {
                const matchScore = calculateScenarioMatch(sc);
                const isHighRisk = matchScore >= 70;
                const isMediumRisk = matchScore >= 40 && matchScore < 70;
                
                return (
                  <div
                    key={sc.id}
                    onClick={() => {
                      setSelectedLibScenario(sc);
                      setLiveAnalysisData(null);
                      setLiveAnalysisLoading(false);
                    }}
                    className={`bg-gray-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
                      isHighRisk
                        ? 'border-red-900/40 hover:border-red-500/70 hover:shadow-red-950/20'
                        : isMediumRisk
                        ? 'border-amber-900/40 hover:border-amber-500/70 hover:shadow-amber-950/20'
                        : 'border-gray-800 hover:border-indigo-500/60 hover:shadow-indigo-950/20'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Badges Row */}
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[9px] font-black border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getCategoryBadge(sc.category)}`}>
                          {sc.category}
                        </span>
                        <span className={`text-[9px] font-black border px-2 py-0.5 rounded-full uppercase ${getUrgencyBadge(sc.urgency || sc.severity)}`}>
                          {sc.urgency || sc.severity}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-extrabold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                        {sc.title}
                      </h4>

                      {/* Real-time Match Indicator */}
                      <div className="bg-gray-955/80 border border-gray-850 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400 font-bold">Client Threat Correlation:</span>
                          <span className={`font-black ${
                            isHighRisk ? 'text-red-400' : isMediumRisk ? 'text-amber-400' : 'text-indigo-400'
                          }`}>
                            {matchScore}% Match
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${matchScore}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-gray-500 font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighRisk ? 'bg-red-400' : isMediumRisk ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                            <span className={isHighRisk ? 'text-red-400' : isMediumRisk ? 'text-amber-400' : 'text-gray-400'}>
                              {isHighRisk ? 'Critical Exposure' : isMediumRisk ? 'Moderate Impact' : 'Low Correlation'}
                            </span>
                          </span>
                          <span className="text-gray-400">{activeClient.name}</span>
                        </div>
                      </div>

                      {/* Description / Potential Impact */}
                      <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-3">
                        {sc.description || sc.potentialImpact}
                      </p>

                      {/* Conditions tags */}
                      {sc.conditions && sc.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sc.conditions.slice(0, 3).map((c: any, cIdx: number) => {
                            const isTriggered = evaluateCondition(c);
                            return (
                              <span
                                key={cIdx}
                                className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${
                                  isTriggered
                                    ? 'bg-red-950/40 text-red-300 border-red-900/60'
                                    : 'bg-gray-955 text-gray-400 border-gray-800'
                                }`}
                              >
                                {c.field} {c.operator} {c.value}
                              </span>
                            );
                          })}
                          {sc.conditions.length > 3 && (
                            <span className="text-[9px] text-gray-500 font-bold self-center">
                              +{sc.conditions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-gray-850/80 pt-3 mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 group-hover:underline flex items-center gap-1">
                        Inspect Situation & Run AI Audit
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {sc.id}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-gray-500 font-semibold bg-gray-900 border border-gray-800 rounded-2xl font-sans space-y-3">
              <p>No situations matched your search and filter criteria.</p>
              <button
                onClick={() => {
                  setScenarioSearch('');
                  setScenarioCategory('All');
                  setScenarioUrgency('All');
                }}
                className="bg-gray-800 hover:bg-gray-700 text-xs text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-bold"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-850">
              <button
                disabled={scenarioPage <= 1}
                onClick={() => setScenarioPage(p => Math.max(1, p - 1))}
                className="bg-gray-900 hover:bg-gray-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white px-4 py-2 rounded-xl border border-gray-800 font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - scenarioPage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="text-gray-600 px-1 text-xs">...</span>}
                        <button
                          onClick={() => setScenarioPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            scenarioPage === p
                              ? 'bg-indigo-650 border-indigo-500 text-white shadow shadow-indigo-600/30'
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                disabled={scenarioPage >= totalPages}
                onClick={() => setScenarioPage(p => Math.min(totalPages, p + 1))}
                className="bg-gray-900 hover:bg-gray-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white px-4 py-2 rounded-xl border border-gray-800 font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 1: SCOPING WIZARD */}
      {mainTab === 'scoping' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner Indicator */}
          <div className="bg-gradient-to-r from-indigo-955/40 via-purple-955/20 to-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-wrap gap-4 justify-between items-center shadow-lg font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-900/30 border border-indigo-755 flex items-center justify-center text-indigo-400 shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  Strategic Risk Scoping & Diagnostics
                  <span className="text-[9px] bg-indigo-650/20 text-indigo-400 border border-indigo-700/50 px-2 py-0.5 rounded-full font-mono uppercase font-black tracking-wider font-sans">
                    Active Audit
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-sans">Adaptive corporate auditing and scenario-specific contingency mapping.</p>
              </div>
            </div>
            {phase !== 'setup' && (
              <button
                onClick={handleReset}
                className="bg-gray-850 hover:bg-gray-800 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-gray-800 font-bold transition-all cursor-pointer font-sans"
              >
                Restart Assessment
              </button>
            )}
          </div>

          {/* PHASE 1: SETUP INPUTS */}
          {phase === 'setup' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto animate-in fade-in duration-250 font-sans">
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Company Risk Profile Scoper</h4>
                <p className="text-xs text-gray-450 font-semibold leading-relaxed">Scopes your operations to generate customized risk playbooks. No assumptions or generic templates.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Company / Client Name</label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="e.g. Acme Industrial Corp"
                    className="w-full bg-gray-955 border border-gray-850 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Industry Classification</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare Logistics, Fintech"
                    className="w-full bg-gray-955 border border-gray-855 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {industriesList.map(ind => (
                      <button
                        key={ind}
                        onClick={() => setIndustry(ind)}
                        className="text-[9px] bg-gray-955 hover:bg-gray-850 border border-gray-850 px-2.5 py-1 rounded text-gray-400 hover:text-white font-bold transition-all cursor-pointer font-sans"
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Company Size</label>
                  <select
                    value={compSize}
                    onChange={(e) => setCompSize(e.target.value)}
                    className="w-full bg-gray-955 border border-gray-850 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    {sizesList.map(sz => (
                      <option key={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Core Business Model & Key Operations</label>
                  <textarea
                    rows={3}
                    value={businessModel}
                    onChange={(e) => setBusinessModel(e.target.value)}
                    placeholder="Describe your revenue model, core services, critical software tools, and customer dependencies..."
                    className="w-full bg-gray-955 border border-gray-855 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleStartAssessment}
                  disabled={loadingInit}
                  className="w-full bg-indigo-650 hover:bg-indigo-550 disabled:bg-indigo-900 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-center gap-1.5 font-sans"
                >
                  {loadingInit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Configuring custom audit vectors...</span>
                    </>
                  ) : (
                    <span>Initialize Custom Risk Audit</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2: ADAPTIVE Q&A INTERVIEW */}
          {phase === 'interview' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 font-sans">
              {loadingInit ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center animate-pulse">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 font-semibold">Consultant compiling target questions...</span>
                </div>
              ) : (
                currentQuestion && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-855 pb-3">
                      <span>Interactive Audit Phase</span>
                      <span className="text-indigo-400 font-black">Diagnostic Question {questions.length}</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Audit Question:</span>
                      <p className="text-sm text-white font-bold leading-relaxed">{currentQuestion.text}</p>
                    </div>

                    <div className="space-y-4 font-sans">
                      {currentQuestion.type === 'open_ended' && (
                        <textarea
                          rows={4}
                          value={answerInput}
                          onChange={(e) => {
                            setAnswerInput(e.target.value);
                            setWarningMessage('');
                          }}
                          placeholder="Describe details regarding operations, software stack, runway, or vendor concentrations..."
                          className="w-full bg-gray-955 border border-gray-855 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium leading-relaxed"
                        />
                      )}

                      {currentQuestion.type === 'yes_no' && (
                        <div className="grid grid-cols-2 gap-3">
                          {['Yes', 'No'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => {
                                setAnswerInput(opt);
                                setWarningMessage('');
                              }}
                              className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                answerInput === opt
                                  ? 'border-indigo-500 bg-indigo-950/20 text-white font-extrabold shadow'
                                  : 'bg-gray-955/30 border-gray-850 text-gray-450 hover:border-gray-700 hover:bg-gray-955/50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'rating_scale') && (
                        <div className="grid grid-cols-1 gap-2">
                          {currentQuestion.options?.map((opt: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setAnswerInput(opt);
                                setWarningMessage('');
                              }}
                              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold leading-relaxed transition-all cursor-pointer flex gap-3 ${
                                answerInput === opt
                                  ? 'border-indigo-500 bg-indigo-950/20 text-white font-extrabold'
                                  : 'bg-gray-955/30 border-gray-850 text-gray-455 hover:border-gray-700 hover:bg-gray-955/50'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                answerInput === opt ? 'bg-indigo-650 text-white' : 'bg-gray-850 text-gray-500'
                              }`}>
                                {idx + 1}
                              </span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {warningMessage && (
                        <div className="bg-amber-955/15 border border-amber-900/40 p-3 rounded-xl text-[10px] text-amber-400 font-semibold font-sans animate-fade-in">
                          {warningMessage}
                        </div>
                      )}

                      <button
                        onClick={handleSubmitAnswer}
                        disabled={loadingAnswer || !answerInput.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:opacity-50 text-white font-black text-xs py-2.5 rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 font-sans"
                      >
                        {loadingAnswer ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Evaluating response profile...</span>
                          </>
                        ) : (
                          <span>Submit strategy response</span>
                        )}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* PHASE 3: COMPILING RESULTS AND ANALYSIS */}
          {phase === 'analysis' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 font-sans">
              {loadingPlaybooks ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center animate-pulse">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 font-bold">
                    Strategic Consulting Board aggregating data, risks, and threat intelligence...
                  </span>
                </div>
              ) : (
                analysisReport && (
                  <div className="space-y-6 animate-in fade-in duration-200 font-sans">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-indigo-400 border-b border-gray-855 pb-3">
                      <span>AI Business Analysis Log</span>
                      <span className="bg-indigo-955/80 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded font-mono uppercase font-black text-[9px]">
                        Status: Audit Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-955/30 border border-emerald-950 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span>Identified Strengths</span>
                        </span>
                        <ul className="space-y-1.5 pl-1.5">
                          {analysisReport.strengths?.map((s: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-300 font-semibold flex items-start gap-1">
                              <span className="text-emerald-400 mt-1.5 shrink-0 text-[6px]">▪</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gray-955/30 border border-amber-955 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Core Weaknesses</span>
                        </span>
                        <ul className="space-y-1.5 pl-1.5">
                          {analysisReport.weaknesses?.map((w: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-300 font-semibold flex items-start gap-1">
                              <span className="text-amber-400 mt-1.5 shrink-0 text-[6px]">▪</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-955/30 border border-red-950 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <ShieldAlert size={12} className="shrink-0" />
                          <span>Primary Threats & Risks</span>
                        </span>
                        <ul className="space-y-1.5 pl-1.5">
                          {analysisReport.risks?.map((r: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-300 font-semibold flex items-start gap-1">
                              <span className="text-red-400 mt-1.5 shrink-0 text-[6px]">▪</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gray-955/30 border border-indigo-950 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <TrendingUp size={12} className="shrink-0" />
                          <span>Strategic Opportunities</span>
                        </span>
                        <ul className="space-y-1.5 pl-1.5">
                          {analysisReport.opportunities?.map((o: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-300 font-semibold flex items-start gap-1">
                              <span className="text-indigo-400 mt-1.5 shrink-0 text-[6px]">▪</span>
                              <span>{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gray-955/40 border border-gray-850 p-4 rounded-xl space-y-4 text-xs leading-relaxed font-semibold">
                      <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-0.5 font-sans">Operational Flow Patterns:</span>
                        <p className="text-gray-350">{analysisReport.operationalPatterns}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-0.5 font-sans">Financial Risk considerations:</span>
                        <p className="text-gray-350">{analysisReport.financialConsiderations}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-0.5 font-sans">Industry-Specific Challenges:</span>
                        <p className="text-gray-350">{analysisReport.industrySpecificChallenges}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPhase('playbooks')}
                      className="w-full bg-indigo-650 hover:bg-indigo-550 text-white font-black text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      <span>Access Custom Risk Playbooks</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* PHASE 4: CUSTOM SITUATIONAL RISK PLAYBOOKS DASHBOARD */}
          {phase === 'playbooks' && playbooksList.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-sans">
              {/* LEFT SIDEBAR: LIST OF PLAYBOOKS */}
              <div className="lg:col-span-2 space-y-3">
                <span className="block text-[10px] font-black text-gray-450 uppercase tracking-widest pl-1 mb-2">Available Playbooks</span>
                {playbooksList.map((pb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPlaybookIdx(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 ${
                      selectedPlaybookIdx === idx
                        ? 'bg-indigo-955/20 border-indigo-700/60 shadow-lg shadow-indigo-950/40 text-white font-extrabold'
                        : 'bg-gray-900 border-gray-805 text-gray-400 hover:border-gray-700 hover:bg-gray-900/80'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full gap-2 shrink-0">
                      <span className="text-xs font-black leading-snug">{pb.title}</span>
                      <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full shrink-0 ${getUrgencyBadge(pb.riskLevel)}`}>
                        {pb.riskLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold leading-relaxed line-clamp-2">
                      {pb.relevance}
                    </p>
                  </button>
                ))}

                <div className="bg-gray-900 border border-gray-855 p-4 rounded-2xl mt-6 text-center space-y-2">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">Assessment Company</span>
                  <div className="text-xs text-white font-extrabold leading-none">{compName}</div>
                  <div className="text-[10px] text-gray-455 mt-1 font-semibold">{industry}</div>
                </div>
              </div>

              {/* RIGHT VIEW: EXPANDED PLAYBOOK DETAILS */}
              <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
                {/* Header Details */}
                <div className="border-b border-gray-855 pb-4 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider block w-max mb-1.5">
                      Playbook Scenario {selectedPlaybookIdx + 1}
                    </span>
                    <h4 className="text-sm font-black text-white leading-tight font-sans">
                      {playbooksList[selectedPlaybookIdx].title}
                    </h4>
                  </div>
                  <span className={`text-[9px] font-black border px-2.5 py-1 rounded-full shrink-0 ${getUrgencyBadge(playbooksList[selectedPlaybookIdx].riskLevel)}`}>
                    Risk Level: {playbooksList[selectedPlaybookIdx].riskLevel}
                  </span>
                </div>

                {/* Overview */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block font-sans font-black">Situation Overview</span>
                  <p className="text-xs text-gray-300 font-semibold leading-relaxed font-sans">
                    {playbooksList[selectedPlaybookIdx].overview}
                  </p>
                </div>

                {/* Relevance & Business/Financial Impact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-955/40 border border-indigo-950 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block font-sans font-black">Why Relevant</span>
                    <p className="text-xs text-gray-350 font-semibold leading-relaxed">
                      {playbooksList[selectedPlaybookIdx].relevance}
                    </p>
                  </div>

                  <div className="bg-gray-955/40 border border-red-955 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block font-sans font-black">Financial & Business Impact</span>
                    <p className="text-xs text-gray-350 font-semibold leading-relaxed">
                      {playbooksList[selectedPlaybookIdx].impact}
                    </p>
                  </div>
                </div>

                {/* Action Plans Chronology Timeline */}
                <div className="space-y-3 font-sans">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-sans font-black">Contingency Action Plans</span>
                  
                  <div className="relative border-l-2 border-indigo-950 pl-4 ml-2 space-y-4 py-1">
                    {/* 1. Immediate */}
                    <div className="relative">
                      <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-gray-900" />
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block font-sans">1. Immediate Emergency Action</span>
                      <p className="text-xs text-gray-300 font-semibold leading-relaxed mt-0.5">
                        {playbooksList[selectedPlaybookIdx].immediateActions}
                      </p>
                    </div>

                    {/* 2. Short Term */}
                    <div className="relative">
                      <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-gray-900" />
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">2. Short-Term Action Plan (30 Days)</span>
                      <p className="text-xs text-gray-300 font-semibold leading-relaxed mt-0.5">
                        {playbooksList[selectedPlaybookIdx].shortTermPlan}
                      </p>
                    </div>

                    {/* 3. Long Term */}
                    <div className="relative">
                      <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-gray-900" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block">3. Long-Term Strategy Plan (6-12 Months)</span>
                      <p className="text-xs text-gray-300 font-semibold leading-relaxed mt-0.5">
                        {playbooksList[selectedPlaybookIdx].longTermStrategy}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warn signs, KPIs, Prevention */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-855 pt-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-yellow-450 uppercase tracking-widest flex items-center gap-1 font-sans">
                      <AlertTriangle size={11} className="shrink-0" />
                      <span>Early Warnings</span>
                    </span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {playbooksList[selectedPlaybookIdx].warningSigns}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-emerald-455 uppercase tracking-widest flex items-center gap-1 font-sans">
                      <Shield size={11} className="shrink-0" />
                      <span>Prevention</span>
                    </span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {playbooksList[selectedPlaybookIdx].preventativeMeasures}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-455 uppercase tracking-widest flex items-center gap-1 font-sans">
                      <BarChart3 size={11} className="shrink-0" />
                      <span>KPIs to Monitor</span>
                    </span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed font-sans">
                      {playbooksList[selectedPlaybookIdx].kpis}
                    </p>
                  </div>
                </div>

                {/* Recommendations & Alternatives */}
                <div className="bg-gray-955/40 border border-gray-855 p-4 rounded-2xl space-y-3 leading-relaxed font-sans">
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Consultant Recommendations</span>
                    <p className="text-xs text-gray-300 font-semibold">{playbooksList[selectedPlaybookIdx].recommendations}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Alternative Response Strategies</span>
                    <p className="text-xs text-gray-300 font-semibold">{playbooksList[selectedPlaybookIdx].alternativeStrategies}</p>
                  </div>
                </div>

                {/* Outcomes Grid */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Response Outcomes Grid</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
                    <div className="bg-emerald-955/10 border border-emerald-900/40 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Best-Case Outcome</span>
                      <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                        {playbooksList[selectedPlaybookIdx].outcomes?.bestCase}
                      </p>
                    </div>
                    
                    <div className="bg-indigo-955/10 border border-indigo-900/40 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block font-sans">Expected Outcome</span>
                      <p className="text-[11px] text-gray-350 font-semibold leading-relaxed font-sans">
                        {playbooksList[selectedPlaybookIdx].outcomes?.expectedCase}
                      </p>
                    </div>

                    <div className="bg-red-955/10 border border-red-900/40 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block font-sans">Worst-Case Outcome</span>
                      <p className="text-[11px] text-gray-350 font-semibold leading-relaxed font-sans">
                        {playbooksList[selectedPlaybookIdx].outcomes?.worstCase}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: GLOBAL PLAYBOOK LIBRARY */}
      {mainTab === 'library' && (
        <div className="space-y-6 animate-in fade-in duration-200 font-sans">
          {/* Search and Filters Bar */}
          <div className="bg-gray-900 border border-gray-805 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between font-sans">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search playbooks or scenarios..."
                className="w-full bg-gray-955 border border-gray-850 rounded-xl py-2 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 justify-start md:justify-end w-full md:w-auto">
              {['All', 'Financial', 'Cybersecurity', 'Operational', 'Strategic', 'Compliance & HR'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setLibraryCategory(cat);
                    setSelectedLibPlaybookIdx(0);
                  }}
                  className={`text-[10px] font-black border px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    libraryCategory === cat
                      ? 'bg-indigo-650 border-indigo-650 text-white shadow shadow-indigo-600/20'
                      : 'bg-gray-955 border-gray-850 text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Library main layout */}
          {filteredPlaybooks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Side: Playbook Catalog List */}
              <div className="lg:col-span-2 space-y-3">
                <span className="block text-[10px] font-black text-gray-450 uppercase tracking-widest pl-1 mb-1">Playbooks Matching Filter ({filteredPlaybooks.length})</span>
                
                {filteredPlaybooks.map((pb, idx) => {
                  const actualIndexInFiltered = idx;
                  const isSelected = selectedLibPlaybookIdx === actualIndexInFiltered;
                  return (
                    <div
                      key={pb.id}
                      onClick={() => setSelectedLibPlaybookIdx(actualIndexInFiltered)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-3 relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-955/25 border-indigo-700/60 shadow-lg shadow-indigo-950/40 text-white'
                          : 'bg-gray-900 border-gray-805 text-gray-400 hover:border-gray-700 hover:bg-gray-900/80'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-black leading-snug">{pb.title}</span>
                        <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full shrink-0 ${getUrgencyBadge(pb.riskLevel)}`}>
                          {pb.riskLevel}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                        {pb.overview}
                      </p>
                      
                      <div className="flex items-center gap-2 border-t border-gray-855/40 pt-2.5 mt-1">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <Folder size={11} className="shrink-0" />
                          <span>{pb.category}</span>
                        </span>
                        <span className="text-gray-600 text-[9px] font-black">•</span>
                        <span className="text-[9px] font-bold text-gray-450 uppercase tracking-wider flex items-center gap-1">
                          <Layers size={11} className="shrink-0" />
                          <span>{pb.scenarios.length} Scenarios Available</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Side: Detailed Playbook View & Scenario Catalog */}
              <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
                {/* Playbook Header */}
                <div className="border-b border-gray-855 pb-4 flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider block w-max mb-1.5">
                      {filteredPlaybooks[selectedLibPlaybookIdx].category} Playbook Guidelines
                    </span>
                    <h3 className="text-md font-black text-white leading-tight">
                      {filteredPlaybooks[selectedLibPlaybookIdx].title}
                    </h3>
                  </div>
                  <span className={`text-[9px] font-black border px-2.5 py-1 rounded-full shrink-0 ${getUrgencyBadge(filteredPlaybooks[selectedLibPlaybookIdx].riskLevel)}`}>
                    Level: {filteredPlaybooks[selectedLibPlaybookIdx].riskLevel}
                  </span>
                </div>

                {/* Info Block */}
                <div className="bg-gray-955/30 border border-gray-850 p-4 rounded-xl space-y-3.5 text-xs leading-relaxed">
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Playbook Description</span>
                    <p className="text-gray-300 font-semibold">{filteredPlaybooks[selectedLibPlaybookIdx].description}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Typical Trigger Conditions</span>
                    <p className="text-gray-300 font-semibold">{filteredPlaybooks[selectedLibPlaybookIdx].triggerConditions}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Recommended Actions</span>
                      <p className="text-gray-350 font-semibold">{filteredPlaybooks[selectedLibPlaybookIdx].recommendedActions}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">KPIs to Monitor</span>
                      <p className="text-gray-350 font-semibold">{filteredPlaybooks[selectedLibPlaybookIdx].kpis}</p>
                    </div>
                  </div>
                </div>

                {/* AI-Analysis & Decision tree */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-955/30 border border-indigo-950 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">AI Advisory Analysis</span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {filteredPlaybooks[selectedLibPlaybookIdx].aiAnalysis}
                    </p>
                  </div>

                  <div className="bg-gray-955/30 border border-indigo-950 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Operational Decision Tree</span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {filteredPlaybooks[selectedLibPlaybookIdx].decisionTree}
                    </p>
                  </div>
                </div>

                {/* Preventive & Recovery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-955/30 border border-emerald-950 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Preventive Measures</span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {filteredPlaybooks[selectedLibPlaybookIdx].preventiveMeasures}
                    </p>
                  </div>

                  <div className="bg-gray-955/30 border border-emerald-950 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">System Recovery Plan</span>
                    <p className="text-[11px] text-gray-350 font-semibold leading-relaxed">
                      {filteredPlaybooks[selectedLibPlaybookIdx].recoveryPlan}
                    </p>
                  </div>
                </div>

                {/* Playbook Scenarios - Display All Scenarios */}
                <div className="space-y-3 pt-2">
                  <span className="block text-[10px] font-black text-gray-450 uppercase tracking-widest pl-1">
                    Playbook Scenarios ({filteredPlaybooks[selectedLibPlaybookIdx].scenarios.length})
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredPlaybooks[selectedLibPlaybookIdx].scenarios.map((sc) => (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setSelectedLibScenario(sc);
                          setLiveAnalysisData(null);
                          setLiveAnalysisLoading(false);
                        }}
                        className="bg-gray-955 border border-gray-805 hover:border-indigo-650 hover:bg-indigo-950/5 p-4 rounded-xl transition-all cursor-pointer flex justify-between items-center group gap-4 font-sans"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors block">
                            {sc.title}
                          </span>
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed line-clamp-1">
                            {sc.context}
                          </p>
                        </div>
                        <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full shrink-0 ${getUrgencyBadge(sc.severity)}`}>
                          {sc.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-gray-500 font-semibold bg-gray-900 border border-gray-805 rounded-2xl font-sans">
              No matching playbooks or scenarios found in the library. Try adjusting your search query.
            </div>
          )}
        </div>
      )}

      {/* DETAILED SCENARIO DIALOG MODAL PAGE */}
      {selectedLibScenario && (
        <div 
          onClick={() => setSelectedLibScenario(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-gray-200 cursor-default"
          >
            {/* Modal Header */}
            <div className="bg-gray-900 p-6 border-b border-gray-855 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-mono uppercase font-black tracking-wider block w-max">
                  Scenario Details
                </span>
                <h3 className="text-md font-black text-white leading-tight">
                  {selectedLibScenario.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black border px-2.5 py-1 rounded-full uppercase ${getUrgencyBadge(selectedLibScenario.severity || selectedLibScenario.urgency)}`}>
                  {selectedLibScenario.severity || selectedLibScenario.urgency || 'High'}
                </span>
                <button
                  onClick={() => setSelectedLibScenario(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed">
              {/* Description & Context Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Scenario Context</span>
                  <p className="text-gray-300 font-semibold leading-relaxed">
                    {adaptText(selectedLibScenario.context || selectedLibScenario.description || selectedLibScenario.potentialImpact)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Operational Description / Impact</span>
                  <p className="text-gray-300 font-semibold leading-relaxed">
                    {adaptText(selectedLibScenario.description || selectedLibScenario.potentialImpact)}
                  </p>
                </div>
              </div>

              {/* Trigger Conditions Evaluation */}
              {selectedLibScenario.conditions && selectedLibScenario.conditions.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">
                    Trigger Conditions ({selectedLibScenario.conditions.length}) & {activeClient.name} Evaluation
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedLibScenario.conditions.map((c: any, idx: number) => {
                      const isTriggered = evaluateCondition(c);
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-mono font-bold flex items-center gap-1.5 ${
                            isTriggered
                              ? 'bg-red-950/40 border-red-800/80 text-red-300'
                              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {isTriggered ? <AlertTriangle size={11} className="text-red-400 shrink-0" /> : <Check size={11} className="text-emerald-400 shrink-0" />}
                            <span>{isTriggered ? 'Triggered:' : 'Protected:'}</span>
                          </span>
                          <span>{c.field} {c.operator} {c.value}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Company-Specific Live AI Analysis Trigger */}
              <div className="bg-gradient-to-r from-indigo-955/20 via-purple-955/10 to-gray-900 border border-indigo-950 p-5 rounded-2xl space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Activity size={14} className="text-indigo-400 shrink-0" />
                      <span>Live Real-Time AI Simulation Analysis</span>
                    </span>
                    <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                      Calculate the immediate quantitative financial and operational impact of this scenario on {activeClient.name} today.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerLiveAnalysis(selectedLibScenario)}
                    disabled={liveAnalysisLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:opacity-50 text-white font-black text-[10px] px-4 py-2 rounded-xl cursor-pointer transition-all shadow-lg flex items-center gap-1.5 shrink-0"
                  >
                    {liveAnalysisLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Simulating Threat...</span>
                      </>
                    ) : (
                      <span>Run Live AI Audit</span>
                    )}
                  </button>
                </div>

                {/* Render Live AI Analysis Output */}
                {liveAnalysisData && (
                  <div className="border-t border-indigo-900/40 pt-4 space-y-4 animate-in fade-in duration-200 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block">Live Scenario Audit</span>
                        <p className="text-gray-300 font-semibold leading-relaxed">{liveAnalysisData.liveAnalysis}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">Critical Posture Vulnerabilities</span>
                        <p className="text-gray-350 font-semibold leading-relaxed">{liveAnalysisData.rootCauseAnalysis}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-900/50 pt-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Custom Emergency Remediation steps</span>
                        <p className="text-gray-300 font-semibold leading-relaxed">{liveAnalysisData.recommendedResponse}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-indigo-455 uppercase tracking-wider block">Quantified Impact Forecast</span>
                        <p className="text-gray-350 font-semibold leading-relaxed">{liveAnalysisData.expectedImpact}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Standard Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-855 pt-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Root Cause Analysis</span>
                  <p className="text-gray-350 font-semibold leading-relaxed">
                    {selectedLibScenario.rootCause || selectedLibScenario.whatsCausingThis || selectedLibScenario.potentialImpact || 'Identified via telemetry triggers.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Recommended Responses</span>
                  <p className="text-gray-350 font-semibold leading-relaxed">
                    {selectedLibScenario.recommendedResponse || (Array.isArray(selectedLibScenario.recommendations) ? selectedLibScenario.recommendations.join('. ') : selectedLibScenario.recommendations) || 'Initiate standard triage protocol.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Alternative Actions</span>
                  <p className="text-gray-350 font-semibold leading-relaxed">
                    {selectedLibScenario.alternativeActions || (Array.isArray(selectedLibScenario.immediateActions) ? selectedLibScenario.immediateActions.join('. ') : 'Assess alternative control measures.')}
                  </p>
                </div>
              </div>

              {/* Best practices & lessons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-855 pt-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Industry Best Practices</span>
                  <p className="text-gray-300 font-semibold leading-relaxed font-sans">
                    {selectedLibScenario.bestPractices || (Array.isArray(selectedLibScenario.preventiveMeasures) ? selectedLibScenario.preventiveMeasures.join('. ') : 'Schedule regular compliance audits.')}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Historical Lessons Learned</span>
                  <p className="text-gray-300 font-semibold leading-relaxed">
                    {selectedLibScenario.lessonsLearned || 'Proactive risk audits prevent cascading failures.'}
                  </p>
                </div>
              </div>

              {/* Similar scenarios & metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-855 pt-4">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Similar Scenarios</span>
                  <p className="text-gray-350 font-semibold leading-relaxed">
                    {selectedLibScenario.similarScenarios || (Array.isArray(selectedLibScenario.relatedPlaybooks) ? selectedLibScenario.relatedPlaybooks.join(', ') : 'Operational Cash Squeeze, Ransomware Exposure')}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Metrics & Expected Business Impact</span>
                  <p className="text-gray-350 font-semibold leading-relaxed">
                    {selectedLibScenario.impactMetrics || selectedLibScenario.estimatedImpact || 'Degrades resilience score, elevates operational risk.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-900 p-4 border-t border-gray-855 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLibScenario(null)}
                className="bg-indigo-650 hover:bg-indigo-550 text-white font-black text-xs px-6 py-2 rounded-xl cursor-pointer transition-all shadow"
              >
                Close Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
