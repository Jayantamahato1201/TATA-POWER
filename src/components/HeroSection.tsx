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
      className="relative w-full rounded-2xl border border-slate-200 dark:border-[#1E293B] bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-[#0B132B]/90 dark:via-[#070D18]/95 dark:to-[#070D18] p-5 sm:p-8 md:p-10 lg:p-12 overflow-hidden shadow-sm dark:shadow-2xl min-h-[auto] transition-colors duration-200"
    >
      {/* Soft Animated Industrial Grid & Subtle Energy Canvas */}
      <HeroEnergyCanvas />

      {/* Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[350px] bg-[#0284C7]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
        {/* Plant Badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#0F172A]/90 border border-slate-200 dark:border-[#1E293B] text-[11px] sm:text-xs font-mono text-slate-700 dark:text-[#CBD5E1] shadow-sm backdrop-blur-md max-w-full transition-colors duration-200">
          <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse shrink-0" />
          <span className="text-slate-900 dark:text-[#F8FAFC] font-bold whitespace-nowrap">TATA POWER</span>
          <span className="text-slate-400 dark:text-[#64748B] hidden xs:inline">|</span>
          <span className="text-slate-600 dark:text-[#CBD5E1] whitespace-nowrap">JAMSHEDPUR</span>
          <span className="text-slate-400 dark:text-[#64748B] hidden xs:inline">|</span>
          <span className="text-[#0284C7] dark:text-[#38BDF8] font-bold whitespace-nowrap">427.5 MW</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-2.5 sm:space-y-3.5 max-w-full">
          <h1
            id="hero-heading-main"
            className="hero-heading text-slate-900 dark:text-white font-extrabold tracking-tight font-sans text-center transition-colors duration-200"
          >
            Jojobera Thermal Power Station
          </h1>

          <p className="hero-subtitle text-slate-600 dark:text-[#CBD5E1] max-w-2xl mx-auto font-normal leading-relaxed px-2 text-center transition-colors duration-200">
            Operational telemetry analytics platform for authorized uploaded equipment and plant datasets.
          </p>
        </div>

        {/* 3 Important Primary Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3.5 pt-2 max-w-xl sm:max-w-none mx-auto w-full">
          <button
            id="hero-btn-view-analytics"
            onClick={onNavigateToAnalytics}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-sky-950/20 dark:shadow-sky-950/50 transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <BarChart2 className="w-4 h-4 shrink-0 text-white" />
            <span className="text-white font-medium">View Analytics</span>
            <ArrowRight className="w-4 h-4 ml-1 shrink-0 text-white" />
          </button>

          <button
            id="hero-btn-upload-data"
            onClick={onNavigateToUpload}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#1E293B] border border-slate-300 dark:border-[#334155] hover:border-[#0284C7] dark:hover:border-[#38BDF8]/60 text-slate-800 dark:text-white text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm dark:shadow-md transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <Upload className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
            <span className="text-slate-800 dark:text-white font-medium">Upload Data</span>
          </button>

          <button
            id="hero-btn-view-alerts"
            onClick={onNavigateToAlerts}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#1E293B] border border-slate-300 dark:border-[#334155] hover:border-amber-500/60 text-slate-800 dark:text-white text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm dark:shadow-md transition-all cursor-pointer hover:translate-y-[-1px]"
          >
            <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="text-slate-800 dark:text-white font-medium">View Alerts</span>
            {alarmSummary.active > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                {alarmSummary.active}
              </span>
            )}
          </button>
        </div>

        {/* Active Telemetry Status pill */}
        <div className="pt-2 flex flex-wrap items-center justify-center text-xs font-mono text-slate-600 dark:text-[#CBD5E1] gap-2 px-2 max-w-full transition-colors duration-200">
          {hasData ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
              <span>Active Ingestion: <strong className="text-slate-900 dark:text-white font-semibold">{currentDataset?.name}</strong></span>
              <span className="text-slate-500 dark:text-[#94A3B8]">({overview?.totalRecords?.toLocaleString()} records)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-slate-600 dark:text-[#CBD5E1]">Ready for operational telemetry ingestion (CSV, XLSX, XLS)</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
