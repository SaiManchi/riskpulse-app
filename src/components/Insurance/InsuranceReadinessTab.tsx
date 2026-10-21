'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Award, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Sparkles, 
  ShieldAlert, 
  Lock, 
  Database, 
  Mail, 
  Cpu, 
  Building2, 
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
  Zap,
  Info,
  X
} from 'lucide-react';
import { ClientProfile } from '@/lib/seedData';
import { ComputedRatios } from '@/lib/formulas';

interface InsuranceReadinessTabProps {
  activeClient: ClientProfile;
  computed: ComputedRatios;
  onUpdate?: () => void;
}

export default function InsuranceReadinessTab({ activeClient, computed }: InsuranceReadinessTabProps) {
  const cyber = activeClient.cyberMetrics;

  // Interactive Checklist Simulator States (initialized with client actuals)
  const [mfa, setMfa] = useState<boolean>(cyber.mfa_enabled);
  const [backups, setBackups] = useState<boolean>(cyber.backup_status === 'active');
  const [edr, setEdr] = useState<boolean>(cyber.endpoint_protection);
  const [phishing, setPhishing] = useState<boolean>(cyber.security_awareness_completion >= 80);
  const [patching, setPatching] = useState<boolean>(cyber.patch_status === 'current');
  const [vendorScreening, setVendorScreening] = useState<boolean>(activeClient.vendors.length > 0 && activeClient.vendors.every(v => v.security_score >= 60));
  const [showAttestationModal, setShowAttestationModal] = useState<boolean>(false);

  // Baseline Base Insurance Premium (derived from company size & revenue)
  const estimatedAnnualRevenue = activeClient.financialMetrics.monthly_revenue * 12;
  const baseAnnualPremium = useMemo(() => {
    // Standard cyber policy pricing heuristic: ~$1,500 base + 0.8% of annual revenue
    return Math.round(Math.max(12000, 4500 + estimatedAnnualRevenue * 0.007));
  }, [estimatedAnnualRevenue]);

  // Calculate discount percentage based on security controls
  const totalDiscountPercent = useMemo(() => {
    let discount = 0;
    if (mfa) discount += 20;
    if (backups) discount += 15;
    if (edr) discount += 12;
    if (phishing) discount += 8;
    if (patching) discount += 6;
    if (vendorScreening) discount += 5;
    return Math.min(65, discount);
  }, [mfa, backups, edr, phishing, patching, vendorScreening]);

  const annualSavings = Math.round(baseAnnualPremium * (totalDiscountPercent / 100));
  const optimizedPremium = Math.max(3500, baseAnnualPremium - annualSavings);
  const threeYearSavings = annualSavings * 3;

  // Calculate Carrier Approval Probability
  const approvalOdds = useMemo(() => {
    // If MFA is disabled, immediate rejection by top carriers (hard gate)
    if (!mfa) return 18;
    let score = 40;
    if (backups) score += 20;
    if (edr) score += 15;
    if (phishing) score += 10;
    if (patching) score += 8;
    if (vendorScreening) score += 7;
    return Math.min(98, score);
  }, [mfa, backups, edr, phishing, patching, vendorScreening]);

  // Carrier Breakdown
  const carriers = useMemo(() => {
    return [
      {
        name: 'Coalition',
        tier: 'Preferred Partner',
        logoText: 'COALITION',
        odds: approvalOdds >= 75 ? Math.min(99, approvalOdds + 4) : approvalOdds - 10,
        estPremium: Math.round(optimizedPremium * 0.94),
        status: !mfa ? 'Critical Gate: Requires MFA' : approvalOdds >= 80 ? 'Approved (Max Discount)' : 'Conditional Review',
        qualifies: mfa && backups,
        highlightColor: 'from-blue-600/20 border-blue-500/40 text-blue-400'
      },
      {
        name: 'Chubb',
        tier: 'Enterprise Standard',
        logoText: 'CHUBB',
        odds: approvalOdds >= 80 ? approvalOdds : approvalOdds - 8,
        estPremium: Math.round(optimizedPremium * 1.05),
        status: !mfa ? 'Declined: MFA Missing' : !backups ? 'Declined: Backups Incomplete' : 'Approved',
        qualifies: mfa && backups && edr,
        highlightColor: 'from-indigo-600/20 border-indigo-500/40 text-indigo-400'
      },
      {
        name: 'Travelers',
        tier: 'Mid-Market Standard',
        logoText: 'TRAVELERS',
        odds: approvalOdds >= 70 ? approvalOdds - 2 : approvalOdds - 15,
        estPremium: Math.round(optimizedPremium * 1.02),
        status: !mfa ? 'Declined: MFA Mandate' : approvalOdds >= 70 ? 'Approved' : 'Underwriting Referral',
        qualifies: mfa && (backups || edr),
        highlightColor: 'from-red-600/20 border-red-500/40 text-red-400'
      },
      {
        name: 'Cowbell Cyber',
        tier: 'Dynamic AI Rating',
        logoText: 'COWBELL',
        odds: Math.min(96, approvalOdds + 2),
        estPremium: Math.round(optimizedPremium * 0.97),
        status: !mfa ? 'Restricted Policy Rider' : 'Instant Pre-Approval',
        qualifies: mfa,
        highlightColor: 'from-amber-600/20 border-amber-500/40 text-amber-400'
      }
    ];
  }, [approvalOdds, optimizedPremium, mfa, backups, edr]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/40 border border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Award size={13} />
            Direct ROI & Underwriting Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cyber Insurance Underwriting Readiness & Premium Calculator
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Benchmark security posture against major commercial cyber underwriters (Chubb, Travelers, Coalition). Prove direct dollar ROI by demonstrating annual premium discounts earned through MSP cybersecurity controls.
          </p>
        </div>

        <button
          onClick={() => setShowAttestationModal(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 flex items-center gap-2 shrink-0 cursor-pointer transition-all"
        >
          <Download size={15} />
          Export Carrier Attestation
        </button>
      </div>

      {/* KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Approval Probability */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Award size={14} className="text-emerald-400" />
              Underwriting Odds
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              approvalOdds >= 80 
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                : approvalOdds >= 50 
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                : 'bg-red-950/60 text-red-400 border-red-800/60'
            }`}>
              {approvalOdds >= 80 ? 'Preferred Tier' : approvalOdds >= 50 ? 'Conditional' : 'High Rejection Risk'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tight ${approvalOdds >= 80 ? 'text-emerald-400' : approvalOdds >= 50 ? 'text-amber-400' : 'text-red-500'}`}>
              {approvalOdds}%
            </span>
            <span className="text-xs font-bold text-gray-400">Approval Rate</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Critical Mandate (MFA)</span>
            <span className={`font-semibold ${mfa ? 'text-emerald-400' : 'text-red-400'}`}>
              {mfa ? 'Passed' : 'Blocking Approval'}
            </span>
          </div>
        </div>

        {/* Metric 2: Annual Premium Savings */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <DollarSign size={14} className="text-cyan-400" />
              Annual Savings
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              {totalDiscountPercent}% Discount
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">
              ${annualSavings.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-400 ml-1">/ year</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Base Benchmark</span>
            <span className="font-semibold text-gray-400 line-through">${baseAnnualPremium.toLocaleString()}/yr</span>
          </div>
        </div>

        {/* Metric 3: Optimized Premium */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-indigo-400" />
              Optimized Premium
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              Net Payable
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">
              ${optimizedPremium.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-400 ml-1">/ year</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>Coverage Cap Limit</span>
            <span className="font-semibold text-indigo-300">Up to $3,000,000</span>
          </div>
        </div>

        {/* Metric 4: 3-Year Cumulative ROI */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              3-Year Savings ROI
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60">
              Self-Funding
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              ${threeYearSavings.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
            <span>MSP Security Payback</span>
            <span className="font-semibold text-emerald-300">100% Offset</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Underwriting Checklist Simulator, Right Carrier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Control Checklist Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-gray-900/90 border border-gray-800/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Underwriting Controls Simulator
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle controls to observe real-time impact on premium discounts and carrier acceptance</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
              {totalDiscountPercent}% Total Discount
            </span>
          </div>

          <div className="space-y-3">
            {/* Control 1: MFA */}
            <div 
              onClick={() => setMfa(!mfa)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                mfa ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-red-900/60 hover:border-red-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${mfa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Lock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Multi-Factor Authentication (MFA) Everywhere</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                      MANDATORY
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Enforced on all corporate logins, email, VPNs, and administrative portals.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-20% ($5,700/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  mfa ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>

            {/* Control 2: Backups */}
            <div 
              onClick={() => setBackups(!backups)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                backups ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${backups ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Immutable Air-Gapped Cloud Backups</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      RANSOMWARE GATE
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Immutable retention prevents ransomware deletion; recovery tested quarterly.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-15% ($4,275/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  backups ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>

            {/* Control 3: EDR */}
            <div 
              onClick={() => setEdr(!edr)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                edr ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${edr ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Endpoint Detection & Response (EDR)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Next-gen behavioral telemetry deployed on 100% of laptops and servers.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-12% ($3,420/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  edr ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>

            {/* Control 4: Phishing Simulation */}
            <div 
              onClick={() => setPhishing(!phishing)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                phishing ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${phishing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                  <Mail size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Security Awareness & Phishing Simulation (&gt;80%)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Routine simulations testing wire fraud, credential theft, and spoofing.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-8% ($2,280/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  phishing ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>

            {/* Control 5: Patching */}
            <div 
              onClick={() => setPatching(!patching)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                patching ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${patching ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Vulnerability & Patch Management (&lt;14d SLA)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Critical CVEs remediated within two weeks of public disclosure.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-6% ($1,710/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  patching ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>

            {/* Control 6: Vendor Screening */}
            <div 
              onClick={() => setVendorScreening(!vendorScreening)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                vendorScreening ? 'bg-emerald-955/20 border-emerald-800/60 hover:border-emerald-700' : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${vendorScreening ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Third-Party Vendor Risk Screening</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Zero high-risk vendors operating without active SOC 2 / ISO certs.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-extrabold text-emerald-400">-5% ($1,425/yr)</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  vendorScreening ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 bg-gray-900 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Carrier Underwriting Matrix Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-gray-900/90 border border-gray-800/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Award size={18} className="text-cyan-400" />
                  Carrier Qualification Matrix
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Live quotes and eligibility across leading cyber insurers</p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              {carriers.map((carrier) => (
                <div 
                  key={carrier.name} 
                  className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800/80 hover:border-gray-700/80 transition-all flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{carrier.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {carrier.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                      <span>Approval Odds: <strong className={carrier.odds >= 75 ? 'text-emerald-400' : 'text-amber-400'}>{carrier.odds}%</strong></span>
                      <span>•</span>
                      <span>Status: <strong className={carrier.qualifies ? 'text-emerald-300' : 'text-red-400'}>{carrier.status}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-500 uppercase font-bold block">Est. Premium</span>
                    <span className="text-base font-black text-white">${carrier.estPremium.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400 block">/ year</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MSP ROI Pitch Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-gray-950/60 border border-emerald-800/60 text-xs text-gray-300 space-y-1.5 mt-6">
            <div className="flex items-center gap-2 font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
              <Sparkles size={14} />
              The MSP Self-Funding Equation
            </div>
            <p className="leading-relaxed">
              Demonstrate to the client that your managed security services package generates <strong>${annualSavings.toLocaleString()} in annual insurance discounts</strong>, effectively paying for a large portion of your monthly MSP retainer while defending against $300k+ in uninsured extortion losses.
            </p>
          </div>
        </div>
      </div>

      {/* Attestation Modal */}
      {showAttestationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Cyber Underwriting Attestation Certificate</h3>
                  <p className="text-xs text-gray-400">Carrier-ready questionnaire response audit for {activeClient.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAttestationModal(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 space-y-2">
                <div className="flex justify-between font-bold text-white text-sm">
                  <span>Applicant: {activeClient.name}</span>
                  <span className="text-emerald-400">Underwriting Grade: {approvalOdds >= 80 ? 'A (Preferred)' : 'B (Standard)'}</span>
                </div>
                <div className="text-gray-400">
                  Audit Timestamp: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | Managed Underwriter: RiskPulse SaaS Platform
                </div>
              </div>

              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] pt-2">Verified Telemetry Controls:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                  <span>Multi-Factor Authentication (MFA):</span>
                  <strong className={mfa ? 'text-emerald-400' : 'text-red-400'}>{mfa ? 'VERIFIED ACTIVE' : 'MISSING'}</strong>
                </div>
                <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                  <span>Immutable Backups:</span>
                  <strong className={backups ? 'text-emerald-400' : 'text-red-400'}>{backups ? 'TESTED & VERIFIED' : 'OUTDATED'}</strong>
                </div>
                <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                  <span>Endpoint Detection (EDR):</span>
                  <strong className={edr ? 'text-emerald-400' : 'text-red-400'}>{edr ? 'ACTIVE' : 'INACTIVE'}</strong>
                </div>
                <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                  <span>Employee Security Training:</span>
                  <strong className={phishing ? 'text-emerald-400' : 'text-amber-400'}>{phishing ? 'PASS (≥80%)' : 'NEEDS COMPLETION'}</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-955/20 border border-indigo-800/40 text-gray-300 text-xs">
                <strong>Carrier Attestation Statement:</strong> This audit verifies that technical security controls have been validated via automated API probes. Submission to carriers (Chubb, Travelers, Coalition) grants immediate eligibility for up to $3M aggregate limit.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAttestationModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowAttestationModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/40"
              >
                <Download size={14} />
                Print / Save PDF Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
