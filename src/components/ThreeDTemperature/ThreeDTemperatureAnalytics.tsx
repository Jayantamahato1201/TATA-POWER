import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Activity,
  Layers,
  BarChart2,
  Sliders,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ThreeDSurfaceGraph } from './ThreeDSurfaceGraph';
import { ThreeDLayeredInfographic } from './ThreeDLayeredInfographic';
import { TemperatureConfigPanel } from './TemperatureConfigPanel';
import { TemperatureAlarmDisplay } from './TemperatureAlarmDisplay';
import { Metric3DSurfaceGraph } from '../MetricVisualizer/Metric3DSurfaceGraph';
import {
  TemperatureAnalyticsPayload,
  TemperatureDataPoint,
  TemperatureThresholdConfig,
  DatasetMetricsOverview,
  MetricAnalyticsPayload,
} from '../../types';

export const ThreeDTemperatureAnalytics: React.FC<{ onOpenUpload: () => void }> = ({ onOpenUpload }) => {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    currentDataset,
    filters,
    setFilters,
    exportTemperatureCSV,
    seedSampleDataset,
    isUploading,
  } = useData();

  const { isStaff, isAdmin, token } = useAuth();

  const [analytics, setAnalytics] = useState<TemperatureAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<TemperatureDataPoint | null>(null);
  const [viewMode, setViewMode] = useState<'surface' | 'infographic' | 'metric3d' | 'split'>('surface');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABOVE' | 'NORMAL' | 'BELOW'>('ALL');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // All-Metrics 3D Studio State
  const [metricsOverview, setMetricsOverview] = useState<DatasetMetricsOverview | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('');
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

  // Quick Threshold Tuning State for Live Experimentation
  const [quickThresholds, setQuickThresholds] = useState<{
    belowThreshold: number;
    normalMin: number;
    normalMax: number;
    aboveThreshold: number;
  } | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch Metrics Overview for All-Metrics 3D Studio
  const fetchMetricsOverview = useCallback(async () => {
    if (!selectedDatasetId) return;
    setIsMetricsLoading(true);
    try {
      const res = await fetch(
        `/api/metrics/overview?datasetId=${selectedDatasetId}&equipment=${filters.equipment !== 'ALL' ? filters.equipment : ''}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data: DatasetMetricsOverview = await res.json();
        setMetricsOverview(data);
        if (data.detectedMetrics && data.detectedMetrics.length > 0 && !selectedMetricKey) {
          setSelectedMetricKey(data.detectedMetrics[0].key);
        }
      }
    } catch (err) {
      console.error('Error fetching metrics overview for 3D visualization:', err);
    } finally {
      setIsMetricsLoading(false);
    }
  }, [selectedDatasetId, filters.equipment, token, selectedMetricKey]);

  useEffect(() => {
    fetchMetricsOverview();
  }, [fetchMetricsOverview]);

  // Fetch 3D Analytics from Backend
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/temperature/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          filters: {
            equipment: filters.equipment,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
          customConfig: quickThresholds || undefined,
        }),
      });

      if (res.ok) {
        const data: TemperatureAnalyticsPayload = await res.json();
        setAnalytics(data);
        if (!quickThresholds && data.config) {
          setQuickThresholds({
            belowThreshold: data.config.belowThreshold,
            normalMin: data.config.normalMin,
            normalMax: data.config.normalMax,
            aboveThreshold: data.config.aboveThreshold,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching 3D temperature analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, filters.equipment, filters.startDate, filters.endDate, statusFilter, quickThresholds, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDatasetId, filters.equipment, statusFilter, quickThresholds]);

  // Handle Save Full Configuration
  const handleSaveConfig = async (updated: Partial<TemperatureThresholdConfig>): Promise<boolean> => {
    try {
      const res = await fetch('/api/temperature/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          ...updated,
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setQuickThresholds({
          belowThreshold: resData.config.belowThreshold,
          normalMin: resData.config.normalMin,
          normalMax: resData.config.normalMax,
          aboveThreshold: resData.config.aboveThreshold,
        });
        await fetchAnalytics();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save temperature config:', err);
      return false;
    }
  };

  const hasData = analytics && analytics.points.length > 0;
  const config = analytics?.config;
  const summary = analytics?.summary;
  const unit = analytics?.unit || '°C';

  return (
    <div
      id="temperature-3d-analytics-page"
      className={`space-y-6 pb-16 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#07090E] p-6 overflow-y-auto' : ''}`}
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#111] border-l-2 border-l-[#F27D26] border-y border-r border-[#222] text-[#F27D26] text-xs font-mono mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest font-semibold">
              ADVANCED 3D VISUALIZATION & TELEMETRY STUDIO
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase font-mono">
            3D Plant & Telemetry Visualization
          </h2>
          <p className="text-sm text-[#AAA] mt-1 font-light font-sans max-w-3xl">
            High-fidelity 3D WebGL mathematical surface meshes, isometric layered infographics, and full-spectrum multi-metric 3D surface topography for all operational telemetry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Filtered CSV */}
          <button
            onClick={() => exportTemperatureCSV({ status: statusFilter !== 'ALL' ? statusFilter : undefined })}
            className="px-3.5 py-2 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#AAA] hover:text-[#F27D26] border border-[#333] text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider"
            title="Download Exact Filtered 3D Records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 3D CSV</span>
          </button>

          {/* Admin Threshold Config Button */}
          {isStaff && (
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-3.5 py-2 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#F27D26] border border-[#F27D26]/40 text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider font-semibold"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Thresholds</span>
            </button>
          )}

          {/* Fullscreen Mode */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#333] text-xs cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ADMIN CONFIGURATION MODAL / DRAWER */}
      {isConfigOpen && config && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-200">
          <TemperatureConfigPanel
            currentConfig={config}
            currentDataset={currentDataset}
            onSave={handleSaveConfig}
            onClose={() => setIsConfigOpen(false)}
          />
        </div>
      )}

      {/* TOP ALARM BROADCAST BAR (IF TOP POSITION) */}
      {analytics && config && (config.alarmDisplayPosition === 'top_notification') && (
        <TemperatureAlarmDisplay
          alarms={analytics.alarms || []}
          config={config}
          unit={unit}
          onSelectPoint={setSelectedPoint}
        />
      )}

      {/* FILTER & DATASET CONTROL BAR */}
      <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Dataset Selector */}
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#F27D26]" />
            <span className="text-xs font-mono text-[#888] uppercase">Dataset:</span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="px-3 py-1.5 rounded-xs bg-[#111] border border-[#333] text-xs text-white font-mono focus:outline-none focus:border-[#F27D26] cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalRows} records)
                </option>
              ))}
            </select>
          </div>

          {/* Equipment Filter */}
          {analytics?.equipmentList && analytics.equipmentList.length > 0 && (
            <div className="flex items-center space-x-2 pl-3 border-l border-[#222]">
              <Filter className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="text-xs font-mono text-[#888] uppercase">Unit:</span>
              <select
                value={filters.equipment}
                onChange={(e) => setFilters((prev) => ({ ...prev, equipment: e.target.value }))}
                className="px-2.5 py-1.5 rounded-xs bg-[#111] border border-[#333] text-xs text-white focus:outline-none focus:border-[#F27D26] cursor-pointer font-mono"
              >
                <option value="ALL">All Equipment Units</option>
                {analytics.equipmentList.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center space-x-1 pl-3 border-l border-[#222] font-mono text-xs">
            <span className="text-[#888] uppercase mr-1">Filter:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-[#F27D26] text-black font-bold' : 'text-[#888] hover:text-white bg-[#111]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ABOVE')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                statusFilter === 'ABOVE' ? 'bg-[#EF4444] text-white font-bold' : 'text-[#888] hover:text-white bg-[#111]'
              }`}
            >
              Above Only
            </button>
            <button
              onClick={() => setStatusFilter('NORMAL')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                statusFilter === 'NORMAL' ? 'bg-[#00FF41] text-black font-bold' : 'text-[#888] hover:text-white bg-[#111]'
              }`}
            >
              Normal Only
            </button>
            <button
              onClick={() => setStatusFilter('BELOW')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                statusFilter === 'BELOW' ? 'bg-[#06B6D4] text-black font-bold' : 'text-[#888] hover:text-white bg-[#111]'
              }`}
            >
              Below Only
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-[#111] p-1 rounded-xs border border-[#333] font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setViewMode('surface')}
            className={`px-3 py-1.5 rounded-xs flex items-center space-x-1.5 cursor-pointer uppercase whitespace-nowrap ${
              viewMode === 'surface'
                ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mathematical 3D Surface</span>
          </button>

          <button
            onClick={() => setViewMode('infographic')}
            className={`px-3 py-1.5 rounded-xs flex items-center space-x-1.5 cursor-pointer uppercase whitespace-nowrap ${
              viewMode === 'infographic'
                ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layered 3D Infographic</span>
          </button>

          <button
            onClick={() => setViewMode('metric3d')}
            className={`px-3 py-1.5 rounded-xs flex items-center space-x-1.5 cursor-pointer uppercase whitespace-nowrap ${
              viewMode === 'metric3d'
                ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>All-Metrics 3D Studio</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-xs flex items-center space-x-1.5 cursor-pointer uppercase whitespace-nowrap ${
              viewMode === 'split'
                ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* TOP 3D TEMPERATURE METRIC KPIS */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-4 font-mono">
          {/* Total Ingested Points */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222] border-l-2 border-l-[#F27D26]">
            <div className="text-[11px] text-[#888] uppercase">Total Analyzed Records</div>
            <div className="text-2xl font-black text-white mt-1">{summary.total.toLocaleString()}</div>
            <div className="text-[10px] text-[#F27D26] mt-1 font-semibold">100% Real Ingested Data</div>
          </div>

          {/* Above Temperature Card */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-rose-950/80 border-l-2 border-l-[#EF4444]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888] uppercase">{config?.aboveLabel || 'ABOVE'}</span>
              <span className="px-1.5 py-0.2 rounded-xs bg-rose-950 text-rose-300 text-[10px] font-bold">
                &gt;{config?.aboveThreshold}{unit}
              </span>
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {summary.aboveCount} <span className="text-xs font-normal text-[#888]">({summary.abovePercent}%)</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-xs mt-2 overflow-hidden">
              <div className="bg-[#EF4444] h-full" style={{ width: `${summary.abovePercent}%` }} />
            </div>
          </div>

          {/* Normal Temperature Card */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-emerald-950/80 border-l-2 border-l-[#00FF41]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888] uppercase">{config?.normalLabel || 'NORMAL'}</span>
              <span className="px-1.5 py-0.2 rounded-xs bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                [{config?.normalMin}-{config?.normalMax}{unit}]
              </span>
            </div>
            <div className="text-2xl font-black text-[#00FF41] mt-1">
              {summary.normalCount} <span className="text-xs font-normal text-[#888]">({summary.normalPercent}%)</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-xs mt-2 overflow-hidden">
              <div className="bg-[#00FF41] h-full" style={{ width: `${summary.normalPercent}%` }} />
            </div>
          </div>

          {/* Below Temperature Card */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-cyan-950/80 border-l-2 border-l-[#06B6D4]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888] uppercase">{config?.belowLabel || 'BELOW'}</span>
              <span className="px-1.5 py-0.2 rounded-xs bg-cyan-950 text-cyan-300 text-[10px] font-bold">
                &lt;{config?.belowThreshold}{unit}
              </span>
            </div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {summary.belowCount} <span className="text-xs font-normal text-[#888]">({summary.belowPercent}%)</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-xs mt-2 overflow-hidden">
              <div className="bg-[#06B6D4] h-full" style={{ width: `${summary.belowPercent}%` }} />
            </div>
          </div>

          {/* Peak Recorded Temperature */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222]">
            <div className="text-[11px] text-[#888] uppercase flex items-center justify-between">
              <span>Peak Temperature</span>
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary.maxTemp} <span className="text-xs font-normal text-[#888]">{unit}</span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Recorded High</div>
          </div>

          {/* Average Temperature */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222]">
            <div className="text-[11px] text-[#888] uppercase">Average Baseline</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {summary.avgTemp} <span className="text-xs font-normal text-[#888]">{unit}</span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Thermal Mean</div>
          </div>

          {/* Minimum Recorded Temperature */}
          <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222]">
            <div className="text-[11px] text-[#888] uppercase flex items-center justify-between">
              <span>Minimum Recorded</span>
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary.minTemp} <span className="text-xs font-normal text-[#888]">{unit}</span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Recorded Low</div>
          </div>
        </div>
      )}

      {/* QUICK LIVE THRESHOLD TUNER BAR */}
      {quickThresholds && (
        <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222] space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#F27D26]" />
              <span className="font-bold text-white uppercase tracking-wider">
                Live Threshold Tuner (Instant 3D Recalculation)
              </span>
            </div>
            <span className="text-[11px] text-[#888]">
              Adjust sliders below to simulate threshold dynamics in real time
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Below Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-cyan-400 font-bold">Below Threshold Limit:</span>
                <span className="text-white font-bold">&lt; {quickThresholds.belowThreshold} {unit}</span>
              </div>
              <input
                type="range"
                min={Math.floor(summary?.minTemp || 0)}
                max={Math.ceil(summary?.maxTemp || 100)}
                step="0.5"
                value={quickThresholds.belowThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setQuickThresholds({ ...quickThresholds, belowThreshold: val, normalMin: val });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Normal Range Info */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#00FF41] font-bold">Normal Baseline Span:</span>
                <span className="text-white font-bold">
                  [{quickThresholds.normalMin} - {quickThresholds.normalMax} {unit}]
                </span>
              </div>
              <div className="h-2 bg-[#111] rounded-xs border border-[#333] flex overflow-hidden">
                <div className="bg-cyan-500/50 h-full" style={{ width: '25%' }} />
                <div className="bg-[#00FF41] h-full" style={{ width: '50%' }} />
                <div className="bg-rose-500/50 h-full" style={{ width: '25%' }} />
              </div>
            </div>

            {/* Above Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-rose-400 font-bold">Above Threshold Limit:</span>
                <span className="text-white font-bold">&gt; {quickThresholds.aboveThreshold} {unit}</span>
              </div>
              <input
                type="range"
                min={Math.floor(summary?.minTemp || 0)}
                max={Math.ceil(summary?.maxTemp || 100)}
                step="0.5"
                value={quickThresholds.aboveThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setQuickThresholds({ ...quickThresholds, aboveThreshold: val, normalMax: val });
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3D VISUALIZATION DISPLAY CONTAINER */}
      {hasData ? (
        <div className="space-y-6">
          {viewMode === 'surface' && (
            <ThreeDSurfaceGraph
              analytics={analytics}
              onSelectPoint={setSelectedPoint}
              height={isFullscreen ? 'calc(100vh - 280px)' : 580}
            />
          )}

          {viewMode === 'infographic' && (
            <ThreeDLayeredInfographic
              analytics={analytics}
              onSelectPoint={setSelectedPoint}
              height={isFullscreen ? 'calc(100vh - 280px)' : 580}
            />
          )}

          {viewMode === 'metric3d' && (
            <div className="space-y-4">
              {/* Metric Selector Bar */}
              <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#222] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-mono text-[#888] uppercase">Select 3D Metric Topography:</span>
                  <select
                    value={selectedMetricKey}
                    onChange={(e) => setSelectedMetricKey(e.target.value)}
                    className="px-3 py-1.5 rounded-xs bg-[#111] border border-[#333] text-xs text-white font-mono focus:outline-none focus:border-[#F27D26] cursor-pointer max-w-[320px]"
                  >
                    {metricsOverview?.detectedMetrics.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Metric Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
                  {metricsOverview?.detectedMetrics.slice(0, 6).map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setSelectedMetricKey(m.key)}
                      className={`px-2.5 py-1 rounded-xs cursor-pointer uppercase transition-all ${
                        selectedMetricKey === m.key
                          ? 'bg-[#F27D26] text-black font-bold'
                          : 'bg-[#111] text-[#888] hover:text-white border border-[#222]'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Metric 3D Surface Graph */}
              {(() => {
                const currentMetricPayload =
                  metricsOverview?.metricsData && selectedMetricKey
                    ? metricsOverview.metricsData[selectedMetricKey]
                    : null;
                if (currentMetricPayload) {
                  return (
                    <Metric3DSurfaceGraph
                      payload={currentMetricPayload}
                      height={isFullscreen ? 'calc(100vh - 280px)' : 600}
                    />
                  );
                }
                return (
                  <div className="p-8 rounded-sm bg-[#0A0A0A] border border-[#222] text-center font-mono text-xs text-[#888]">
                    {isMetricsLoading ? 'Loading 3D metric telemetry topography...' : 'Select a metric above to display 3D surface mesh'}
                  </div>
                );
              })()}
            </div>
          )}

          {viewMode === 'split' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ThreeDSurfaceGraph
                analytics={analytics}
                onSelectPoint={setSelectedPoint}
                height={520}
              />
              <ThreeDLayeredInfographic
                analytics={analytics}
                onSelectPoint={setSelectedPoint}
                height={520}
              />
            </div>
          )}

          {/* DYNAMIC ALARM DISPLAY (BELOW GRAPH, FULL PAGE, OR FLOATING PANEL) */}
          {config && config.alarmDisplayPosition !== 'top_notification' && (
            <TemperatureAlarmDisplay
              alarms={analytics.alarms || []}
              config={config}
              unit={unit}
              onSelectPoint={setSelectedPoint}
            />
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 rounded-sm bg-[#0A0A0A] border border-dashed border-[#333] text-center flex flex-col items-center justify-center space-y-4 font-mono">
          <Flame className="w-12 h-12 text-[#F27D26] animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-white uppercase">Awaiting Thermal Telemetry Data</h3>
            <p className="text-xs text-[#888] mt-1 max-w-md">
              Ingest a power plant dataset containing temperature measurements to activate full 3D WebGL mathematical
              surfaces and isometric infographics.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onOpenUpload}
              className="px-5 py-2.5 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold text-xs uppercase"
            >
              Upload Plant CSV
            </button>
            <button
              onClick={seedSampleDataset}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#F27D26] border border-[#F27D26]/40 text-xs disabled:opacity-50"
            >
              Load Sample Telemetry
            </button>
          </div>
        </div>
      )}

      {/* SELECTED POINT INSPECTOR MODAL/DRAWER */}
      {selectedPoint && (
        <div className="p-4 rounded-sm bg-[#0A0A0A] border border-[#F27D26] shadow-2xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#222] pb-2">
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-xs"
                style={{ backgroundColor: selectedPoint.color }}
              />
              <span className="font-bold text-white uppercase">
                Inspected Record #{selectedPoint.rowIndex + 1} - {selectedPoint.equipment}
              </span>
              <span
                className="px-2 py-0.5 rounded-xs text-[10px] font-bold text-black uppercase"
                style={{ backgroundColor: selectedPoint.color }}
              >
                {selectedPoint.statusLabel}
              </span>
            </div>

            <button
              onClick={() => setSelectedPoint(null)}
              className="text-[#888] hover:text-white cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-2.5 rounded-xs bg-[#111] border border-[#222]">
              <span className="text-[#888] text-[10px]">Temperature:</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {selectedPoint.temperature} {unit}
              </div>
            </div>

            <div className="p-2.5 rounded-xs bg-[#111] border border-[#222]">
              <span className="text-[#888] text-[10px]">Timestamp / Cycle:</span>
              <div className="text-sm font-bold text-[#CCC] mt-0.5 truncate">{selectedPoint.timestamp}</div>
            </div>

            <div className="p-2.5 rounded-xs bg-[#111] border border-[#222]">
              <span className="text-[#888] text-[10px]">Unit / Component:</span>
              <div className="text-sm font-bold text-[#F27D26] mt-0.5">{selectedPoint.equipment}</div>
            </div>

            <div className="p-2.5 rounded-xs bg-[#111] border border-[#222]">
              <span className="text-[#888] text-[10px]">Classification Status:</span>
              <div className="text-sm font-bold mt-0.5" style={{ color: selectedPoint.color }}>
                {selectedPoint.status}
              </div>
            </div>
          </div>

          {/* Full Raw Row Data */}
          <div className="pt-2">
            <span className="text-[#888] text-[10px] uppercase">Complete Record Key-Values:</span>
            <div className="mt-1 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[#111] rounded-xs border border-[#222]">
              {Object.entries(selectedPoint.data).map(([k, v]) => (
                <div key={k} className="px-2 py-1 rounded-xs bg-[#0A0A0A] border border-[#333] text-[11px]">
                  <span className="text-[#888]">{k}: </span>
                  <span className="text-[#CCC] font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
