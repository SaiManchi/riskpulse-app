'use strict';
import React from 'react';
import { Shield, TrendingUp, Lock } from 'lucide-react';

interface RiskGaugeProps {
  score: number;
  title: string;
  type: 'health' | 'financial' | 'cyber';
  size?: number;
}

export default function RiskGauge({ score, title, type, size = 120 }: RiskGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'text-emerald-400';
  let strokeColor = '#10b981'; // Emerald
  let bgGlow = 'rgba(16, 185, 129, 0.15)';
  let subtext = 'Excellent';
  let subtextColor = 'text-emerald-400';
  let Icon = Shield;

  if (type === 'financial') {
    strokeColor = '#06b6d4'; // Cyan
    color = 'text-cyan-400';
    bgGlow = 'rgba(6, 182, 212, 0.15)';
    Icon = TrendingUp;
    if (score > 70) {
      subtext = 'High Risk';
      subtextColor = 'text-red-400';
    } else if (score > 35) {
      subtext = 'Moderate Risk';
      subtextColor = 'text-amber-400';
    } else {
      subtext = 'Low Risk';
      subtextColor = 'text-cyan-400';
    }
  } else if (type === 'cyber') {
    strokeColor = '#a855f7'; // Purple
    color = 'text-purple-400';
    bgGlow = 'rgba(168, 85, 247, 0.15)';
    Icon = Lock;
    if (score > 70) {
      subtext = 'High Risk';
      subtextColor = 'text-red-400';
    } else if (score > 35) {
      subtext = 'Moderate Risk';
      subtextColor = 'text-amber-400';
    } else {
      subtext = 'Low Risk';
      subtextColor = 'text-purple-400';
    }
  } else {
    // Health score
    strokeColor = '#10b981'; // Emerald
    color = 'text-emerald-400';
    bgGlow = 'rgba(16, 185, 129, 0.15)';
    Icon = Shield;
    if (score < 50) {
      subtext = 'Critical';
      subtextColor = 'text-red-400';
    } else if (score < 75) {
      subtext = 'Fair';
      subtextColor = 'text-amber-400';
    } else {
      subtext = 'Excellent';
      subtextColor = 'text-emerald-400';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-800/80 hover:border-gray-700/80 rounded-3xl glow-card shadow-lg transition-all duration-300 w-full">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">{title}</h3>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect background */}
        <div 
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500" 
          style={{ backgroundColor: bgGlow }}
        />
        
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-gray-800 fill-transparent"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-3xl font-black tracking-tight text-white">
            {score}
          </span>
          <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${subtextColor}`}>
            {subtext}
          </span>
          <div className={`mt-2 p-1 rounded-full bg-gray-950/80 border border-gray-850 ${color}`}>
            <Icon size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
