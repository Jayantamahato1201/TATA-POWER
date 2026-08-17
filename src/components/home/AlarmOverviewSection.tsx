import React from 'react';
import {
  Bell,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Shield,
  ArrowRight,
  Clock,
  Cpu,
  Volume2,
  Info,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SourceBadge } from '../SourceBadge';

export const AlarmOverviewSection: React.FC<{
  onNavigateToAlarms: () => void;
}> = ({ onNavigateToAlarms }) => {
  const { alarmEvents, alarmSummary, acknowledgeAlarm, resolveAlarm, overview, currentDataset } = useData();
  const { isStaff } = useAuth();
  const hasData = overview?.hasData;

  const activeEvents = alarmEvents.filter((a) => a.status === 'ACTIVE');
  const recentEvents = alarmEvents.slice(0, 6);

  return (
    <section id="alarm-overview" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-rose-500 border-y border-r border-[#1E293B] text-rose-400 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">INCIDENT & SAFETY SURVEILLANCE</span>
              </div>
              {hasData ? (
                <SourceBadge type="CALCULATED_FROM_DATASET" />
              ) : (
                <SourceBadge type="AWAITING_TELEMETRY" />
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              Operational Alert Intelligence
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
              Threshold surveillance, multi-tiered severity escalation, and equipment incident logging evaluated strictly against uploaded telemetry and configured operating limits.
            </p>
          </div>

          <button
            id="btn-view-alarm-center"
            onClick={onNavigateToAlarms}
            className="px-5 py-2.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#38BDF8] border border-[#205CA5]/60 hover:border-[#38BDF8] font-mono text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg self-start lg:self-center"
          >
            <span>View Alarm Center ({hasData ? alarmEvents.length : 0})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Severity Metrics Row */}
        {hasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#205CA5]">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">Total Incidents</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                {alarmEvents.length}
              </div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">Evaluated against rules</p>
            </div>

            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-rose-500">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">Critical Priority</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 mt-1">
                {alarmSummary.critical}
              </div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">Immediate limit breach</p>
            </div>

            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-amber-500">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">Warning Advisories</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
                {alarmSummary.warning}
              </div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">Operating near upper tolerance</p>
            </div>

            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#00FF41]">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">Resolved Events</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#00FF41] mt-1">
                {alarmSummary.resolved}
              </div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">Restored to baseline tolerances</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#1E293B]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Total Incidents</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#64748B] mt-1">—</div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">No active dataset</p>
            </div>
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#1E293B]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Critical Priority</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#64748B] mt-1">—</div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">No active dataset</p>
            </div>
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#1E293B]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Warning Advisories</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#64748B] mt-1">—</div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">No active dataset</p>
            </div>
            <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#1E293B]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Resolved Events</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#64748B] mt-1">—</div>
              <p className="text-[10px] text-[#64748B] font-mono mt-1">No active dataset</p>
            </div>
          </div>
        )}

        {/* Live Active Incident Ticker Table */}
        <div className="p-6 sm:p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm sm:text-base font-bold text-white uppercase font-mono tracking-wide">
                Live Incident Ticker & Equipment Impact
              </h3>
            </div>
            <span className="text-xs font-mono text-[#94A3B8]">
              {hasData ? `${activeEvents.length} Active Alarms Triggered` : 'Awaiting Ingestion'}
            </span>
          </div>

          {hasData && recentEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentEvents.map((alarm, idx) => (
                <div
                  key={`${alarm.id || 'alm'}_${idx}`}
                  className={`p-4 rounded-xs border transition-all flex flex-col justify-between space-y-3 ${
                    alarm.status === 'ACTIVE'
                      ? alarm.alarmLevel === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-[#070D18] border-[#1E293B] text-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold text-white uppercase"
                          style={{ backgroundColor: alarm.color || '#EF4444' }}
                        >
                          {alarm.alarmLevel}
                        </span>
                        <span className="font-bold text-white text-xs sm:text-sm font-mono">
                          {alarm.ruleName}
                        </span>
                      </div>
                      <p className="text-xs text-[#CBD5E1] pt-1">{alarm.message}</p>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-xs shrink-0 ${
                        alarm.status === 'ACTIVE'
                          ? 'bg-rose-900/60 text-white animate-pulse'
                          : 'bg-[#1E293B] text-[#94A3B8]'
                      }`}
                    >
                      {alarm.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                    <span>Equipment: {alarm.equipmentId || 'Fleet-Wide'}</span>
                    <span>Value: {alarm.actualValue} (Limit: {alarm.thresholdValue})</span>
                    {isStaff && alarm.status === 'ACTIVE' && (
                      <button
                        onClick={() => acknowledgeAlarm(alarm.id)}
                        className="px-2 py-0.5 rounded-xs bg-[#1E293B] hover:bg-[#205CA5] text-white cursor-pointer uppercase transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : hasData ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#00FF41]" />
              <p className="text-sm font-mono text-[#94A3B8]">
                NO ACTIVE ALARMS DETECTED FROM THE CURRENT DATASET
              </p>
              <p className="text-xs text-[#64748B]">
                All telemetry channels are within configured normal operating limits.
              </p>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Info className="w-10 h-10 text-[#64748B]" />
              <p className="text-sm font-mono text-[#94A3B8]">
                AWAITING OPERATIONAL DATASET INGESTION
              </p>
              <p className="text-xs text-[#64748B]">
                Threshold evaluation and alarm detection activate automatically upon telemetry ingestion.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
