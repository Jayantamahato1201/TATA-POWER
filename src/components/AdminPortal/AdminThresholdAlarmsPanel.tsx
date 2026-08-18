import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Sliders,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Flame,
  Zap,
  Radio,
  Droplet,
  Gauge,
  Clock,
  Activity,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Check,
  ChevronDown,
  Layers,
  Database,
  Tag,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { MetricDefinition, DatasetMetricsOverview, MetricThresholdConfig } from '../../types';

export const AdminThresholdAlarmsPanel: React.FC = () => {
  const { token } = useAuth();
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    refreshData,
    refreshAlarms,
  } = useData();

  const [overview, setOverview] = useState<DatasetMetricsOverview | null>(null);
  const [metricEdits, setMetricEdits] = useState<Record<string, MetricDefinition>>({});
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Custom Metric Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    unit: '',
    low: '',
    normalMin: '',
    normalMax: '',
    warningLimit: '',
    criticalLimit: '',
    alarmEnabled: true,
  });
  const [customModalError, setCustomModalError] = useState<string | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  // Fetch metrics overview for the active dataset
  const fetchOverview = async (targetDatasetId?: string, preferredMetricId?: string) => {
    const dsId = targetDatasetId || selectedDatasetId || (datasets.length > 0 ? datasets[0].id : '');
    if (!dsId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/metrics/overview?datasetId=${encodeURIComponent(dsId)}`, {
        headers: authHeaders,
      });

      if (res.ok) {
        const data: DatasetMetricsOverview = await res.json();
        setOverview(data);

        const editsMap: Record<string, MetricDefinition> = {};
        data.detectedMetrics.forEach((m) => {
          editsMap[m.id] = {
            ...m,
            thresholds: {
              ...m.thresholds,
              low: m.thresholds.low !== undefined && m.thresholds.low !== null ? m.thresholds.low : undefined,
              normalMin: m.thresholds.normalMin !== undefined && m.thresholds.normalMin !== null ? m.thresholds.normalMin : undefined,
              normalMax: m.thresholds.normalMax !== undefined && m.thresholds.normalMax !== null ? m.thresholds.normalMax : undefined,
              warningLimit: m.thresholds.warningLimit !== undefined && m.thresholds.warningLimit !== null ? m.thresholds.warningLimit : undefined,
              criticalLimit: m.thresholds.criticalLimit !== undefined && m.thresholds.criticalLimit !== null ? m.thresholds.criticalLimit : undefined,
              enabled: m.thresholds.enabled !== false,
              alarmEnabled: m.thresholds.alarmEnabled !== false,
              alarmSeverity: m.thresholds.alarmSeverity || 'CRITICAL',
            },
          };
        });
        setMetricEdits(editsMap);

        // Select preferred metric if provided, otherwise keep existing active or select first
        if (preferredMetricId && data.detectedMetrics.some((m) => m.id === preferredMetricId)) {
          setActiveMetricId(preferredMetricId);
        } else if (activeMetricId && data.detectedMetrics.some((m) => m.id === activeMetricId)) {
          // keep current activeMetricId
        } else if (data.detectedMetrics.length > 0) {
          setActiveMetricId(data.detectedMetrics[0].id);
        } else {
          setActiveMetricId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching metric overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(selectedDatasetId || undefined);
  }, [selectedDatasetId]);

  // Active Metric item
  const currentMetric = useMemo(() => {
    if (!activeMetricId) return null;
    return metricEdits[activeMetricId] || overview?.detectedMetrics.find((m) => m.id === activeMetricId) || null;
  }, [activeMetricId, metricEdits, overview]);

  // Analytics for the selected metric from dataset records
  const currentMetricAnalytics = useMemo(() => {
    if (!activeMetricId || !overview?.metricsData) return null;
    return overview.metricsData[activeMetricId] || null;
  }, [activeMetricId, overview]);

  // Handle input changes
  const handleFieldChange = (field: keyof MetricDefinition, value: any) => {
    if (!activeMetricId) return;
    setMetricEdits((prev) => {
      const target = prev[activeMetricId] || currentMetric;
      if (!target) return prev;
      return {
        ...prev,
        [activeMetricId]: {
          ...target,
          [field]: value,
        },
      };
    });
  };

  const handleThresholdChange = (field: keyof MetricThresholdConfig, rawValue: string) => {
    if (!activeMetricId) return;
    const numVal = rawValue.trim() === '' ? undefined : Number(rawValue);

    setMetricEdits((prev) => {
      const target = prev[activeMetricId] || currentMetric;
      if (!target) return prev;
      return {
        ...prev,
        [activeMetricId]: {
          ...target,
          thresholds: {
            ...target.thresholds,
            [field]: numVal,
          },
        },
      };
    });
  };

  const handleToggleAlarm = (enabled: boolean) => {
    if (!activeMetricId) return;
    setMetricEdits((prev) => {
      const target = prev[activeMetricId] || currentMetric;
      if (!target) return prev;
      return {
        ...prev,
        [activeMetricId]: {
          ...target,
          thresholds: {
            ...target.thresholds,
            alarmEnabled: enabled,
          },
        },
      };
    });
  };

  // Validation logic
  const validationWarning = useMemo(() => {
    if (!currentMetric?.thresholds) return null;
    const { low, normalMin, normalMax, warningLimit, criticalLimit } = currentMetric.thresholds;

    if (normalMin !== undefined && normalMax !== undefined && normalMin > normalMax) {
      return `Normal Min (${normalMin}) is greater than Normal Max (${normalMax}).`;
    }
    if (warningLimit !== undefined && criticalLimit !== undefined && warningLimit > criticalLimit) {
      return `Warning Limit (${warningLimit}) is greater than Critical Limit (${criticalLimit}).`;
    }
    if (low !== undefined && normalMin !== undefined && low > normalMin) {
      return `Low Limit (${low}) is greater than Normal Min (${normalMin}).`;
    }
    return null;
  }, [currentMetric]);

  // Save Settings for active metric
  const handleSaveSettings = async () => {
    if (!activeMetricId || !currentMetric) return;

    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsSaving(true);

    try {
      const currentDatasetId = selectedDatasetId || (datasets.length > 0 ? datasets[0].id : '');
      const payload = {
        metricKey: activeMetricId,
        config: {
          ...currentMetric,
          datasetId: currentDatasetId || currentMetric.datasetId,
          name: (currentMetric.name || '').trim() || 'Metric',
          unit: (currentMetric.unit || '').trim(),
          thresholds: {
            ...currentMetric.thresholds,
            low: currentMetric.thresholds.low !== undefined && currentMetric.thresholds.low !== null && String(currentMetric.thresholds.low).trim() !== '' ? Number(currentMetric.thresholds.low) : undefined,
            normalMin: currentMetric.thresholds.normalMin !== undefined && currentMetric.thresholds.normalMin !== null && String(currentMetric.thresholds.normalMin).trim() !== '' ? Number(currentMetric.thresholds.normalMin) : undefined,
            normalMax: currentMetric.thresholds.normalMax !== undefined && currentMetric.thresholds.normalMax !== null && String(currentMetric.thresholds.normalMax).trim() !== '' ? Number(currentMetric.thresholds.normalMax) : undefined,
            warningLimit: currentMetric.thresholds.warningLimit !== undefined && currentMetric.thresholds.warningLimit !== null && String(currentMetric.thresholds.warningLimit).trim() !== '' ? Number(currentMetric.thresholds.warningLimit) : undefined,
            criticalLimit: currentMetric.thresholds.criticalLimit !== undefined && currentMetric.thresholds.criticalLimit !== null && String(currentMetric.thresholds.criticalLimit).trim() !== '' ? Number(currentMetric.thresholds.criticalLimit) : undefined,
            enabled: currentMetric.thresholds.enabled !== false,
            alarmEnabled: currentMetric.thresholds.alarmEnabled !== false,
          },
        },
      };

      const res = await fetch('/api/metrics/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSaveSuccessMessage(`Settings saved successfully for "${currentMetric.name}"`);
      if (typeof refreshData === 'function') {
        await refreshData();
      }
      if (typeof refreshAlarms === 'function') {
        await refreshAlarms();
      }
      await fetchOverview(currentDatasetId || undefined, activeMetricId);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveErrorMessage(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Custom Metric
  const handleSaveCustomMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) {
      setCustomModalError('Metric Name is required');
      return;
    }
    const currentDatasetId = selectedDatasetId || (datasets.length > 0 ? datasets[0].id : '');
    if (!currentDatasetId) {
      setCustomModalError('Please select a dataset first');
      return;
    }

    setIsSubmittingCustom(true);
    setCustomModalError(null);

    try {
      const res = await fetch('/api/metrics/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          datasetId: currentDatasetId,
          name: customForm.name.trim(),
          unit: customForm.unit.trim(),
          thresholds: {
            low: customForm.low !== '' ? Number(customForm.low) : undefined,
            normalMin: customForm.normalMin !== '' ? Number(customForm.normalMin) : undefined,
            normalMax: customForm.normalMax !== '' ? Number(customForm.normalMax) : undefined,
            warningLimit: customForm.warningLimit !== '' ? Number(customForm.warningLimit) : undefined,
            criticalLimit: customForm.criticalLimit !== '' ? Number(customForm.criticalLimit) : undefined,
            alarmEnabled: customForm.alarmEnabled,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add custom metric');
      }

      setIsCustomModalOpen(false);
      setCustomForm({
        name: '',
        unit: '',
        low: '',
        normalMin: '',
        normalMax: '',
        warningLimit: '',
        criticalLimit: '',
        alarmEnabled: true,
      });

      // Refresh global state, local overview and select the newly created metric
      const newMetricId = data.metric?.id;
      if (typeof refreshData === 'function') {
        await refreshData();
      }
      if (typeof refreshAlarms === 'function') {
        await refreshAlarms();
      }
      await fetchOverview(currentDatasetId, newMetricId);
      setSaveSuccessMessage(`Custom metric "${data.metric?.name || 'Custom'}" created successfully`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      setCustomModalError(err.message || 'Error creating custom metric');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Delete Custom Metric
  const handleDeleteCustomMetric = async (metricKey: string) => {
    if (!confirm('Are you sure you want to delete this custom metric?')) return;
    try {
      const res = await fetch(`/api/metrics/custom/${encodeURIComponent(metricKey)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setSaveSuccessMessage('Custom metric deleted successfully');
        if (typeof refreshData === 'function') {
          await refreshData();
        }
        if (typeof refreshAlarms === 'function') {
          await refreshAlarms();
        }
        await fetchOverview();
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete custom metric:', err);
    }
  };

  const detectedMetricsList = overview?.detectedMetrics || [];
  const selectedDatasetObj = datasets.find((d) => d.id === (selectedDatasetId || overview?.datasetId));

  return (
    <div id="admin_threshold_alarms_module" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. TOP BAR / SELECTOR ROW */}
      <div
        id="threshold_top_selector_bar"
        className="p-5 rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          {/* DATASET SELECTOR */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              Dataset
            </label>
            <div className="relative">
              <select
                id="dataset_select_dropdown"
                value={selectedDatasetId || (datasets.length > 0 ? datasets[0].id : '')}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm appearance-none pr-9 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 transition-all font-medium cursor-pointer shadow-xs"
              >
                {datasets.length === 0 ? (
                  <option value="">No datasets uploaded</option>
                ) : (
                  datasets.map((ds) => {
                    const rowCount = ds.totalRows ?? ds.validRows ?? (ds as any).recordCount ?? (ds as any).recordsCount ?? (ds as any).rowCount ?? 0;
                    return (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({rowCount.toLocaleString()} records)
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* METRIC SELECTOR */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              Metric
            </label>
            <div className="relative">
              <select
                id="metric_select_dropdown"
                value={activeMetricId || ''}
                onChange={(e) => setActiveMetricId(e.target.value)}
                disabled={detectedMetricsList.length === 0}
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm appearance-none pr-9 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 transition-all font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {detectedMetricsList.length === 0 ? (
                  <option value="">No measurable metrics found</option>
                ) : (
                  detectedMetricsList.map((m) => {
                    const unitLabel = m.unit ? ` (${m.unit})` : '';
                    const customTag = m.isCustom ? ' [Custom]' : '';
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {unitLabel}
                        {customTag}
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ADD CUSTOM METRIC BUTTON */}
        <div className="flex items-end pt-2 md:pt-0">
          <button
            id="btn_add_custom_metric"
            onClick={() => {
              setCustomModalError(null);
              setIsCustomModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#EA580C] text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Metric</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {saveSuccessMessage && (
        <div
          id="save_success_toast"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-sm flex items-center space-x-2.5 animate-fadeIn shadow-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {saveErrorMessage && (
        <div
          id="save_error_toast"
          className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-sm flex items-center space-x-2.5 animate-fadeIn shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-medium">{saveErrorMessage}</span>
        </div>
      )}

      {/* 2. MAIN CONFIGURATION CARD */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm flex flex-col items-center justify-center space-y-3 transition-colors duration-200">
          <RefreshCw className="w-7 h-7 text-[#0284C7] dark:text-[#38BDF8] animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading dataset metrics and thresholds...</p>
        </div>
      ) : !currentMetric ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm space-y-4 transition-colors duration-200">
          <Layers className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Metric Selected</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select a dataset and metric above, or create a new custom metric.
            </p>
          </div>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#F27D26] text-white text-sm font-semibold hover:bg-[#EA580C] cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Custom Metric</span>
          </button>
        </div>
      ) : (
        <div
          id="metric_config_card"
          className="rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-colors duration-200"
        >
          {/* CARD HEADER */}
          <div className="p-5 border-b border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#0F172A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0284C7] dark:text-[#38BDF8] shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {currentMetric.name}
                  </h2>
                  {currentMetric.isCustom ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      Custom Metric
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Auto-Detected Column
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Dataset:{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedDatasetObj?.name || 'Active Dataset'}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    ({(selectedDatasetObj?.totalRows ?? selectedDatasetObj?.validRows ?? 0).toLocaleString()} records)
                  </span>{' '}
                  • Column: <span className="font-mono text-[#0284C7] dark:text-[#38BDF8] font-semibold">{currentMetric.key}</span>
                </p>
              </div>
            </div>

            {/* DELETE BUTTON IF CUSTOM */}
            {currentMetric.isCustom && (
              <button
                id="btn_delete_custom_metric"
                onClick={() => handleDeleteCustomMetric(currentMetric.id)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-medium transition-colors cursor-pointer shadow-xs"
                title="Delete this custom metric"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Metric</span>
              </button>
            )}
          </div>

          {/* CARD BODY / CONFIGURATION FORM */}
          <div className="p-6 space-y-6">
            {/* ROW 1: METRIC NAME & UNIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Metric Name
                </label>
                <input
                  id="input_metric_name"
                  type="text"
                  value={currentMetric.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Metric Display Name"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] focus:border-[#0284C7] text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0284C7]/20 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit <span className="text-slate-500 dark:text-slate-400 font-normal">(e.g. °C, V, kW, bar, RPM)</span>
                </label>
                <input
                  id="input_metric_unit"
                  type="text"
                  value={currentMetric.unit || ''}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                  placeholder="Enter unit, e.g. °C, V, kW"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] focus:border-[#0284C7] text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0284C7]/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* ROW 2: THE 5 THRESHOLD LIMITS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                  Alarm & Operational Thresholds
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Values in {currentMetric.unit || 'units'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Low Limit */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">Low Limit</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Under-Limit</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input_low_limit"
                      type="number"
                      step="any"
                      value={
                        currentMetric.thresholds.low !== undefined && currentMetric.thresholds.low !== null
                          ? currentMetric.thresholds.low
                          : ''
                      }
                      onChange={(e) => handleThresholdChange('low', e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 focus:border-sky-500 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none font-mono placeholder:text-slate-400"
                    />
                    {currentMetric.unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none">
                        {currentMetric.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Normal Min */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Normal Min</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Nominal</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input_normal_min"
                      type="number"
                      step="any"
                      value={
                        currentMetric.thresholds.normalMin !== undefined && currentMetric.thresholds.normalMin !== null
                          ? currentMetric.thresholds.normalMin
                          : ''
                      }
                      onChange={(e) => handleThresholdChange('normalMin', e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none font-mono placeholder:text-slate-400"
                    />
                    {currentMetric.unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none">
                        {currentMetric.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Normal Max */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Normal Max</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Nominal</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input_normal_max"
                      type="number"
                      step="any"
                      value={
                        currentMetric.thresholds.normalMax !== undefined && currentMetric.thresholds.normalMax !== null
                          ? currentMetric.thresholds.normalMax
                          : ''
                      }
                      onChange={(e) => handleThresholdChange('normalMax', e.target.value)}
                      placeholder="e.g. 35"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none font-mono placeholder:text-slate-400"
                    />
                    {currentMetric.unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none">
                        {currentMetric.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Warning Limit */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Warning Limit</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Advisory</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input_warning_limit"
                      type="number"
                      step="any"
                      value={
                        currentMetric.thresholds.warningLimit !== undefined && currentMetric.thresholds.warningLimit !== null
                          ? currentMetric.thresholds.warningLimit
                          : ''
                      }
                      onChange={(e) => handleThresholdChange('warningLimit', e.target.value)}
                      placeholder="e.g. 40"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 focus:border-amber-500 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none font-mono placeholder:text-slate-400"
                    />
                    {currentMetric.unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none">
                        {currentMetric.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Critical Limit */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Critical Limit</span>
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400">Alarm Trip</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input_critical_limit"
                      type="number"
                      step="any"
                      value={
                        currentMetric.thresholds.criticalLimit !== undefined && currentMetric.thresholds.criticalLimit !== null
                          ? currentMetric.thresholds.criticalLimit
                          : ''
                      }
                      onChange={(e) => handleThresholdChange('criticalLimit', e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 focus:border-rose-500 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none font-mono placeholder:text-slate-400"
                    />
                    {currentMetric.unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none">
                        {currentMetric.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: ALARM TOGGLE & VALIDATION WARNING */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200 dark:border-[#1E293B]">
              {/* ALARM TOGGLE SWITCH */}
              <div className="flex items-center space-x-3.5">
                <button
                  id="btn_toggle_alarm_state"
                  type="button"
                  onClick={() => handleToggleAlarm(currentMetric.thresholds.alarmEnabled === false)}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                    currentMetric.thresholds.alarmEnabled !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      currentMetric.thresholds.alarmEnabled !== false
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Alarm Monitoring:</span>
                    <span
                      className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        currentMetric.thresholds.alarmEnabled !== false
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {currentMetric.thresholds.alarmEnabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {currentMetric.thresholds.alarmEnabled !== false
                      ? 'System continuously checks uploaded records and triggers alerts for threshold breaches.'
                      : 'Alarms suppressed for this metric.'}
                  </p>
                </div>
              </div>

              {/* SAVE SETTINGS BUTTON */}
              <button
                id="btn_save_metric_settings"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* VALIDATION WARNING IF ANY */}
            {validationWarning && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Threshold Order Notice:</strong> {validationWarning}
                </span>
              </div>
            )}

            {/* 3. REAL DATA TELEMETRY SUMMARY (FROM DATASET RECORDS) */}
            {(() => {
              const stats = currentMetricAnalytics?.distribution?.stats || (currentMetricAnalytics as any)?.stats;
              if (!stats) return null;
              const totalRecs = stats.totalRecords ?? selectedDatasetObj?.totalRows ?? selectedDatasetObj?.validRows ?? 0;
              const breachCount = (currentMetricAnalytics?.alarms?.length ?? 0) || ((stats.highCount || 0) + (stats.lowCount || 0));

              return (
                <div
                  id="metric_real_telemetry_box"
                  className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-4 text-xs font-mono transition-colors duration-200"
                >
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                    <Database className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                    <span className="font-bold text-slate-900 dark:text-white">Dataset Records Telemetry:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Min Recorded: </span>
                      <strong className="text-sky-700 dark:text-sky-400 font-bold">
                        {stats.min !== undefined
                          ? `${stats.min} ${currentMetric.unit || ''}`
                          : 'N/A'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Max Recorded: </span>
                      <strong className="text-rose-700 dark:text-rose-400 font-bold">
                        {stats.max !== undefined
                          ? `${stats.max} ${currentMetric.unit || ''}`
                          : 'N/A'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Average: </span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {stats.avg !== undefined
                          ? `${stats.avg} ${currentMetric.unit || ''}`
                          : 'N/A'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Total Records: </span>
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {totalRecs.toLocaleString()} records
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Active Breaches: </span>
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold ${
                          breachCount > 0
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        }`}
                      >
                        {breachCount} breaches
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. ADD CUSTOM METRIC MODAL */}
      {isCustomModalOpen && (
        <div
          id="custom_metric_modal_overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            id="custom_metric_modal_content"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-2xl overflow-hidden transition-colors duration-200"
          >
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between bg-slate-50 dark:bg-[#0F172A]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-[#F27D26]" />
                  <span>Add Custom Metric</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Link to dataset:{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {selectedDatasetObj?.name || 'Selected Dataset'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveCustomMetric} className="p-6 space-y-4">
              {customModalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{customModalError}</span>
                </div>
              )}

              {/* NAME & UNIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metric Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    placeholder="e.g. Bearing Vibration"
                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] focus:border-[#F27D26] text-slate-900 dark:text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customForm.unit}
                    onChange={(e) => setCustomForm({ ...customForm, unit: e.target.value })}
                    placeholder="e.g. mm/s, bar, °C"
                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] focus:border-[#F27D26] text-slate-900 dark:text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* LIMITS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Threshold Limits
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="block text-[11px] text-sky-700 dark:text-sky-400 mb-1 font-semibold">Low Limit</span>
                    <input
                      type="number"
                      step="any"
                      value={customForm.low}
                      onChange={(e) => setCustomForm({ ...customForm, low: e.target.value })}
                      placeholder="e.g. 10"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">Normal Min</span>
                    <input
                      type="number"
                      step="any"
                      value={customForm.normalMin}
                      onChange={(e) => setCustomForm({ ...customForm, normalMin: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">Normal Max</span>
                    <input
                      type="number"
                      step="any"
                      value={customForm.normalMax}
                      onChange={(e) => setCustomForm({ ...customForm, normalMax: e.target.value })}
                      placeholder="e.g. 30"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-amber-700 dark:text-amber-400 mb-1 font-semibold">Warning Limit</span>
                    <input
                      type="number"
                      step="any"
                      value={customForm.warningLimit}
                      onChange={(e) => setCustomForm({ ...customForm, warningLimit: e.target.value })}
                      placeholder="e.g. 35"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-rose-700 dark:text-rose-400 mb-1 font-semibold">Critical Limit</span>
                    <input
                      type="number"
                      step="any"
                      value={customForm.criticalLimit}
                      onChange={(e) => setCustomForm({ ...customForm, criticalLimit: e.target.value })}
                      placeholder="e.g. 40"
                      className="w-full bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* ALARM SWITCH */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-[#1E293B]">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Alarm Monitoring</span>
                <button
                  type="button"
                  onClick={() => setCustomForm({ ...customForm, alarmEnabled: !customForm.alarmEnabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    customForm.alarmEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                      customForm.alarmEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* MODAL ACTIONS */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Metric</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
