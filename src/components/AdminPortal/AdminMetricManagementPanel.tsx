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
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-50 text-[#0284C7] rounded-xl border border-sky-200 shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider font-mono">
                Metric & Visualization Schema Management
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-normal">
                Configure separate 3D surface parameters, display names, units, monitoring status, and alarm thresholds per auto-detected metric.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId || ''}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0284C7] shadow-xs cursor-pointer"
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
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300 cursor-pointer transition-colors shadow-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0284C7]' : ''}`} />
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || metrics.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer font-mono uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving All...' : 'Save All Configurations'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Metrics List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs font-mono shadow-sm">
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
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all space-y-4"
              >
                {/* Metric Title & Toggles */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-700">
                      {getCategoryIcon(current.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={current.name}
                          onChange={(e) => handleFieldChange(m.id, 'name', e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-900 focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 font-sans max-w-[280px] shadow-xs"
                        />
                        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold">
                          Field: {m.key}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Category: <b className="text-slate-800 uppercase">{current.category}</b> • Data: {m.dataType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-4">
                    {/* Unit */}
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 font-semibold">
                      <span>Unit:</span>
                      <input
                        type="text"
                        value={current.unit}
                        onChange={(e) => handleFieldChange(m.id, 'unit', e.target.value)}
                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-[#0284C7] font-bold font-mono focus:border-[#0284C7] text-center shadow-xs"
                      />
                    </div>

                    {/* Monitoring Switch */}
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.isVisible}
                        onChange={(e) => handleFieldChange(m.id, 'isVisible', e.target.checked)}
                        className="w-4 h-4 rounded text-[#0284C7] bg-white border-slate-300 accent-[#0284C7]"
                      />
                      Show Graph
                    </label>

                    {/* 3D Surface Switch */}
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.show3D}
                        onChange={(e) => handleFieldChange(m.id, 'show3D', e.target.checked)}
                        className="w-4 h-4 rounded text-[#0284C7] bg-white border-slate-300 accent-[#0284C7]"
                      />
                      Enable 3D Surface
                    </label>

                    {/* Save Button for this metric */}
                    <button
                      onClick={() => handleSaveMetric(m.id)}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-[#0284C7]" />
                      Save
                    </button>
                  </div>
                </div>

                {/* Configuration Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {/* Low Warning Threshold */}
                  <div>
                    <label className="text-[11px] font-mono text-sky-700 font-bold block mb-1">
                      Low Warning Threshold ({current.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresh.low ?? ''}
                      onChange={(e) => handleThresholdChange(m.id, 'low', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* High Alarm Threshold */}
                  <div>
                    <label className="text-[11px] font-mono text-rose-700 font-bold block mb-1">
                      High Alarm Threshold ({current.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresh.high ?? ''}
                      onChange={(e) => handleThresholdChange(m.id, 'high', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-rose-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Alarm Severity */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-700 font-semibold block mb-1">
                      Alarm Breach Severity
                    </label>
                    <select
                      value={thresh.alarmSeverity || 'CRITICAL'}
                      onChange={(e) => handleThresholdChange(m.id, 'alarmSeverity', e.target.value as AlarmLevel)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-[#0284C7] focus:outline-none shadow-xs cursor-pointer font-bold"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                    </select>
                  </div>

                  {/* 3D Vertical Scale */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-700 font-semibold block mb-1">
                      3D Vertical Elevation Scale ({threeD.verticalScale}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={threeD.verticalScale || 1.0}
                      onChange={(e) => handleThreeDChange(m.id, 'verticalScale', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0284C7] mt-2"
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
