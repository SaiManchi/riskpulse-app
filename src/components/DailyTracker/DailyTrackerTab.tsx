'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  DollarSign, 
  Cloud, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Sparkles, 
  Plus, 
  Check, 
  RefreshCw, 
  FileText, 
  Server, 
  Search, 
  Filter, 
  ChevronRight, 
  Lock, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  UserCheck, 
  X
} from 'lucide-react';
import { ClientProfile, DailyLogEntry, DailyLogDuty } from '@/lib/seedData';

interface DailyTrackerTabProps {
  client: ClientProfile;
  onUpdateClient?: () => void;
  userRole?: string;
}

export default function DailyTrackerTab({ client, onUpdateClient, userRole = 'analyst' }: DailyTrackerTabProps) {
  const [logs, setLogs] = useState<DailyLogEntry[]>(client.dailyLogs || []);
  const [selectedLogId, setSelectedLogId] = useState<string>(
    client.dailyLogs && client.dailyLogs.length > 0 ? client.dailyLogs[0].id : ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // AI Briefing State
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Check-in Modal State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    resilienceScore: 94,
    status: 'optimal' as 'optimal' | 'stable' | 'attention' | 'elevated' | 'critical',
    summary: 'Operational baseline is green. All multi-cloud workloads operational with zero breach alerts.',
    notes: 'Morning routine checks executed. Offsite backup snapshots verified. Disbursed scheduled AP batch.',
    phishingBlocked: 14,
    activeCves: 2,
    endpointCoveragePercent: 99.4,
    dailyCashOutflow: Math.round((client.financialMetrics.monthly_burn_rate || 50000) / 30),
    dailyCashInflow: Math.round((client.financialMetrics.monthly_revenue || 60000) / 30),
    cloudUptimePercent: 99.98,
    incidentsReported: 0,
    author: 'Operations Desk'
  });

  // Sync logs when client prop updates
  useEffect(() => {
    if (client.dailyLogs && client.dailyLogs.length > 0) {
      setLogs(client.dailyLogs);
      if (!selectedLogId || !client.dailyLogs.find(l => l.id === selectedLogId)) {
        setSelectedLogId(client.dailyLogs[0].id);
      }
    }
  }, [client]);

  const selectedLog = logs.find(l => l.id === selectedLogId) || logs[0];
  const todayLog = logs[0];

  // Duty Toggle Handler
  const handleToggleDuty = async (dutyId: string) => {
    if (!selectedLog) return;
    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_duty',
          clientId: client.id,
          logId: selectedLog.id,
          dutyId
        })
      });
      const data = await res.json();
      if (data.success && data.dailyLogs) {
        setLogs(data.dailyLogs);
        if (onUpdateClient) onUpdateClient();
      }
    } catch (e) {
      console.error('Failed to toggle duty:', e);
    }
  };

  // AI Briefing Generator
  const handleGenerateBriefing = async () => {
    if (!todayLog) return;
    setGeneratingBriefing(true);
    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_briefing',
          clientId: client.id,
          todayLog
        })
      });
      const data = await res.json();
      if (data.success && data.briefing) {
        setBriefing(data.briefing);
      }
    } catch (e) {
      console.error('Failed to generate briefing:', e);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  // Save Today's Check-in
  const handleSaveCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLog(true);
    try {
      const newEntry: DailyLogEntry = {
        id: `log-${client.id}-${entryForm.date}`,
        date: entryForm.date,
        timestamp: new Date().toISOString(),
        resilienceScore: Number(entryForm.resilienceScore),
        status: entryForm.status,
        summary: entryForm.summary,
        notes: entryForm.notes,
        author: entryForm.author,
        metrics: {
          phishingBlocked: Number(entryForm.phishingBlocked),
          activeCves: Number(entryForm.activeCves),
          endpointCoveragePercent: Number(entryForm.endpointCoveragePercent),
          dailyCashOutflow: Number(entryForm.dailyCashOutflow),
          dailyCashInflow: Number(entryForm.dailyCashInflow),
          cloudUptimePercent: Number(entryForm.cloudUptimePercent),
          incidentsReported: Number(entryForm.incidentsReported)
        },
        duties: [
          { id: `duty-${entryForm.date}-0`, label: 'Verify automated DB snapshot & offsite immutable backups', category: 'cyber', assignedRole: 'SecOps Lead', completed: true },
          { id: `duty-${entryForm.date}-1`, label: 'Review high-value AP disbursements & invoice anomaly flags', category: 'finance', assignedRole: 'Controller', completed: true },
          { id: `duty-${entryForm.date}-2`, label: 'Audit privileged MFA session logs & anomalous geo-IP logins', category: 'cyber', assignedRole: 'SecOps Analyst', completed: true },
          { id: `duty-${entryForm.date}-3`, label: 'Inspect multi-cloud latency & Tier-1 critical vendor status feeds', category: 'cloud', assignedRole: 'IT Ops Lead', completed: true },
          { id: `duty-${entryForm.date}-4`, label: 'Review open CVE vulnerability patches & endpoint health', category: 'compliance', assignedRole: 'Compliance Officer', completed: false }
        ]
      };

      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_log',
          clientId: client.id,
          entry: newEntry
        })
      });
      const data = await res.json();
      if (data.success && data.dailyLogs) {
        setLogs(data.dailyLogs);
        setSelectedLogId(newEntry.id);
        setShowCheckInModal(false);
        if (onUpdateClient) onUpdateClient();
      }
    } catch (e) {
      console.error('Failed to save check-in:', e);
    } finally {
      setSubmittingLog(false);
    }
  };

  // Filter logs for list
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.date.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">Optimal</span>;
      case 'stable':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">Stable</span>;
      case 'attention':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60">Attention</span>;
      case 'elevated':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950/60 text-orange-400 border border-orange-800/60">Elevated Risk</span>;
      case 'critical':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/60 animate-pulse">Critical</span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 80) return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  // Completion stats for selected log
  const completedDutiesCount = selectedLog?.duties?.filter(d => d.completed).length || 0;
  const totalDutiesCount = selectedLog?.duties?.length || 1;
  const dutyPercentage = Math.round((completedDutiesCount / totalDutiesCount) * 100);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Activity size={20} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Day-to-Day Operations & Resilience Tracker</h1>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              24-Hour Telemetry Pulse
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Continuous operational telemetry bridging daily cyber threat containment, cloud delivery SLAs, working capital burn, and daily sign-off duties for <strong className="text-white">{client.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBriefing}
            disabled={generatingBriefing}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-850 text-indigo-300 border border-indigo-900/60 text-xs font-bold py-2.5 px-4 rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
          >
            {generatingBriefing ? (
              <RefreshCw size={14} className="animate-spin text-indigo-400" />
            ) : (
              <Sparkles size={14} className="text-indigo-400" />
            )}
            <span>{generatingBriefing ? 'Synthesizing...' : 'AI Daily Standup'}</span>
          </button>

          <button
            onClick={() => setShowCheckInModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Log Today's Check-in</span>
          </button>
        </div>
      </div>

      {/* 4 Hero Live Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Daily Resilience Score */}
        <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-indigo-400" />
              Operational Resilience
            </span>
            {getStatusBadge(todayLog?.status || 'optimal')}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {todayLog?.resilienceScore || 94}
            </span>
            <span className="text-xs font-bold text-gray-400">/ 100</span>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center ml-auto">
              <ArrowUpRight size={14} /> +2.8% vs 7d avg
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-medium line-clamp-1">
            {todayLog?.summary || 'Operational health is pristine with normal telemetry.'}
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Cyber Telemetry */}
        <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Cyber Perimeter Pulse
            </span>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
              0 Active Threats
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {todayLog?.metrics.phishingBlocked || 14}
            </span>
            <span className="text-xs font-medium text-gray-400">lures neutralized today</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>EDR Health: <strong className="text-white">{todayLog?.metrics.endpointCoveragePercent || 99.4}%</strong></span>
            <span>Open CVEs: <strong className="text-amber-400">{todayLog?.metrics.activeCves || 2}</strong></span>
          </div>
        </div>

        {/* Card 3: Daily Burn & Working Capital */}
        <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-cyan-400" />
              Daily Burn Telemetry
            </span>
            <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/40">
              Runway Safe
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              ${((todayLog?.metrics.dailyCashOutflow || 46000) / 1000).toFixed(1)}k
            </span>
            <span className="text-xs font-medium text-gray-400">/ 24h outflow</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>Inflows: <strong className="text-emerald-400">+${((todayLog?.metrics.dailyCashInflow || 54000) / 1000).toFixed(1)}k</strong></span>
            <span>Cash Buffer: <strong className="text-white">${((client.financialMetrics.cash_balance || 2200000000) / 1000000).toFixed(1)}M</strong></span>
          </div>
        </div>

        {/* Card 4: Multi-Cloud SLA */}
        <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cloud size={14} className="text-indigo-400" />
              Cloud Delivery SLA
            </span>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
              100% Core Health
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {todayLog?.metrics.cloudUptimePercent || 99.98}%
            </span>
            <span className="text-xs font-medium text-gray-400">multi-cloud uptime</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>Latency: <strong className="text-white">38ms</strong></span>
            <span>Tier-1 Vendors: <strong className="text-emerald-400">All Operational</strong></span>
          </div>
        </div>
      </div>

      {/* 14-Day Timeline Heatmap / Bar View */}
      <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 backdrop-blur shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              14-Day Operational Resilience Timeline
            </h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              Click any date to inspect that day's incident telemetry, daily checklist sign-offs, and operational log notes.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500">
            Selected: <strong className="text-indigo-400 font-bold">{selectedLog?.date || 'Today'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {logs.slice(0, 14).reverse().map((log) => {
            const isSelected = log.id === selectedLog?.id;
            const scoreColor = getScoreColor(log.resilienceScore);
            const isToday = log.date === new Date().toISOString().split('T')[0];

            return (
              <button
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer relative text-left ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20' 
                    : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-900'
                }`}
              >
                {isToday && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.2 rounded-full shadow">
                    Today
                  </span>
                )}
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  {new Date(log.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                
                {/* Score badge */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-extrabold text-xs mb-1.5 ${scoreColor}`}>
                  {log.resilienceScore}
                </div>

                {/* Incident Indicator */}
                {log.metrics.incidentsReported > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Incident recorded" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Work Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 Cols): Selected Day Duties Checklist & AI Standup */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Operational Duties Checklist */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 backdrop-blur shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Daily Operational Duties & Sign-offs
                </h3>
                <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                  Mandatory operational controls for {selectedLog?.date}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-white">{completedDutiesCount} / {totalDutiesCount}</span>
                <span className="text-[10px] text-emerald-400 block font-bold">{dutyPercentage}% Done</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${dutyPercentage}%` }}
              />
            </div>

            {/* Duties Checklist */}
            <div className="space-y-2.5 pt-1">
              {selectedLog?.duties?.map((duty) => (
                <div
                  key={duty.id}
                  onClick={() => handleToggleDuty(duty.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    duty.completed 
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-gray-300' 
                      : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    duty.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-gray-950' 
                      : 'border-gray-700 bg-gray-900 hover:border-indigo-500'
                  }`}>
                    {duty.completed && <Check size={12} strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold block leading-snug ${duty.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                      {duty.label}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-gray-900 text-gray-400 border border-gray-800">
                        {duty.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        Assignee: <strong className="text-gray-300 font-semibold">{duty.assignedRole}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Daily Standup Briefing Card */}
          <div className="bg-gradient-to-br from-indigo-950/30 via-gray-900/70 to-gray-900/70 border border-indigo-900/40 rounded-2xl p-6 backdrop-blur shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} />
                Executive Standup Briefing
              </span>
              <button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {briefing ? 'Regenerate' : 'Run Analysis'}
              </button>
            </div>

            {generatingBriefing ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                <RefreshCw size={20} className="animate-spin text-indigo-400" />
                <span className="text-xs font-medium">Synthesizing today's operational signals...</span>
              </div>
            ) : briefing ? (
              <div className="text-xs text-gray-300 leading-relaxed font-medium space-y-2 prose prose-invert max-w-none">
                {briefing.split('\n').map((para, pIdx) => {
                  if (!para.trim()) return null;
                  return (
                    <p key={pIdx} className="text-xs text-gray-300 leading-relaxed font-normal">
                      {para}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-400 mb-3">
                  Generate an autonomous morning briefing summarizing today's telemetry for executive leadership.
                </p>
                <button
                  onClick={handleGenerateBriefing}
                  className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Generate Morning Briefing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Selected Day Detailed Dossier & Historical Log Stream */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Day Detailed Card */}
          {selectedLog && (
            <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 backdrop-blur shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">Daily Operational Dossier</h3>
                    {getStatusBadge(selectedLog.status)}
                  </div>
                  <span className="text-xs text-gray-400 font-medium block mt-0.5">
                    Logged by <strong className="text-white font-semibold">{selectedLog.author}</strong> on {selectedLog.date}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase tracking-wider font-bold">Resilience Rating</span>
                    <span className="text-lg font-black text-white">{selectedLog.resilienceScore} / 100</span>
                  </div>
                </div>
              </div>

              {/* Summary Statement */}
              <div className="bg-gray-950/60 border border-gray-850 p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
                  Daily Operational Summary
                </span>
                <p className="text-xs text-gray-200 font-medium leading-relaxed">
                  {selectedLog.summary}
                </p>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-850">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Phishing Neutralized</span>
                  <span className="text-sm font-extrabold text-white">{selectedLog.metrics.phishingBlocked} events</span>
                </div>
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-850">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Active Vulnerabilities</span>
                  <span className="text-sm font-extrabold text-amber-400">{selectedLog.metrics.activeCves} CVEs</span>
                </div>
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-850">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Daily Outflow Burn</span>
                  <span className="text-sm font-extrabold text-white">${selectedLog.metrics.dailyCashOutflow.toLocaleString()}</span>
                </div>
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-850">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Multi-Cloud Uptime</span>
                  <span className="text-sm font-extrabold text-emerald-400">{selectedLog.metrics.cloudUptimePercent}%</span>
                </div>
              </div>

              {/* Notes */}
              {selectedLog.notes && (
                <div className="border-t border-gray-800/80 pt-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                    Operational Log Notes
                  </span>
                  <p className="text-xs text-gray-300 font-medium leading-relaxed italic">
                    "{selectedLog.notes}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Historical Log Feed Header with Search & Filter */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 backdrop-blur shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Clock size={16} className="text-indigo-400" />
                  Historical Operations Log Stream
                </h3>
                <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
                  Audit trail of daily check-ins, security incident logs, and SLA variances
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="optimal">Optimal</option>
                  <option value="stable">Stable</option>
                  <option value="attention">Attention</option>
                  <option value="elevated">Elevated</option>
                </select>
              </div>
            </div>

            {/* List of past logs */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs font-medium">
                  No daily logs match the selected filter criteria.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isCurrent = log.id === selectedLog?.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-indigo-500/60 bg-indigo-950/20'
                          : 'border-gray-800/80 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-900/60'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {new Date(log.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {getStatusBadge(log.status)}
                          {log.metrics.incidentsReported > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
                              {log.metrics.incidentsReported} Incident
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 font-medium truncate">
                          {log.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 sm:text-right">
                        <div>
                          <span className="text-[10px] text-gray-500 font-medium block">Resilience</span>
                          <span className="text-xs font-extrabold text-white">{log.resilienceScore}/100</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-600" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Today's Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Log Daily Operations Check-in</h3>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCheckIn} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Log Date
                  </label>
                  <input
                    type="date"
                    required
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Resilience Status
                  </label>
                  <select
                    value={entryForm.status}
                    onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value as any })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="optimal">Optimal (90+)</option>
                    <option value="stable">Stable (80-89)</option>
                    <option value="attention">Attention Needed (70-79)</option>
                    <option value="elevated">Elevated Risk (60-69)</option>
                    <option value="critical">Critical Incident (&lt;60)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Daily Resilience Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={entryForm.resilienceScore}
                    onChange={(e) => setEntryForm({ ...entryForm, resilienceScore: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Active Incidents Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={entryForm.incidentsReported}
                    onChange={(e) => setEntryForm({ ...entryForm, incidentsReported: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Daily Cash Outflow Burn ($)
                  </label>
                  <input
                    type="number"
                    value={entryForm.dailyCashOutflow}
                    onChange={(e) => setEntryForm({ ...entryForm, dailyCashOutflow: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Multi-Cloud SLA Uptime (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={90}
                    max={100}
                    value={entryForm.cloudUptimePercent}
                    onChange={(e) => setEntryForm({ ...entryForm, cloudUptimePercent: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Today's Operational Summary *
                </label>
                <textarea
                  rows={2}
                  required
                  value={entryForm.summary}
                  onChange={(e) => setEntryForm({ ...entryForm, summary: e.target.value })}
                  placeholder="e.g. All cloud delivery pipelines operating smoothly. Zero breach attempts."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Executive Notes & Duty Comments
                </label>
                <textarea
                  rows={2}
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  placeholder="e.g. Offsite backups verified, SAP cluster patch scheduled for 22:00."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-300 font-semibold py-2 px-4 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingLog ? 'Saving...' : 'Save Daily Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
