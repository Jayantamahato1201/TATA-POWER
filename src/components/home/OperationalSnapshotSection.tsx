import React from 'react';
import {
  Database,
  Cpu,
  Layers,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SourceBadge } from '../SourceBadge';

export const OperationalSnapshotSection: React.FC = () => {
  const { overview, datasets, currentDataset, alarmSummary, activeDatasetMetrics } = useData();

  const hasData = overview?.hasData && datasets.length > 0 && (overview?.totalRecords || 0) > 0;
  const totalRecords = overview?.totalRecords || 0;
  const totalEquipment = overview?.equipmentCount || 0;
  const totalMetrics = overview?.metricsDetectedCount || activeDatasetMetrics?.length || 0;
  const criticalCount = alarmSummary?.critical || 0;
  const activeAlertsCount = (alarmSummary?.warning || 0) + (alarmSummary?.critical || 0);

  return (
    <section id="operational-snapshot" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Activity className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">DATA-DRIVEN TELEMETRY SUMMARY</span>
              </div>
              {hasData ? (
                <SourceBadge type="CALCULATED_FROM_DATASET" />
              ) : (
                <SourceBadge type="AWAITING_TELEMETRY" />
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              System Telemetry Summary
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
              Dynamic operational overview derived strictly from currently ingested telemetry datasets and active threshold rules.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs text-[#94A3B8] bg-[#0A1124] px-4 py-2 rounded-xs border border-[#1E293B]">
            {hasData ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                <span>Dataset:</span>
                <span className="text-[#38BDF8] font-bold truncate max-w-[200px]">
                  {currentDataset?.name}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                <span className="text-[#94A3B8]">DATASET STATUS:</span>
                <span className="text-amber-400 font-bold">Awaiting authorised data ingestion</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        {hasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Card 1: Total Records */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-[#205CA5] shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Total Data Points</span>
                <Database className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {totalRecords.toLocaleString()}
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Ingested telemetry rows
                </p>
              </div>
              <div className="text-[9px] font-mono text-[#38BDF8] pt-2 border-t border-[#1E293B]">
                STATUS: DATASET ACTIVE
              </div>
            </div>

            {/* Card 2: Monitored Equipment */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-[#38BDF8] shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Monitored Units</span>
                <Cpu className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {totalEquipment > 0 ? `${totalEquipment} Units` : '1 Unit'}
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Detected from dataset
                </p>
              </div>
              <div className="text-[9px] font-mono text-[#00FF41] pt-2 border-t border-[#1E293B]">
                MAPPED NODES
              </div>
            </div>

            {/* Card 3: Detected Metrics */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-[#60A5FA] shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Detected Metrics</span>
                <Layers className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {totalMetrics > 0 ? `${totalMetrics} Streams` : '—'}
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Isolated time-series
                </p>
              </div>
              <div className="text-[9px] font-mono text-[#60A5FA] pt-2 border-t border-[#1E293B]">
                TAXONOMY: ISOLATED
              </div>
            </div>

            {/* Card 4: Active Alerts */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-amber-500 shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Active Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                  {activeAlertsCount}
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Threshold breaches
                </p>
              </div>
              <div className="text-[9px] font-mono text-amber-400 pt-2 border-t border-[#1E293B]">
                RULE EVALUATION
              </div>
            </div>

            {/* Card 5: Critical Conditions */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-rose-500 shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Critical Conditions</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
                  {criticalCount}
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Critical limit breaches
                </p>
              </div>
              <div className="text-[9px] font-mono text-rose-400 pt-2 border-t border-[#1E293B]">
                HIGH PRIORITY
              </div>
            </div>

            {/* Card 6: Processing Health */}
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-[#00FF41] shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Processing State</span>
                <CheckCircle2 className="w-4 h-4 text-[#00FF41]" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-[#00FF41]">
                  PROCESSED
                </div>
                <p className="text-[10px] text-[#64748B] font-mono mt-1">
                  Schema verified
                </p>
              </div>
              <div className="text-[9px] font-mono text-[#00FF41] pt-2 border-t border-[#1E293B]">
                ENGINE ACTIVE
              </div>
            </div>
          </div>
        ) : (
          /* Explicit Clean Empty State when no dataset is active */
          <div className="p-8 sm:p-12 rounded-sm bg-[#0A1124] border border-[#1E293B] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#070D18] border border-[#1E293B] flex items-center justify-center mx-auto text-[#64748B]">
              <Database className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-mono uppercase">
                NO ACTIVE TELEMETRY DATA
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto font-light">
                Awaiting authorised data ingestion. Metric analytics, alarm counts, and equipment summaries are generated exclusively from uploaded datasets.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-4 border-t border-[#1E293B] font-mono text-xs">
              <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] uppercase block">Data Points</span>
                <span className="text-[#94A3B8] font-bold">—</span>
              </div>
              <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] uppercase block">Detected Metrics</span>
                <span className="text-[#94A3B8] font-bold">—</span>
              </div>
              <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] uppercase block">Active Alerts</span>
                <span className="text-[#94A3B8] font-bold">—</span>
              </div>
              <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] uppercase block">Critical Conditions</span>
                <span className="text-[#94A3B8] font-bold">—</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
