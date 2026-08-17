import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart2,
  Upload,
  Bell,
  ArrowRight,
  Database,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { TataPowerLogo } from './TataPowerLogo';
import { HeroEnergyCanvas } from './home/HeroEnergyCanvas';
import { useData } from '../context/DataContext';

interface HeroSectionProps {
  onNavigateToAnalytics: () => void;
  onNavigateToUpload: () => void;
  onNavigateToAlerts: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigateToAnalytics,
  onNavigateToUpload,
  onNavigateToAlerts,
}) => {
  const { overview, datasets, currentDataset, alarmSummary } = useData();
  const hasData = overview?.hasData && datasets.length > 0;

  return (
    <section
      id="hero-overview"
      className="relative w-full rounded-2xl border border-[#1E293B] bg-gradient-to-b from-[#0B132B]/80 via-[#070D18]/90 to-[#070D18] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl"
    >
      {/* Soft Animated Industrial Grid & Subtle Energy Canvas */}
      <HeroEnergyCanvas />

      {/* Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#0284C7]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Plant Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0F172A]/90 border border-[#1E293B] text-xs font-mono text-[#94A3B8] shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
          <span className="text-[#E2E8F0] font-semibold">TATA POWER</span>
          <span className="text-[#475569]">|</span>
          <span className="text-[#CBD5E1]">JAMSHEDPUR</span>
          <span className="text-[#475569]">|</span>
          <span className="text-[#38BDF8] font-bold">427.5 MW</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-sans">
            Jojobera Thermal Power Station
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-[#94A3B8] max-w-2xl mx-auto font-normal leading-relaxed">
            Operational telemetry analytics platform for authorized uploaded equipment and plant datasets.
          </p>
        </div>

        {/* 3 Important Primary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="hero-btn-view-analytics"
            onClick={onNavigateToAnalytics}
            className="px-5 py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-sky-950/50 transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <BarChart2 className="w-4 h-4" />
            <span>View Analytics</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            id="hero-btn-upload-data"
            onClick={onNavigateToUpload}
            className="px-5 py-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#38BDF8]/40 text-white text-sm font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <Upload className="w-4 h-4 text-[#38BDF8]" />
            <span>Upload Data</span>
          </button>

          <button
            id="hero-btn-view-alerts"
            onClick={onNavigateToAlerts}
            className="px-5 py-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-amber-500/40 text-[#CBD5E1] text-sm font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>View Alerts</span>
            {alarmSummary.active > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {alarmSummary.active}
              </span>
            )}
          </button>
        </div>

        {/* Active Telemetry Status pill */}
        <div className="pt-2 flex items-center justify-center text-xs font-mono text-[#64748B] space-x-3">
          {hasData ? (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Ingestion: <strong className="text-white">{currentDataset?.name}</strong></span>
              <span>({overview?.totalRecords?.toLocaleString()} records)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Ready for operational telemetry ingestion (CSV, XLSX, XLS)</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
