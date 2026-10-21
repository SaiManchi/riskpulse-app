'use client';

import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileText,
  Zap,
  Info
} from 'lucide-react';
import { ClientProfile } from '@/lib/seedData';
import { ComputedRatios } from '@/lib/formulas';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

interface StressSimulatorTabProps {
  activeClient: ClientProfile;
  computed: ComputedRatios;
}

export default function StressSimulatorTab({ activeClient, computed }: StressSimulatorTabProps) {
  // Simulator Controls
  const [revenueShock, setRevenueShock] = useState<number>(0); // -50% to +30%
  const [dsoDelay, setDsoDelay] = useState<number>(0); // 0 to 90 days delay
  const [cyberBreachCost, setCyberBreachCost] = useState<number>(0); // $0 to $300,000
  const [opexInflation, setOpexInflation] = useState<number>(0); // 0% to +40%
  const [downtimeDays, setDowntimeDays] = useState<number>(0); // 0 to 21 days

  // Baseline figures
  const baselineCash = activeClient.financialMetrics.cash_balance;
  const baselineMonthlyBurn = activeClient.financialMetrics.monthly_burn_rate;
  const baselineRevenue = activeClient.financialMetrics.monthly_revenue;
  const baselineRunway = computed.cashRunway;

  // Stressed calculations
  const stressedRevenue = Math.max(0, baselineRevenue * (1 + revenueShock / 100));
  const stressedBurn = baselineMonthlyBurn * (1 + opexInflation / 100);
  
  // Downtime revenue loss (assuming 30 business days per month)
  const downtimeRevenueLoss = (baselineRevenue / 30) * downtimeDays;
  
  // DSO impact: delayed cash inflow reduces immediate working capital
  // Every 30 days of DSO delay ties up ~1 month of revenue in receivables
  const tiedUpReceivables = (stressedRevenue * (dsoDelay / 30));

  // Immediate capital available under shock
  const immediateCashReserve = Math.max(
    0, 
    baselineCash - cyberBreachCost - downtimeRevenueLoss - Math.min(tiedUpReceivables * 0.4, baselineCash * 0.6)
  );

  // Net monthly cash burn under stress (Expenses - Inflows)
  const netMonthlyDeficit = Math.max(1000, stressedBurn - stressedRevenue * 0.85);

  // Stressed Cash Runway in months
  const stressedRunway = parseFloat(Math.max(0.1, (immediateCashReserve / netMonthlyDeficit)).toFixed(1));
  const runwayDelta = parseFloat((stressedRunway - baselineRunway).toFixed(1));

  // Projected Insolvency Date
  const insolvencyDate = useMemo(() => {
    const today = new Date();
    const daysRemaining = Math.round(stressedRunway * 30.4);
    const target = new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
    return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [stressedRunway]);

  // Stressed Risk Scores
  const stressedHealthScore = useMemo(() => {
    let score = computed.overallHealthScore;
    if (runwayDelta < -3) score -= 35;
    else if (runwayDelta < -1) score -= 20;
    else if (runwayDelta < 0) score -= 10;
    if (cyberBreachCost > 100000) score -= 20;
    else if (cyberBreachCost > 0) score -= 10;
    if (revenueShock < -20) score -= 15;
    return Math.max(10, Math.min(99, score));
  }, [computed.overallHealthScore, runwayDelta, cyberBreachCost, revenueShock]);

  // Monthly 12-Month Cash Projection Data for Recharts
  const projectionData = useMemo(() => {
    const months = ['Mo 1', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6', 'Mo 7', 'Mo 8', 'Mo 9', 'Mo 10', 'Mo 11', 'Mo 12'];
    let curBaseline = baselineCash;
    let curStressed = immediateCashReserve;

    return months.map(m => {
      curBaseline = Math.max(0, curBaseline - (baselineMonthlyBurn - baselineRevenue * 0.9));
      curStressed = Math.max(0, curStressed - netMonthlyDeficit);

      return {
        month: m,
        Baseline: Math.round(curBaseline),
        Stressed: Math.round(curStressed)
      };
    });
  }, [baselineCash, immediateCashReserve, baselineMonthlyBurn, baselineRevenue, netMonthlyDeficit]);

  // Presets
  const applyPreset = (type: 'churn' | 'ransomware' | 'stagflation' | 'reset') => {
    if (type === 'reset') {
      setRevenueShock(0);
      setDsoDelay(0);
      setCyberBreachCost(0);
      setOpexInflation(0);
      setDowntimeDays(0);
    } else if (type === 'churn') {
      setRevenueShock(-35);
      setDsoDelay(25);
      setCyberBreachCost(0);
      setOpexInflation(5);
      setDowntimeDays(0);
    } else if (type === 'ransomware') {
      setRevenueShock(-15);
      setDsoDelay(15);
      setCyberBreachCost(125000);
      setOpexInflation(10);
      setDowntimeDays(7);
    } else if (type === 'stagflation') {
      setRevenueShock(-20);
      setDsoDelay(45);
      setCyberBreachCost(0);
      setOpexInflation(25);
      setDowntimeDays(0);
    }
  };

  const isStressed = revenueShock !== 0 || dsoDelay !== 0 || cyberBreachCost !== 0 || opexInflation !== 0 || downtimeDays !== 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900/90 to-indigo-950/40 border border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sliders size={13} />
            Executive Crisis Sandbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Interactive &quot;What-If&quot; Stress Test Simulator
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Simulate macroeconomic downturns, top client churn, cyber breach remediation costs, and collection lags in real-time. Quantify insolvency horizons and test financial resiliency.
          </p>
        </div>

        {/* Preset Badges */}
        <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 hidden lg:block">Instant Presets</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyPreset('churn')}
              className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 text-xs font-semibold text-gray-200 transition-all hover:border-amber-500/50 flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingDown size={12} className="text-amber-400" />
              Top Client Churn
            </button>
            <button
              onClick={() => applyPreset('ransomware')}
              className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 text-xs font-semibold text-gray-200 transition-all hover:border-red-500/50 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert size={12} className="text-red-400" />
              Ransomware Attack
            </button>
            <button
              onClick={() => applyPreset('stagflation')}
              className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 text-xs font-semibold text-gray-200 transition-all hover:border-purple-500/50 flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle size={12} className="text-purple-400" />
              Liquidity Squeeze
            </button>
            {isStressed && (
              <button
                onClick={() => applyPreset('reset')}
                className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} />
                Reset Baseline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stressed Cash Runway */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              Stressed Runway
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              stressedRunway < 3 
                ? 'bg-red-950/60 text-red-400 border-red-800/60' 
                : stressedRunway < 6 
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            }`}>
              {stressedRunway < 3 ? 'Critical' : stressedRunway < 6 ? 'Warning' : 'Healthy'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tight ${stressedRunway < 3 ? 'text-red-500' : 'text-white'}`}>
              {stressedRunway}
            </span>
            <span className="text-xs font-bold text-gray-400">months</span>
            {runwayDelta !== 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${runwayDelta < 0 ? 'text-red-400 bg-red-950/40' : 'text-emerald-400 bg-emerald-950/40'}`}>
                {runwayDelta > 0 ? `+${runwayDelta}` : runwayDelta} mo
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Baseline Runway</span>
            <span className="font-semibold text-gray-300">{baselineRunway} months</span>
          </div>
        </div>

        {/* Metric 2: Estimated Insolvency Date */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Calendar size={14} className="text-red-400" />
              Insolvency Horizon
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-800/60">
              Zero-Cash Mark
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {insolvencyDate}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Burn Deficit</span>
            <span className="font-semibold text-red-400">-${Math.round(netMonthlyDeficit).toLocaleString()}/mo</span>
          </div>
        </div>

        {/* Metric 3: Stressed Resilience Score */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={14} className="text-indigo-400" />
              Health Under Stress
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              stressedHealthScore < 50 
                ? 'bg-red-950/60 text-red-400 border-red-800/60' 
                : stressedHealthScore < 75 
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            }`}>
              {stressedHealthScore < 50 ? 'Distressed' : stressedHealthScore < 75 ? 'Caution' : 'Sound'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tight ${stressedHealthScore < 50 ? 'text-red-500' : 'text-white'}`}>
              {stressedHealthScore}
            </span>
            <span className="text-xs font-bold text-gray-400">/ 100</span>
            <span className="text-xs font-bold text-gray-500 line-through ml-1">
              {computed.overallHealthScore}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Score Impact</span>
            <span className="font-semibold text-red-400">
              {stressedHealthScore - computed.overallHealthScore} pts
            </span>
          </div>
        </div>

        {/* Metric 4: Liquidity Shock Capital */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <DollarSign size={14} className="text-cyan-400" />
              Surviving Reserves
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              Instant Cash
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">
              ${Math.round(immediateCashReserve).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Baseline Cash</span>
            <span className="font-semibold text-gray-300">${baselineCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column: Left Sliders, Right Projection Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Controls (5 cols) */}
        <div className="lg:col-span-5 bg-gray-900/90 border border-gray-800/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders size={18} className="text-indigo-400" />
              Shock Parametric Sliders
            </h2>
            <span className="text-xs text-gray-400">Live Calibration</span>
          </div>

          {/* Slider 1: Revenue Shock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">Revenue Shock (%)</span>
              <span className={`font-extrabold px-2 py-0.5 rounded ${revenueShock < 0 ? 'bg-red-950/60 text-red-400' : revenueShock > 0 ? 'bg-emerald-950/60 text-emerald-400' : 'bg-gray-800 text-gray-300'}`}>
                {revenueShock > 0 ? `+${revenueShock}%` : `${revenueShock}%`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="30"
              step="5"
              value={revenueShock}
              onChange={(e) => setRevenueShock(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>-50% Collapse</span>
              <span>0% Baseline</span>
              <span>+30% Upside</span>
            </div>
          </div>

          {/* Slider 2: DSO Payment Lag */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">A/R Collection Lag (DSO)</span>
              <span className={`font-extrabold px-2 py-0.5 rounded ${dsoDelay > 0 ? 'bg-amber-950/60 text-amber-400' : 'bg-gray-800 text-gray-300'}`}>
                +{dsoDelay} days
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={dsoDelay}
              onChange={(e) => setDsoDelay(Number(e.target.value))}
              className="w-full accent-amber-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>On-Time (0d)</span>
              <span>+45d Delay</span>
              <span>+90d Freeze</span>
            </div>
          </div>

          {/* Slider 3: Cyber Breach Incident Cost */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">Cyber Breach / Ransomware Outlay</span>
              <span className={`font-extrabold px-2 py-0.5 rounded ${cyberBreachCost > 0 ? 'bg-red-950/60 text-red-400' : 'bg-gray-800 text-gray-300'}`}>
                ${cyberBreachCost.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="300000"
              step="10000"
              value={cyberBreachCost}
              onChange={(e) => setCyberBreachCost(Number(e.target.value))}
              className="w-full accent-red-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>$0 Clean</span>
              <span>$150k Moderate</span>
              <span>$300k Catastrophic</span>
            </div>
          </div>

          {/* Slider 4: OpEx Inflation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">OpEx Cost Inflation (%)</span>
              <span className={`font-extrabold px-2 py-0.5 rounded ${opexInflation > 0 ? 'bg-purple-950/60 text-purple-400' : 'bg-gray-800 text-gray-300'}`}>
                +{opexInflation}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="5"
              value={opexInflation}
              onChange={(e) => setOpexInflation(Number(e.target.value))}
              className="w-full accent-purple-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>0% Stable</span>
              <span>+20% Surge</span>
              <span>+40% Critical</span>
            </div>
          </div>

          {/* Slider 5: System Downtime Days */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">System / Operations Downtime</span>
              <span className={`font-extrabold px-2 py-0.5 rounded ${downtimeDays > 0 ? 'bg-amber-950/60 text-amber-400' : 'bg-gray-800 text-gray-300'}`}>
                {downtimeDays} days
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={downtimeDays}
              onChange={(e) => setDowntimeDays(Number(e.target.value))}
              className="w-full accent-amber-400 bg-gray-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>0 days</span>
              <span>7 days outage</span>
              <span>21 days blackout</span>
            </div>
          </div>
        </div>

        {/* Right: Cash Trajectory Projection Chart (7 cols) */}
        <div className="lg:col-span-7 bg-gray-900/90 border border-gray-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  12-Month Liquidity Depletion Curve
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualizing capital reserves under baseline vs. stressed operational shocks
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
                  Baseline
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  Stressed
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 sm:h-72 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorStressed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="2 2" />
                  <Area 
                    type="monotone" 
                    dataKey="Baseline" 
                    stroke="#6366f1" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorBaseline)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Stressed" 
                    stroke="#ef4444" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorStressed)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-gray-950/60 border border-gray-800/80 flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-2">
              <Info size={14} className="text-amber-400 shrink-0" />
              <span>Capital exhaust horizon arrives <strong className="text-white">{runwayDelta < 0 ? `${Math.abs(runwayDelta)} months earlier` : 'on schedule'}</strong> under this scenario.</span>
            </span>
            <span className="font-extrabold text-white shrink-0 ml-4">
              Estimated Break-Even: {stressedRevenue >= stressedBurn ? 'Solvent' : 'Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Crisis Contingency Action Plan */}
      <div className="bg-gradient-to-br from-indigo-955/30 via-gray-900 to-gray-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Crisis Contingency Countermeasures</h3>
              <p className="text-xs text-gray-400">Autonomous recommendation playbook calibrated to current stress parameters</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 self-start sm:self-auto">
            Priority Tier 1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: 72-Hour Triage */}
          <div className="p-5 rounded-2xl bg-gray-950/70 border border-gray-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
              <Clock size={14} />
              72-Hour Immediate Triage
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              {stressedRunway < 3 
                ? 'Immediately freeze non-critical vendor outlays and initiate emergency board credit authorization. Extend payment cycles to 60 days on top 3 suppliers.'
                : 'Notify finance team of projected DSO volatility. Conduct daily cash balance audits and activate accounts receivable discount incentives.'}
            </p>
            <div className="pt-2 text-[11px] font-bold text-indigo-400 flex items-center gap-1 cursor-pointer hover:underline">
              View Liquidity Action Checklist <ArrowRight size={11} />
            </div>
          </div>

          {/* Card 2: Receivables & Vendor Mitigation */}
          <div className="p-5 rounded-2xl bg-gray-950/70 border border-gray-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <DollarSign size={14} />
              Receivables Acceleration
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              Offer a 2.5% prompt-pay discount (Net 10 terms) on ${activeClient.financialMetrics.outstanding_receivables.toLocaleString()} of outstanding invoices to unlock immediate liquidity before the zero-cash mark.
            </p>
            <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1 cursor-pointer hover:underline">
              Draft Prompt-Pay Offer Email <ArrowRight size={11} />
            </div>
          </div>

          {/* Card 3: Cyber Resilience Cushion */}
          <div className="p-5 rounded-2xl bg-gray-950/70 border border-gray-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <ShieldAlert size={14} />
              Cyber Risk Cushioning
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              {cyberBreachCost > 0 
                ? `Verify current cyber liability policy covers incident recovery up to $${cyberBreachCost.toLocaleString()}. Ensure forensic investigation retention logs are secured.`
                : 'Ensure MFA and daily immutable backups are fully active to prevent unexpected $100k+ emergency extortion liabilities during tight liquidity periods.'}
            </p>
            <div className="pt-2 text-[11px] font-bold text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline">
              Review Carrier Coverage Limits <ArrowRight size={11} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
