import React, { useState } from 'react';
import {
  Activity,
  Layers,
  BarChart2,
  Sliders,
  SlidersHorizontal,
  Bell,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Flame,
  Zap,
  Gauge,
  Droplet,
  Clock,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MetricAnalyticsPayload, MetricDefinition, AlarmLevel } from '../../types';
import { MetricMultiSeries2D } from './MetricMultiSeries2D';
import { MetricHistogramDistribution } from './MetricHistogramDistribution';

interface MetricCardSectionProps {
  payload: MetricAnalyticsPayload;
  onUpdateMetricConfig?: (metricKey: string, updated: Partial<MetricDefinition>) => void;
  isAdminOrStaff?: boolean;
}

export const MetricCardSection: React.FC<MetricCardSectionProps> = ({
  payload,
  onUpdateMetricConfig,
  isAdminOrStaff = true,
}) => {
  const { metric, distribution, alarms, generatorSeries } = payload;
  const { unit, thresholds, colorScheme } = metric;
  const { stats } = distribution;

  const [activeTab, setActiveTab] = useState<'2d' | 'histogram' | 'thresholds'>('2d');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local threshold edit state
  const [localLow, setLocalLow] = useState<number>(thresholds.low ?? stats.min);
  const [localHigh, setLocalHigh] = useState<number>(thresholds.high ?? stats.max);
  const [localAlarmEnabled, setLocalAlarmEnabled] = useState(thresholds.alarmEnabled ?? true);
  const [localSeverity, setLocalSeverity] = useState<AlarmLevel>(thresholds.alarmSeverity || 'CRITICAL');

  // Category Icon Resolver
  const getCategoryIcon = () => {
    switch (metric.category) {
      case 'temperature':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'voltage':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'power':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'frequency':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'fuel':
        return <Droplet className="w-4 h-4 text-purple-400" />;
      case 'pressure':
        return <Gauge className="w-4 h-4 text-sky-400" />;
      case 'duration':
        return <Clock className="w-4 h-4 text-teal-400" />;
      case 'rpm':
        return <Activity className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleSaveThresholds = async () => {
    if (!onUpdateMetricConfig) return;
    setIsSaving(true);
    try {
      await onUpdateMetricConfig(metric.id, {
        thresholds: {
          ...thresholds,
          low: localLow,
          high: localHigh,
          alarmEnabled: localAlarmEnabled,
          alarmSeverity: localSeverity,
          enabled: true,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', ...generatorSeries.map((s) => s.name)];
    const csvRows = [headers.join(',')];

    payload.timeSeries.forEach((row) => {
      const rowVals = [row.timestamp, ...generatorSeries.map((s) => row.values[s.name] ?? '')];
      csvRows.push(rowVals.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metric.name.replace(/\s+/g, '_')}_Analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-2xl transition-all duration-200 hover:border-slate-700/80">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        {/* Metric Identity */}
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl border border-slate-700/60 shadow-inner"
            style={{ backgroundColor: `${colorScheme.primary}15` }}
          >
            {getCategoryIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-wide text-white uppercase font-sans">
                {metric.name}
              </h3>
              <span
                className="px-2 py-0.5 rounded-md text-xs font-mono font-bold border"
                style={{
                  backgroundColor: `${colorScheme.primary}20`,
                  color: colorScheme.primary || '#38BDF8',
                  borderColor: `${colorScheme.primary}40`,
                }}
              >
                {unit || 'Units'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {metric.dataType === 'key_value' ? 'Report Field' : 'Telemetry Channel'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dedicated single-metric visualization • {stats.totalRecords} ingested data points
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Visual Mode Toggles */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => {
                setActiveTab('2d');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === '2d'
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Multi-Generator 2D
            </button>
            <button
              onClick={() => {
                setActiveTab('histogram');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'histogram'
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Distribution
            </button>
            <button
              onClick={() => {
                setActiveTab('thresholds');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'thresholds'
                  ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Thresholds ({alarms.length})
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60"
            title="Export CSV for this metric"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Collapse/Expand */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60"
            title={isCollapsed ? 'Expand graph' : 'Collapse graph'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="space-y-4">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-400 font-mono">Min Recorded:</span>
              <span className="text-sm font-bold text-slate-200 font-mono">
                {stats.min} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-400 font-mono">Avg Operational:</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {stats.avg} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-400 font-mono">Max Peak:</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {stats.max} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-400 font-mono">Breach Alarms:</span>
              <span
                className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                  alarms.length > 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {alarms.length} Events
              </span>
            </div>
          </div>

          {/* Active Visualization Mode View */}
          {activeTab === '2d' && (
            <MetricMultiSeries2D payload={payload} height={380} />
          )}

          {activeTab === 'histogram' && (
            <MetricHistogramDistribution payload={payload} height={340} />
          )}

          {activeTab === 'thresholds' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    {metric.name} Threshold & Alarm Configuration
                  </h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Unit: <b className="text-slate-200">{unit || 'Units'}</b>
                </span>
              </div>

              {/* Threshold Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Low Threshold */}
                <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">
                      Low Warning Threshold
                    </span>
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {localLow} {unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.floor(stats.min * 0.8)}
                    max={Math.ceil(stats.max * 1.2)}
                    step="0.5"
                    value={localLow}
                    onChange={(e) => setLocalLow(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Values dropping below this level will trigger low parameter warnings.
                  </p>
                </div>

                {/* High Threshold */}
                <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400">
                      High Alarm Threshold
                    </span>
                    <span className="text-sm font-mono font-bold text-rose-400">
                      {localHigh} {unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.floor(stats.min * 0.8)}
                    max={Math.ceil(stats.max * 1.2)}
                    step="0.5"
                    value={localHigh}
                    onChange={(e) => setLocalHigh(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Values exceeding this level will trigger critical operational alarms.
                  </p>
                </div>
              </div>

              {/* Alarm Rules Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={localAlarmEnabled}
                      onChange={(e) => setLocalAlarmEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-amber-500"
                    />
                    Enable Real-time Alarm Triggering
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Severity:</span>
                    <select
                      value={localSeverity}
                      onChange={(e) => setLocalSeverity(e.target.value as AlarmLevel)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                    </select>
                  </div>
                </div>

                {isAdminOrStaff && (
                  <button
                    onClick={handleSaveThresholds}
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSaving ? 'Saving Thresholds...' : 'Save Metric Thresholds'}
                  </button>
                )}
              </div>

              {/* Active Alarms for this metric */}
              {alarms.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Detected Metric Breaches ({alarms.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {alarms.map((alm) => (
                      <div
                        key={alm.id}
                        className="flex items-center justify-between bg-slate-900/90 border border-rose-500/20 p-2.5 rounded-lg text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              alm.thresholdType === 'HIGH' ? 'bg-rose-500' : 'bg-cyan-400'
                            }`}
                          />
                          <span className="text-slate-300 font-bold">{alm.equipment}:</span>
                          <span className="text-white">{alm.message}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{alm.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  All ingested {metric.name} data points are operating within nominal thresholds.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
