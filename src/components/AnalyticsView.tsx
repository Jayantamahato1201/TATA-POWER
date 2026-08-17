import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Activity,
  Layers,
  Database,
  Download,
  Maximize2,
  Minimize2,
  Filter,
  Sliders,
  Sparkles,
  Flame,
  Zap,
  Radio,
  Droplet,
  Gauge,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Box,
  RotateCcw,
  Plus,
  Edit3,
  Check,
  X,
  PlusCircle,
  Settings2,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DatasetMetricsOverview, MetricDefinition, MetricAnalyticsPayload, MetricThresholdConfig } from '../types';
import { Metric3DSurfaceGraph } from './MetricVisualizer/Metric3DSurfaceGraph';

interface AnalyticsViewProps {
  onOpenUpload: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenUpload }) => {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    currentDataset,
    filters,
    setFilters,
    exportDatasetCSV,
    lastUpdated,
    refreshData,
    refreshAlarms,
    addRecord,
    saveAlarmRule,
  } = useData();
  const { token, isStaff, isAdmin } = useAuth();

  const [overview, setOverview] = useState<DatasetMetricsOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const echartsRef = useRef<any>(null);

  // Modals for adding data and configuring metrics
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState<boolean>(false);
  const [isConfigMetricModalOpen, setIsConfigMetricModalOpen] = useState<boolean>(false);
  const [addDataForm, setAddDataForm] = useState<Record<string, string>>({});
  const [isSubmittingData, setIsSubmittingData] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Metric Threshold Configuration Form
  const [metricConfigForm, setMetricConfigForm] = useState({
    name: '',
    unit: '',
    category: 'custom',
    lowLimit: '',
    normalMin: '',
    normalMax: '',
    warningThreshold: '',
    criticalThreshold: '',
    alarmEnabled: true,
  });

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  // Fetch Dataset Metric Overview from Backend
  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const eqParam = filters.equipment && filters.equipment !== 'ALL' ? `&equipment=${filters.equipment}` : '';
      const startParam = filters.startDate ? `&startDate=${filters.startDate}` : '';
      const endParam = filters.endDate ? `&endDate=${filters.endDate}` : '';

      const res = await fetch(
        `/api/metrics/overview?datasetId=${selectedDatasetId || ''}${eqParam}${startParam}${endParam}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data: DatasetMetricsOverview = await res.json();
        setOverview(data);

        // Select first available metric if none selected or if previous metric no longer exists
        if (data.detectedMetrics && data.detectedMetrics.length > 0) {
          const exists = data.detectedMetrics.some((m) => m.id === selectedMetricKey || m.key === selectedMetricKey);
          if (!exists || !selectedMetricKey) {
            setSelectedMetricKey(data.detectedMetrics[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load metric analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedDatasetId, filters.equipment, filters.startDate, filters.endDate, token, lastUpdated]);

  const detectedMetrics: MetricDefinition[] = overview?.detectedMetrics || [];
  const activeMetricDefinition = detectedMetrics.find(
    (m) => m.id === selectedMetricKey || m.key === selectedMetricKey
  ) || detectedMetrics[0];

  const activePayload: MetricAnalyticsPayload | undefined = useMemo(() => {
    if (!overview?.metricsData || !activeMetricDefinition) return undefined;
    const md = overview.metricsData;
    return (
      md[activeMetricDefinition.id] ||
      md[activeMetricDefinition.key] ||
      md[activeMetricDefinition.name] ||
      md[activeMetricDefinition.key?.toLowerCase()] ||
      md[activeMetricDefinition.name?.toLowerCase()] ||
      Object.values(md).find(
        (p: any) =>
          p?.metric?.id === activeMetricDefinition.id ||
          p?.metric?.key === activeMetricDefinition.key ||
          p?.metric?.name?.toLowerCase() === activeMetricDefinition.name?.toLowerCase()
      )
    );
  }, [overview, activeMetricDefinition]);

  // Open threshold configuration modal populated with active metric values
  const handleOpenConfigModal = () => {
    if (!activeMetricDefinition) return;
    const th = (activeMetricDefinition.thresholds || {}) as MetricThresholdConfig;
    setMetricConfigForm({
      name: activeMetricDefinition.name || '',
      unit: activeMetricDefinition.unit || '',
      category: activeMetricDefinition.category || 'custom',
      lowLimit: th.low !== undefined && th.low !== null ? String(th.low) : '',
      normalMin: th.normalMin !== undefined && th.normalMin !== null ? String(th.normalMin) : '',
      normalMax: th.normalMax !== undefined && th.normalMax !== null ? String(th.normalMax) : '',
      warningThreshold: th.warningLimit !== undefined && th.warningLimit !== null ? String(th.warningLimit) : '',
      criticalThreshold: th.criticalLimit !== undefined && th.criticalLimit !== null ? String(th.criticalLimit) : th.high !== undefined && th.high !== null ? String(th.high) : '',
      alarmEnabled: th.alarmEnabled !== false && th.enabled !== false,
    });
    setIsConfigMetricModalOpen(true);
  };

  // Save updated metric thresholds & alarms to MongoDB
  const handleSaveMetricConfig = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!activeMetricDefinition) return;
    const currentDatasetId = selectedDatasetId || (datasets.length > 0 ? datasets[0].id : '');

    setIsSubmittingData(true);
    try {
      const critStr = String(metricConfigForm.criticalThreshold ?? '').trim();
      const warnStr = String(metricConfigForm.warningThreshold ?? '').trim();
      const lowStr = String(metricConfigForm.lowLimit ?? '').trim();
      const normMinStr = String(metricConfigForm.normalMin ?? '').trim();
      const normMaxStr = String(metricConfigForm.normalMax ?? '').trim();

      const critVal = critStr !== '' ? parseFloat(critStr) : undefined;
      const warnVal = warnStr !== '' ? parseFloat(warnStr) : undefined;
      const lowVal = lowStr !== '' ? parseFloat(lowStr) : undefined;
      const normMin = normMinStr !== '' ? parseFloat(normMinStr) : undefined;
      const normMax = normMaxStr !== '' ? parseFloat(normMaxStr) : undefined;

      const metricKey = activeMetricDefinition.id || activeMetricDefinition.key;
      const updatedThresholds = {
        low: lowVal !== undefined && !isNaN(lowVal) ? lowVal : undefined,
        normalMin: normMin !== undefined && !isNaN(normMin) ? normMin : undefined,
        normalMax: normMax !== undefined && !isNaN(normMax) ? normMax : undefined,
        warningLimit: warnVal !== undefined && !isNaN(warnVal) ? warnVal : undefined,
        criticalLimit: critVal !== undefined && !isNaN(critVal) ? critVal : undefined,
        high: critVal !== undefined && !isNaN(critVal) ? critVal : undefined,
        enabled: metricConfigForm.alarmEnabled !== false,
        alarmEnabled: metricConfigForm.alarmEnabled !== false,
      };

      const payload = {
        metricKey,
        config: {
          datasetId: currentDatasetId || activeMetricDefinition.datasetId,
          name: (metricConfigForm.name || '').trim() || activeMetricDefinition.name,
          unit: (metricConfigForm.unit || '').trim(),
          category: metricConfigForm.category || activeMetricDefinition.category || 'custom',
          thresholds: updatedThresholds,
        },
      };

      // Optimistically update local overview state for instant UI responsiveness
      if (overview) {
        const updatedDetectedMetrics = (overview.detectedMetrics || []).map((m) => {
          if (m.id === activeMetricDefinition.id || m.key === activeMetricDefinition.key) {
            return {
              ...m,
              name: (metricConfigForm.name || '').trim() || m.name,
              unit: (metricConfigForm.unit || '').trim(),
              thresholds: {
                ...m.thresholds,
                ...updatedThresholds,
              },
            };
          }
          return m;
        });

        setOverview({
          ...overview,
          detectedMetrics: updatedDetectedMetrics,
        });
      }

      const res = await fetch('/api/metrics/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update threshold configuration');
      }

      setFeedbackNotice({
        type: 'success',
        message: `Thresholds updated successfully for "${metricConfigForm.name || activeMetricDefinition.name}".`,
      });
      setIsConfigMetricModalOpen(false);

      if (typeof refreshData === 'function') {
        refreshData().catch((err) => console.warn('refreshData error:', err));
      }
      if (typeof refreshAlarms === 'function') {
        refreshAlarms().catch((err) => console.warn('refreshAlarms error:', err));
      }
      await fetchOverview();
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      console.error('Failed to save metric config:', err);
      setFeedbackNotice({
        type: 'error',
        message: err.message || 'Failed to update metric configuration.',
      });
    } finally {
      setIsSubmittingData(false);
    }
  };

  // Open Quick Add Data Point modal
  const handleOpenAddDataModal = () => {
    const activeDs = datasets.find((d) => d.id === selectedDatasetId) || currentDataset;
    const initial: Record<string, string> = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      equipment: filters.equipment && filters.equipment !== 'ALL' ? filters.equipment : 'GEN-01',
    };
    if (activeDs?.columns) {
      activeDs.columns.forEach((c) => {
        if (c.name !== 'timestamp' && c.name !== 'equipment') {
          initial[c.name] = '';
        }
      });
    }
    if (activeMetricDefinition) {
      initial[activeMetricDefinition.key] = '';
    }
    setAddDataForm(initial);
    setIsAddDataModalOpen(true);
  };

  // Submit new data record
  const handleSaveNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    setIsSubmittingData(true);
    try {
      const payloadData: Record<string, any> = {};
      Object.entries(addDataForm).forEach(([k, v]) => {
        if (v === '' || v === undefined) return;
        const strVal = String(v);
        const num = parseFloat(strVal);
        payloadData[k] = !isNaN(num) && !k.toLowerCase().includes('date') && !k.toLowerCase().includes('time') && !k.toLowerCase().includes('equip') ? num : strVal;
      });

      const success = await addRecord(selectedDatasetId, payloadData);
      if (success) {
        setFeedbackNotice({ type: 'success', message: 'New telemetry point recorded and graph updated.' });
        setIsAddDataModalOpen(false);
        await refreshData();
        await fetchOverview();
        setTimeout(() => setFeedbackNotice(null), 3500);
      } else {
        setFeedbackNotice({ type: 'error', message: 'Failed to record new telemetry point.' });
      }
    } catch (err) {
      console.error('Failed to add record:', err);
      setFeedbackNotice({ type: 'error', message: 'Error submitting new telemetry point.' });
    } finally {
      setIsSubmittingData(false);
    }
  };

  // Category Icon Resolver
  const getMetricIcon = (category?: string) => {
    switch (category) {
      case 'temperature':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'voltage':
        return <Zap className="w-3.5 h-3.5 text-sky-400" />;
      case 'power':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'frequency':
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      case 'pressure':
        return <Gauge className="w-3.5 h-3.5 text-cyan-400" />;
      case 'fuel':
        return <Droplet className="w-3.5 h-3.5 text-purple-400" />;
      case 'duration':
        return <Clock className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />;
    }
  };

  // Download filtered data as CSV
  const handleDownloadCSV = () => {
    if (!activePayload) return;
    const headers = ['Timestamp', 'Record_Index', ...activePayload.generatorSeries.map((s) => s.name)];
    const csvRows = [headers.join(',')];

    activePayload.timeSeries.forEach((row, idx) => {
      const vals = [
        row.timestamp || '',
        idx + 1,
        ...activePayload.generatorSeries.map((s) => row.values[s.name] ?? ''),
      ];
      csvRows.push(vals.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeMetricDefinition.name.replace(/\s+/g, '_').toLowerCase()}_telemetry.csv`;
    link.click();
  };

  // Download Chart image as PNG
  const handleDownloadPNG = () => {
    if (echartsRef.current) {
      const echartsInstance = echartsRef.current.getEchartsInstance();
      const base64 = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#0A1124',
      });
      const link = document.createElement('a');
      link.download = `${activeMetricDefinition.name.replace(/\s+/g, '_').toLowerCase()}_chart.png`;
      link.href = base64;
      link.click();
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;
    if (!document.fullscreenElement) {
      chartContainerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen error:', err);
      });
      setIsFullscreen(false);
    }
  };

  // Determine operational threshold status
  const getMetricOperationalStatus = () => {
    if (!activePayload) return { status: 'NORMAL', label: 'Nominal Operations', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    const { stats } = activePayload.distribution;
    const { thresholds } = activeMetricDefinition;

    if (thresholds.high !== undefined && stats.max > thresholds.high) {
      return {
        status: 'CRITICAL',
        label: `Critical Exceeded (Max: ${stats.max.toFixed(1)}${activeMetricDefinition.unit})`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/30 border-rose-900/50',
      };
    }
    if (thresholds.high !== undefined && stats.avg > thresholds.high * 0.9) {
      return {
        status: 'WARNING',
        label: `Approaching Warning Limit (${thresholds.high}${activeMetricDefinition.unit})`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/30 border-amber-900/50',
      };
    }
    if (thresholds.low !== undefined && stats.min < thresholds.low) {
      return {
        status: 'WARNING',
        label: `Below Threshold (${thresholds.low}${activeMetricDefinition.unit})`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/30 border-amber-900/50',
      };
    }
    return {
      status: 'NORMAL',
      label: 'Nominal Operations (Within Range)',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30 border-emerald-900/50',
    };
  };

  // Build ECharts Configuration
  const getEChartsOption = () => {
    if (!activePayload || !activeMetricDefinition) return {};

    const { timeSeries, generatorSeries } = activePayload;
    const { unit, thresholds, colorScheme } = activeMetricDefinition;

    const timestamps = timeSeries.map((row, idx) => row.timestamp || `Rec #${idx + 1}`);

    // Color palette
    const colors = [
      colorScheme?.primary || '#38BDF8',
      '#60A5FA',
      '#34D399',
      '#F472B6',
      '#A78BFA',
      '#FBBF24',
    ];

    // Build series
    const seriesList = generatorSeries.map((series, idx) => {
      const data = timeSeries.map((row) => row.values[series.name] ?? null);
      const seriesColor = colors[idx % colors.length];

      return {
        name: series.name,
        type: chartType === 'bar' ? 'bar' : 'line',
        smooth: chartType !== 'bar',
        data,
        symbol: timeSeries.length > 50 ? 'none' : 'circle',
        symbolSize: 4,
        itemStyle: { color: seriesColor },
        lineStyle: { width: 2.5, color: seriesColor },
        areaStyle:
          chartType === 'area'
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: seriesColor.replace(')', ', 0.35)').replace('rgb', 'rgba') || 'rgba(56, 189, 248, 0.35)' },
                    { offset: 1, color: 'rgba(15, 23, 42, 0.02)' },
                  ],
                },
              }
            : undefined,
        // MarkLine for thresholds
        markLine:
          idx === 0 && thresholds.enabled !== false
            ? {
                silent: true,
                symbol: 'none',
                data: [
                  ...((thresholds.criticalLimit !== undefined || thresholds.high !== undefined)
                    ? [
                        {
                          yAxis: thresholds.criticalLimit !== undefined ? thresholds.criticalLimit : thresholds.high,
                          name: 'Critical Limit',
                          lineStyle: { color: thresholds.criticalColor || thresholds.highColor || '#EF4444', type: 'dashed', width: 1.8 },
                          label: {
                            formatter: `Critical: ${thresholds.criticalLimit !== undefined ? thresholds.criticalLimit : thresholds.high} ${unit || ''}`,
                            position: 'end',
                            color: thresholds.criticalColor || thresholds.highColor || '#EF4444',
                            fontSize: 10,
                            fontWeight: 'bold',
                          },
                        },
                      ]
                    : []),
                  ...(thresholds.warningLimit !== undefined
                    ? [
                        {
                          yAxis: thresholds.warningLimit,
                          name: 'Warning Limit',
                          lineStyle: { color: thresholds.warningColor || '#F59E0B', type: 'dashed', width: 1.8 },
                          label: {
                            formatter: `Warning: ${thresholds.warningLimit} ${unit || ''}`,
                            position: 'end',
                            color: thresholds.warningColor || '#F59E0B',
                            fontSize: 10,
                            fontWeight: 'bold',
                          },
                        },
                      ]
                    : []),
                  ...(thresholds.normalMax !== undefined
                    ? [
                        {
                          yAxis: thresholds.normalMax,
                          name: 'Nominal Max',
                          lineStyle: { color: thresholds.normalColor || '#10B981', type: 'dotted', width: 1.2 },
                          label: {
                            formatter: `Nominal Max: ${thresholds.normalMax} ${unit || ''}`,
                            position: 'end',
                            color: thresholds.normalColor || '#10B981',
                            fontSize: 9,
                          },
                        },
                      ]
                    : []),
                  ...(thresholds.normalMin !== undefined
                    ? [
                        {
                          yAxis: thresholds.normalMin,
                          name: 'Nominal Min',
                          lineStyle: { color: thresholds.normalColor || '#10B981', type: 'dotted', width: 1.2 },
                          label: {
                            formatter: `Nominal Min: ${thresholds.normalMin} ${unit || ''}`,
                            position: 'end',
                            color: thresholds.normalColor || '#10B981',
                            fontSize: 9,
                          },
                        },
                      ]
                    : []),
                  ...(thresholds.low !== undefined
                    ? [
                        {
                          yAxis: thresholds.low,
                          name: 'Low Limit',
                          lineStyle: { color: thresholds.lowColor || '#06B6D4', type: 'dashed', width: 1.8 },
                          label: {
                            formatter: `Low: ${thresholds.low} ${unit || ''}`,
                            position: 'end',
                            color: thresholds.lowColor || '#06B6D4',
                            fontSize: 10,
                            fontWeight: 'bold',
                          },
                        },
                      ]
                    : []),
                ],
              }
            : undefined,
      };
    });

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      grid: {
        top: 40,
        right: 35,
        bottom: 50,
        left: 55,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' },
        formatter: (params: any[]) => {
          if (!params || !params.length) return '';
          const first = params[0];
          const timeLabel = first.axisValueLabel || '';
          let html = `<div style="font-weight:bold;color:#94A3B8;margin-bottom:6px;border-bottom:1px solid #1E293B;padding-bottom:4px;">
            ${activeMetricDefinition.name} &bull; ${timeLabel}
          </div>`;

          params.forEach((item: any) => {
            const val = item.value !== null && item.value !== undefined ? Number(item.value).toFixed(2) : 'N/A';
            html += `<div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;">
              <span style="color:${item.color};display:flex;items-center;gap:4px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};"></span>
                ${item.seriesName}:
              </span>
              <strong style="color:#FFFFFF;">${val} ${unit}</strong>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        show: generatorSeries.length > 1,
        top: 5,
        right: 20,
        textStyle: { color: '#94A3B8', fontSize: 11 },
        icon: 'roundRect',
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        boundaryGap: chartType === 'bar',
        axisLine: { lineStyle: { color: '#1E293B' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          fontFamily: 'monospace',
          rotate: timestamps.length > 20 ? 30 : 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: unit ? `${activeMetricDefinition.name} (${unit})` : activeMetricDefinition.name,
        nameTextStyle: { color: '#64748B', fontSize: 10, padding: [0, 0, 5, 0] },
        axisLine: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => `${v.toFixed(0)}${unit}`,
        },
        splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          show: timestamps.length > 40,
          bottom: 10,
          height: 16,
          borderColor: '#1E293B',
          fillerColor: 'rgba(2, 132, 199, 0.2)',
          handleStyle: { color: '#38BDF8' },
          textStyle: { color: 'transparent' },
        },
      ],
      series: seriesList,
    };
  };

  const operationalStatus = getMetricOperationalStatus();

  return (
    <div id="analytics-view-container" className="w-full space-y-5 pb-12">
      {/* Top Header Controls: Dataset Selector + 2D/3D View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0F172A] border border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#38BDF8]" />
            <span>Telemetry & Equipment Analytics</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Dedicated operational telemetry channel visualizer &bull; One metric per graph
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action Buttons: Add Point & Configure Thresholds */}
          <button
            id="btn-analytics-add-record"
            onClick={handleOpenAddDataModal}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Telemetry Point</span>
          </button>

          <button
            id="btn-analytics-config-metric"
            onClick={handleOpenConfigModal}
            className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-sky-400 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Configure Thresholds</span>
          </button>

          {/* Select Dataset Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#94A3B8] font-mono whitespace-nowrap hidden sm:inline">
              Dataset:
            </span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#070D18] border border-[#1E293B] text-white text-xs font-mono focus:outline-none focus:border-[#0284C7] cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalRows} records)
                </option>
              ))}
            </select>
          </div>

          {/* 2D View / 3D View Switcher */}
          <div className="flex items-center rounded-lg bg-[#070D18] p-0.5 border border-[#1E293B]">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-[#0284C7] text-white font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>2D Graph</span>
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[#0284C7] text-white font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRIC SELECTOR CHIPS BAR (Only metrics available in current dataset) */}
      <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] uppercase tracking-wider px-1">
          <span>Available Metric Channels ({detectedMetrics.length})</span>
          <span>Click to switch visualization</span>
        </div>

        {detectedMetrics.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#94A3B8]">
            No numeric telemetry channels detected in this dataset.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detectedMetrics.map((metric) => {
              const isSelected = (metric.id === selectedMetricKey) || (metric.key === selectedMetricKey);
              return (
                <button
                  key={metric.id}
                  id={`metric-chip-${metric.id}`}
                  onClick={() => setSelectedMetricKey(metric.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0284C7] text-white font-semibold shadow-md shadow-sky-950/50 ring-1 ring-sky-400'
                      : 'bg-[#070D18] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {getMetricIcon(metric.category)}
                  <span>{metric.name}</span>
                  {metric.unit && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-[#1E293B] text-[#64748B]'
                      }`}
                    >
                      {metric.unit}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MAIN VIEW AREA */}
      {isLoading ? (
        <div className="p-16 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#38BDF8] animate-spin" />
          <p className="text-xs font-mono text-[#94A3B8]">Calculating telemetry data from persistent storage...</p>
        </div>
      ) : !activePayload || !activeMetricDefinition ? (
        <div className="p-12 rounded-xl bg-[#0F172A] border border-[#1E293B] text-center space-y-3">
          <Layers className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm font-semibold text-white">No Telemetry Recorded for Selected Metric</p>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            Please select another metric channel or upload additional operational logs.
          </p>
        </div>
      ) : viewMode === '3d' ? (
        /* 3D ANALYTICS VISUALIZATION MODE */
        <div className="p-4 sm:p-6 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div>
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-[#38BDF8]" />
                <h2 className="text-lg font-bold text-white">
                  3D Surface: {activeMetricDefinition.name}
                </h2>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                X: Time/Sequence &bull; Y: Equipment Unit &bull; Z: Actual Reading ({activeMetricDefinition.unit})
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-[#64748B] bg-[#070D18] px-2.5 py-1 rounded border border-[#1E293B]">
                Mouse: Drag to Rotate &bull; Scroll to Zoom
              </span>
            </div>
          </div>

          <div className="w-full rounded-lg overflow-hidden border border-[#1E293B] bg-[#070D18]">
            <Metric3DSurfaceGraph
              payload={activePayload}
              height={500}
            />
          </div>
        </div>
      ) : (
        /* 2D METRIC GRAPH + SUMMARY SPLIT LAYOUT (LEFT: GRAPH, RIGHT: SUMMARY) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* LEFT: Large Primary Graph (Spans 2 Columns on Desktop) */}
          <div
            ref={chartContainerRef}
            className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4 flex flex-col justify-between"
          >
            {/* Graph Header: Title, Category & Chart Type Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-[#070D18] border border-[#1E293B]">
                    {getMetricIcon(activeMetricDefinition.category)}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {activeMetricDefinition.name} Telemetry Curve
                  </h2>
                </div>
                <p className="text-xs text-[#64748B] font-mono mt-0.5">
                  Calculated from {activePayload.distribution.stats.totalRecords.toLocaleString()} real database records
                </p>
              </div>

              {/* Chart Type Selector */}
              <div className="flex items-center rounded-lg bg-[#070D18] p-0.5 border border-[#1E293B] self-start sm:self-auto">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    chartType === 'area' ? 'bg-[#0284C7] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    chartType === 'line' ? 'bg-[#0284C7] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    chartType === 'bar' ? 'bg-[#0284C7] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>

            {/* ECharts Interactive Canvas */}
            <div className="w-full h-[360px] sm:h-[400px] rounded-lg bg-[#070D18] border border-[#1E293B]/60 p-1">
              <ReactECharts
                ref={echartsRef}
                option={getEChartsOption()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>

            {/* Below Graph Minimal Controls */}
            <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadCSV}
                  className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Download raw data points as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={handleDownloadPNG}
                  className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Export chart as PNG image"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Chart</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Advanced Options Toggle Accordion */}
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-xs font-mono text-[#38BDF8] hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdvancedOptions ? 'Hide Advanced Filters' : 'Advanced Options'}</span>
                {showAdvancedOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Advanced Filter Settings */}
            {showAdvancedOptions && (
              <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#1E293B] space-y-3 text-xs animate-in fade-in">
                <div className="font-semibold text-white text-[11px] uppercase font-mono tracking-wider">
                  Advanced Filters & Aggregation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Equipment Unit Filter */}
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1 font-mono">Filter Equipment</label>
                    <select
                      value={filters.equipment || 'ALL'}
                      onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0F172A] border border-[#1E293B] text-white text-xs font-mono cursor-pointer"
                    >
                      <option value="ALL">All Units / Generators</option>
                      {activePayload.equipmentList.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1 font-mono">Start Timestamp</label>
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0F172A] border border-[#1E293B] text-white text-xs font-mono"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1 font-mono">End Timestamp</label>
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0F172A] border border-[#1E293B] text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setFilters({ equipment: 'ALL', startDate: '', endDate: '' })}
                    className="text-[11px] text-[#94A3B8] hover:text-white font-mono cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Simple Metric Summary Card (1 Column on Desktop) */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-5">
            <div>
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider block">
                Channel Statistics
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {activeMetricDefinition.name}
              </h3>
            </div>

            {/* Current / Latest Value Hero */}
            <div className="p-4 rounded-xl bg-[#070D18] border border-[#1E293B] space-y-1">
              <span className="text-xs text-[#94A3B8] font-mono uppercase">Current / Latest Reading</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline space-x-1.5">
                <span>
                  {(() => {
                    const firstSeries = activePayload.generatorSeries[0];
                    if (firstSeries && firstSeries.data) {
                      const validData = firstSeries.data.filter((v): v is number => v !== null && v !== undefined);
                      if (validData.length > 0) {
                        return validData[validData.length - 1].toFixed(2);
                      }
                    }
                    return activePayload.distribution.stats.avg.toFixed(2);
                  })()}
                </span>
                <span className="text-base text-[#38BDF8] font-normal">
                  {activeMetricDefinition.unit}
                </span>
              </div>
              <div className="text-[11px] text-[#64748B] font-mono">
                Latest sample recorded in dataset
              </div>
            </div>

            {/* Min / Avg / Max Grid */}
            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="p-3 rounded-lg bg-[#070D18] border border-[#1E293B] text-center">
                <span className="text-[10px] text-[#64748B] uppercase block">Minimum</span>
                <span className="text-sm sm:text-base font-bold text-[#38BDF8] mt-0.5 block">
                  {activePayload.distribution.stats.min.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B]">{activeMetricDefinition.unit}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#070D18] border border-[#1E293B] text-center">
                <span className="text-[10px] text-[#64748B] uppercase block">Average</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5 block">
                  {activePayload.distribution.stats.avg.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B]">{activeMetricDefinition.unit}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#070D18] border border-[#1E293B] text-center">
                <span className="text-[10px] text-[#64748B] uppercase block">Maximum</span>
                <span className="text-sm sm:text-base font-bold text-rose-400 mt-0.5 block">
                  {activePayload.distribution.stats.max.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B]">{activeMetricDefinition.unit}</span>
              </div>
            </div>

            {/* Operational Health Status Banner */}
            <div className={`p-3.5 rounded-xl border ${operationalStatus.bg} space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Operational Status</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 ${operationalStatus.color}`}>
                  {operationalStatus.status}
                </span>
              </div>
              <div className={`text-xs font-semibold ${operationalStatus.color}`}>
                {operationalStatus.label}
              </div>
            </div>

            {/* Configured Threshold Limits */}
            <div className="p-3.5 rounded-xl bg-[#070D18] border border-[#1E293B] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#94A3B8] border-b border-[#1E293B] pb-1.5">
                <span>Configured Limits</span>
                <span className="text-[10px] text-[#64748B]">Admin Configurable</span>
              </div>

              {activeMetricDefinition.thresholds.low !== undefined && (
                <div className="flex justify-between items-center text-[#CBD5E1]">
                  <span className="text-cyan-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Low Limit:</span>
                  </span>
                  <span className="font-bold">
                    {activeMetricDefinition.thresholds.low} {activeMetricDefinition.unit}
                  </span>
                </div>
              )}

              {(activeMetricDefinition.thresholds.normalMin !== undefined || activeMetricDefinition.thresholds.normalMax !== undefined) && (
                <div className="flex justify-between items-center text-[#CBD5E1]">
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Nominal Range:</span>
                  </span>
                  <span className="font-bold">
                    {activeMetricDefinition.thresholds.normalMin ?? '—'} to {activeMetricDefinition.thresholds.normalMax ?? '—'} {activeMetricDefinition.unit}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-[#CBD5E1]">
                <span className="text-amber-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Warning Threshold:</span>
                </span>
                <span className="font-bold">
                  {activeMetricDefinition.thresholds.warningLimit !== undefined
                    ? `${activeMetricDefinition.thresholds.warningLimit} ${activeMetricDefinition.unit}`
                    : 'Not Configured'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#CBD5E1]">
                <span className="text-rose-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Critical Threshold:</span>
                </span>
                <span className="font-bold">
                  {activeMetricDefinition.thresholds.criticalLimit !== undefined
                    ? `${activeMetricDefinition.thresholds.criticalLimit} ${activeMetricDefinition.unit}`
                    : activeMetricDefinition.thresholds.high !== undefined
                    ? `${activeMetricDefinition.thresholds.high} ${activeMetricDefinition.unit}`
                    : 'Not Configured'}
                </span>
              </div>
            </div>

            {/* Unit / Equipment Breakdown if available */}
            {activePayload.generatorSeries.length > 1 && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#64748B] uppercase block">
                  Equipment Series Breakdown
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activePayload.generatorSeries.map((eq) => {
                    const validNums = eq.data.filter((v): v is number => v !== null && v !== undefined);
                    const avgVal = validNums.length > 0 ? validNums.reduce((a, b) => a + b, 0) / validNums.length : 0;
                    const maxVal = validNums.length > 0 ? Math.max(...validNums) : 0;

                    return (
                      <div
                        key={eq.name}
                        className="p-2 rounded-lg bg-[#070D18] border border-[#1E293B] flex items-center justify-between text-xs font-mono"
                      >
                        <span className="font-semibold text-white">{eq.name}</span>
                        <div className="text-[11px] text-[#94A3B8] space-x-2">
                          <span>Avg: <strong className="text-white">{avgVal.toFixed(1)}</strong></span>
                          <span>Max: <strong className="text-rose-400">{maxVal.toFixed(1)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK TOAST NOTIFICATION */}
      {feedbackNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center space-x-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-5 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {feedbackNotice.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* QUICK ADD TELEMETRY POINT MODAL */}
      {isAddDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#070D18]">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Record Telemetry Data Point</h3>
              </div>
              <button
                onClick={() => setIsAddDataModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRecord} className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#070D18] border border-[#1E293B] text-[11px] text-[#94A3B8]">
                Insert a real-time telemetry observation directly into persistent database. The graphs and alarm state will re-render automatically upon submission.
              </div>

              {/* Timestamp & Equipment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1">Timestamp / Date</label>
                  <input
                    type="text"
                    value={addDataForm['timestamp'] || ''}
                    onChange={(e) => setAddDataForm({ ...addDataForm, timestamp: e.target.value })}
                    placeholder="2026-08-17 12:00:00"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1">Equipment / Unit</label>
                  <input
                    type="text"
                    value={addDataForm['equipment'] || ''}
                    onChange={(e) => setAddDataForm({ ...addDataForm, equipment: e.target.value })}
                    placeholder="GEN-01"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              {/* Active Metric Value Input */}
              {activeMetricDefinition && (
                <div className="p-3 rounded-lg bg-[#0284C7]/10 border border-[#0284C7]/30">
                  <label className="text-xs font-bold text-sky-300 block mb-1">
                    {activeMetricDefinition.name} Reading ({activeMetricDefinition.unit || 'units'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={addDataForm[activeMetricDefinition.key] || ''}
                    onChange={(e) =>
                      setAddDataForm({ ...addDataForm, [activeMetricDefinition.key]: e.target.value })
                    }
                    placeholder={`Enter reading in ${activeMetricDefinition.unit || 'units'}`}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#0284C7] text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              )}

              {/* Additional Columns in Dataset */}
              <div className="space-y-2">
                <span className="text-[11px] text-[#64748B] uppercase tracking-wider block">
                  Other Dataset Parameters (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {detectedMetrics
                    .filter((m) => m.key !== activeMetricDefinition?.key)
                    .map((m) => (
                      <div key={m.key}>
                        <label className="text-[10px] text-[#94A3B8] block mb-0.5 truncate" title={m.name}>
                          {m.name} ({m.unit || '-'})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={addDataForm[m.key] || ''}
                          onChange={(e) => setAddDataForm({ ...addDataForm, [m.key]: e.target.value })}
                          placeholder="Reading"
                          className="w-full px-2.5 py-1.5 rounded bg-[#070D18] border border-[#1E293B] text-white text-xs"
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsAddDataModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingData}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Record & Update Graph</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE METRIC THRESHOLDS MODAL */}
      {isConfigMetricModalOpen && activeMetricDefinition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#070D18]">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Configure Thresholds: {activeMetricDefinition.name}
                </h3>
              </div>
              <button
                onClick={() => setIsConfigMetricModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action="javascript:void(0);"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveMetricConfig(e);
              }}
              className="p-5 overflow-y-auto space-y-4 text-xs font-mono"
            >
              <div className="p-3 rounded-lg bg-[#070D18] border border-[#1E293B] text-[11px] text-[#94A3B8]">
                Adjust operational warning and critical alarm thresholds for this telemetry channel. Changes will automatically update alert thresholds and visual demarcation lines on the graphs.
              </div>

              {/* Metric Label & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1">Metric Display Name</label>
                  <input
                    type="text"
                    value={metricConfigForm.name}
                    onChange={(e) => setMetricConfigForm({ ...metricConfigForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1">Unit of Measurement</label>
                  <input
                    type="text"
                    value={metricConfigForm.unit}
                    onChange={(e) => setMetricConfigForm({ ...metricConfigForm, unit: e.target.value })}
                    placeholder="MW, °C, RPM, Hz, bar"
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              {/* Thresholds Limits */}
              <div className="p-3.5 rounded-xl bg-[#070D18] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#38BDF8] font-bold uppercase tracking-wider block">
                    Operational Threshold Boundaries
                  </span>
                  <label className="flex items-center space-x-2 text-[11px] text-[#94A3B8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metricConfigForm.alarmEnabled}
                      onChange={(e) => setMetricConfigForm({ ...metricConfigForm, alarmEnabled: e.target.checked })}
                      className="rounded bg-[#070D18] border-[#1E293B] text-sky-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-white font-medium">Alarm Monitoring Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-cyan-400 block mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Low Limit (LT)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={metricConfigForm.lowLimit}
                      onChange={(e) => setMetricConfigForm({ ...metricConfigForm, lowLimit: e.target.value })}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-cyan-500/40 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-emerald-400 block mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Nominal Range (Min - Max)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={metricConfigForm.normalMin}
                        onChange={(e) => setMetricConfigForm({ ...metricConfigForm, normalMin: e.target.value })}
                        placeholder="Min"
                        className="w-full px-2 py-2 rounded-lg bg-[#0F172A] border border-emerald-500/40 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400 text-xs"
                      />
                      <input
                        type="number"
                        step="any"
                        value={metricConfigForm.normalMax}
                        onChange={(e) => setMetricConfigForm({ ...metricConfigForm, normalMax: e.target.value })}
                        placeholder="Max"
                        className="w-full px-2 py-2 rounded-lg bg-[#0F172A] border border-emerald-500/40 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-amber-400 block mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Warning Threshold (GT)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={metricConfigForm.warningThreshold}
                      onChange={(e) =>
                        setMetricConfigForm({ ...metricConfigForm, warningThreshold: e.target.value })
                      }
                      placeholder="e.g. 85"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-amber-500/40 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-rose-400 block mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Critical Threshold (GT)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={metricConfigForm.criticalThreshold}
                      onChange={(e) =>
                        setMetricConfigForm({ ...metricConfigForm, criticalThreshold: e.target.value })
                      }
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-rose-500/40 text-rose-300 font-bold focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsConfigMetricModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-update-thresholds-submit"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveMetricConfig(e);
                  }}
                  disabled={isSubmittingData}
                  className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Update Thresholds</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
