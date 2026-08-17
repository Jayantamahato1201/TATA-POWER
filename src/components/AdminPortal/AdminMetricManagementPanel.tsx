import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Radio,
  Droplet,
  Gauge,
  Clock,
  Activity,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { MetricDefinition, DatasetMetricsOverview, AlarmLevel, MetricThresholdConfig } from '../../types';

export const AdminMetricManagementPanel: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const { datasets, selectedDatasetId, setSelectedDatasetId, refreshData, lastUpdated } = useData();

  const [overview, setOverview] = useState<DatasetMetricsOverview | null>(null);
  const [metricEdits, setMetricEdits] = useState<Record<string, MetricDefinition>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch metrics overview
  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/metrics/overview?datasetId=${selectedDatasetId || ''}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data: DatasetMetricsOverview = await res.json();
        setOverview(data);

        const editsMap: Record<string, MetricDefinition> = {};
        data.detectedMetrics.forEach((m) => {
          editsMap[m.id] = { ...m };
        });
        setMetricEdits(editsMap);
      }
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedDatasetId, lastUpdated]);

  const handleFieldChange = (metricId: string, field: keyof MetricDefinition, value: any) => {
    setMetricEdits((prev) => {
      const target = prev[metricId] || overview?.detectedMetrics.find((m) => m.id === metricId);
      if (!target) return prev;
      return {
        ...prev,
        [metricId]: {
          ...target,
          [field]: value,
        },
      };
    });
  };

  const handleThresholdChange = (metricId: string, field: string, value: any) => {
    setMetricEdits((prev) => {
      const target = prev[metricId] || overview?.detectedMetrics.find((m) => m.id === metricId);
      if (!target) return prev;
      return {
        ...prev,
        [metricId]: {
          ...target,
          thresholds: {
            ...target.thresholds,
            [field]: value,
          },
        },
      };
    });
  };

  const handleThreeDChange = (metricId: string, field: string, value: any) => {
    setMetricEdits((prev) => {
      const target = prev[metricId] || overview?.detectedMetrics.find((m) => m.id === metricId);
      if (!target) return prev;
      return {
        ...prev,
        [metricId]: {
          ...target,
          threeDSettings: {
            wireframe: false,
            verticalScale: 1.0,
            surfaceResolution: 40,
            showPoints: true,
            showGrid: true,
            ...(target.threeDSettings || {}),
            [field]: value,
          },
        },
      };
    });
  };

  const handleSaveMetric = async (metricId: string) => {
    const configToSave = metricEdits[metricId];
    if (!configToSave) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/metrics/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          metricKey: metricId,
          config: configToSave,
        }),
      });

      if (res.ok) {
        setSaveSuccessMessage(`Saved configuration for ${configToSave.name}`);
        await refreshData();
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save metric config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const [mId, cfg] of Object.entries(metricEdits)) {
        await fetch('/api/metrics/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            metricKey: mId,
            config: cfg,
          }),
        });
      }
      setSaveSuccessMessage('All metric configurations saved and synchronized successfully!');
      await refreshData();
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to save all metrics:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
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
      default:
        return <Activity className="w-4 h-4 text-cyan-400" />;
    }
  };

  const metrics = overview?.detectedMetrics || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Metric & Visualization Schema Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure separate 3D surface parameters, display names, units, monitoring status, and alarm thresholds per auto-detected metric.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId || ''}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.totalRows} rows)
              </option>
            ))}
          </select>

          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || metrics.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving All...' : 'Save All Configurations'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Metrics List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs font-mono">
          No metrics detected in the selected dataset.
        </div>
      ) : (
        <div className="space-y-4">
          {metrics.map((m) => {
            const current = metricEdits[m.id] || m;
            const thresh = (current.thresholds || {}) as MetricThresholdConfig;
            const threeD = current.threeDSettings || { wireframe: false, verticalScale: 1.0, surfaceResolution: 40 };

            return (
              <div
                key={m.id}
                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all space-y-4"
              >
                {/* Metric Title & Toggles */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                      {getCategoryIcon(current.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={current.name}
                          onChange={(e) => handleFieldChange(m.id, 'name', e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-amber-500 font-sans max-w-[280px]"
                        />
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          Field: {m.key}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Category: <b className="text-slate-300 uppercase">{current.category}</b> • Data: {m.dataType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-4">
                    {/* Unit */}
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                      <span>Unit:</span>
                      <input
                        type="text"
                        value={current.unit}
                        onChange={(e) => handleFieldChange(m.id, 'unit', e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-400 font-bold font-mono focus:border-cyan-500 text-center"
                      />
                    </div>

                    {/* Monitoring Switch */}
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.isVisible}
                        onChange={(e) => handleFieldChange(m.id, 'isVisible', e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700"
                      />
                      Show Graph
                    </label>

                    {/* 3D Surface Switch */}
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.show3D}
                        onChange={(e) => handleFieldChange(m.id, 'show3D', e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
                      />
                      Enable 3D Surface
                    </label>

                    {/* Save Button for this metric */}
                    <button
                      onClick={() => handleSaveMetric(m.id)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                </div>

                {/* Configuration Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  {/* Low Warning Threshold */}
                  <div>
                    <label className="text-[11px] font-mono text-cyan-400 font-bold block mb-1">
                      Low Warning Threshold ({current.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresh.low ?? ''}
                      onChange={(e) => handleThresholdChange(m.id, 'low', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>

                  {/* High Alarm Threshold */}
                  <div>
                    <label className="text-[11px] font-mono text-rose-400 font-bold block mb-1">
                      High Alarm Threshold ({current.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresh.high ?? ''}
                      onChange={(e) => handleThresholdChange(m.id, 'high', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>

                  {/* Alarm Severity */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Alarm Breach Severity
                    </label>
                    <select
                      value={thresh.alarmSeverity || 'CRITICAL'}
                      onChange={(e) => handleThresholdChange(m.id, 'alarmSeverity', e.target.value as AlarmLevel)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                    </select>
                  </div>

                  {/* 3D Vertical Scale */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      3D Vertical Elevation Scale ({threeD.verticalScale}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={threeD.verticalScale || 1.0}
                      onChange={(e) => handleThreeDChange(m.id, 'verticalScale', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
