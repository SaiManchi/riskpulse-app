'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  DollarSign, 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  FileText, 
  Settings, 
  Briefcase, 
  ChevronDown, 
  Plus, 
  Building,
  Sparkles,
  Edit,
  Trash2,
  Activity,
  Sliders,
  Award
} from 'lucide-react';
import { ClientProfile } from '@/lib/seedData';

interface SidebarProps {
  clients: ClientProfile[];
  activeClientId: string;
  onAddClient: () => void;
  onEditClient?: () => void;
  onDeleteClient?: () => void;
  userRole?: string;
}

export default function Sidebar({ 
  clients, 
  activeClientId, 
  onAddClient, 
  onEditClient,
  onDeleteClient,
  userRole = 'analyst' 
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeClient = clients.find(c => c.id === activeClientId) || clients[0];

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      onAddClient();
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('client', val);
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentTab = searchParams.get('tab') || 'dashboard';

  const navItems = [
    { name: 'Dashboard', tab: 'dashboard', icon: LayoutDashboard },
    { name: 'Stress Simulator', tab: 'simulator', icon: Sliders },
    { name: 'Insurance Readiness', tab: 'insurance', icon: Award },
    { name: 'Daily Tracker', tab: 'daily', icon: Activity },
    { name: 'Situational AI', tab: 'situational', icon: Sparkles },
    { name: 'Financial Health', tab: 'financials', icon: DollarSign },
    { name: 'Cybersecurity', tab: 'cybersecurity', icon: ShieldCheck },
    { name: 'Vendor Risk', tab: 'vendors', icon: Users },
    { name: 'Fraud Audit', tab: 'fraud', icon: AlertTriangle },
    { name: 'RAG Documents', tab: 'documents', icon: FileText },
    { name: 'Admin Panel', tab: 'admin', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-gray-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
          RP
        </div>
        <div>
          <span className="font-bold text-white text-lg tracking-tight">RiskPulse</span>
          <span className="text-[10px] text-indigo-400 block -mt-1 font-semibold uppercase tracking-wider">MSP SaaS</span>
        </div>
      </div>

      {/* Workspace / Client Switcher */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/40">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Briefcase size={12} className="text-gray-400" />
          Active Client Profile
        </label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <select
              value={activeClientId}
              onChange={handleClientChange}
              className="w-full bg-gray-900 text-sm text-white font-medium py-2 px-3 pr-8 rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
              {userRole === 'admin' && <option value="ADD_NEW">+ Register New Client</option>}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <ChevronDown size={14} />
            </div>
          </div>
          {userRole === 'admin' && (
            <div className="flex gap-1 shrink-0 animate-in fade-in duration-200">
              <button
                onClick={() => onEditClient?.()}
                title="Edit active client details"
                className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDeleteClient?.()}
                title="Delete active client"
                className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        {activeClient && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {activeClient.industry} Sector
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = `/dashboard?tab=${item.tab}&client=${activeClientId}`;
          const active = currentTab === item.tab;

          return (
            <Link
              key={item.name}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active 
                  ? 'bg-indigo-600/15 text-indigo-400 border-l-2 border-indigo-500' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icon size={18} className={active ? 'text-indigo-400' : 'text-gray-400'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Info footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center text-sm font-bold text-indigo-300">
          MS
        </div>
        <div className="overflow-hidden">
          <span className="block text-xs font-semibold text-white truncate">sai@msp-riskpulse.com</span>
          <span className="block text-[10px] text-gray-500 font-medium">Lead MSP Analyst</span>
        </div>
      </div>
    </aside>
  );
}
