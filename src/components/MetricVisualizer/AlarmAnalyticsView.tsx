import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Activity,
  Layers,
  Flame,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { AlarmAnalyticsPayload } from '../../types';

interface AlarmAnalyticsViewProps {
  analytics: AlarmAnalyticsPayload;
}

export const AlarmAnalyticsView: React.FC<AlarmAnalyticsViewProps> = ({ analytics }) => {
  const { timeline, bySeverity, byType, byEquipment, durationStats, valuesByUnit } = analytics;

  // Timeline EChart Option
  const timelineCategories = timeline.map((t) => t.timestamp);
  const criticalSeries = timeline.map((t) => t.critical);
  const warningSeries = timeline.map((t) => t.warning);

  const timelineOption = {
    backgroundColor: 'transparent',
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontFamily: 'monospace' },
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontFamily: 'monospace' },
    },
    xAxis: {
      type: 'category',
      data: timelineCategories,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 },
    },
    yAxis: {
      type: 'value',
      name: 'Alarm Count',
      nameTextStyle: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'Critical Alarms',
        type: 'line',
        data: criticalSeries,
        itemStyle: { color: '#EF4444' },
        lineStyle: { width: 2.5, color: '#EF4444' },
        smooth: true,
      },
      {
        name: 'Warning Alarms',
        type: 'line',
        data: warningSeries,
        itemStyle: { color: '#F59E0B' },
        lineStyle: { width: 2.5, color: '#F59E0B' },
        smooth: true,
      },
    ],
  };

  // Severity Pie EChart Option
  const pieData = bySeverity.map((s) => ({
    name: s.severity,
    value: s.count,
    itemStyle: { color: s.color },
  }));

  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontFamily: 'monospace' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: '0%',
      left: 'center',
      textStyle: { color: '#94a3b8', fontFamily: 'monospace' },
    },
    series: [
      {
        name: 'Severity',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#fff',
          },
        },
        data: pieData,
      },
    ],
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              Dedicated Alarm & Incident Analytics
            </h3>
            <p className="text-xs text-slate-400">
              Categorical event timelines, severity distributions, outage duration metrics, and unit-separated telemetry
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-mono mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Average Alarm Duration
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {durationStats.avgMinutes} <span className="text-sm font-normal text-slate-400">minutes</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-mono mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Max Outage Duration
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {durationStats.maxMinutes} <span className="text-sm font-normal text-slate-400">minutes</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-mono mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Cumulative Outage Time
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {durationStats.totalMinutes} <span className="text-sm font-normal text-slate-400">total min</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alarm Timeline */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            Alarm Occurrence Timeline
          </h4>
          <div className="h-64">
            <ReactECharts option={timelineOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            Alarm Severity Distribution
          </h4>
          <div className="h-64">
            <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>
        </div>
      </div>

      {/* Values Grouped STRICTLY BY UNIT */}
      {valuesByUnit.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">
              Alarm Parameter Values (Grouped Strictly by Unit)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Per the core rule, alarm parameters with different units (°C, %, Hz, Bar, V, kW) are analyzed in separate dedicated sections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {valuesByUnit.map((uGroup) => (
              <div key={uGroup.unit} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-white uppercase">
                    {uGroup.metricType} Alarms
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {uGroup.unit}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {uGroup.alarms.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800"
                    >
                      <div>
                        <div className="text-slate-300 font-bold">{item.alarm}</div>
                        <div className="text-[10px] text-slate-400">{item.equipment} • {item.timestamp}</div>
                      </div>
                      <div className="text-sm font-bold text-amber-400">
                        {item.value} {item.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
