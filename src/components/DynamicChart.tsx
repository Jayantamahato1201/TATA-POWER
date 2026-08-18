import React, { useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Sliders,
  Filter,
  Layers,
} from 'lucide-react';
import { ChartConfig } from '../types';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

interface DynamicChartProps {
  chartConfig: ChartConfig;
  height?: string | number;
  onCustomize?: (config: ChartConfig) => void;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({
  chartConfig,
  height = 360,
  onCustomize,
}) => {
  const { isDark } = useTheme();
  const { filters, selectedDatasetId, alarmRules, datasets, currentDataset, lastUpdated } = useData();
  const [chartData, setChartData] = useState<{ categories: string[]; series: any[]; rawRows: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChartType, setCurrentChartType] = useState(chartConfig.chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<any>(null);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartId: chartConfig.id,
          filters: {
            equipment: filters.equipment,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
          customConfig: {
            ...chartConfig,
            chartType: currentChartType,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [chartConfig.id, filters, currentChartType, selectedDatasetId, lastUpdated]);

  // Download filtered data as CSV
  const handleDownloadCSV = () => {
    const params = new URLSearchParams();
    if (filters.equipment) params.append('equipment', filters.equipment);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `/api/export/chart/${chartConfig.id}/csv?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Download chart as PNG image
  const handleDownloadPNG = () => {
    if (chartRef.current) {
      const echartsInstance = chartRef.current.getEchartsInstance();
      const base64 = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${chartConfig.title.replace(/\s+/g, '_').toLowerCase()}_chart.png`;
      link.href = base64;
      link.click();
    }
  };

  // Build ECharts Option Configuration
  const getEChartsOption = () => {
    if (!chartData || !chartData.series || chartData.series.length === 0) return {};

    const isDonut = currentChartType === 'donut';
    const isArea = currentChartType === 'area';
    const isBar = currentChartType === 'bar' || currentChartType === 'bar3d';

    // Theme color constants
    const tooltipBg = isDark ? '#0B132B' : '#FFFFFF';
    const tooltipBorder = isDark ? '#1E293B' : '#CBD5E1';
    const tooltipText = isDark ? '#E2E8F0' : '#0F172A';
    const tooltipTitle = isDark ? '#38BDF8' : '#0284C7';
    const tooltipMuted = isDark ? '#94A3B8' : '#475569';
    const tooltipValColor = isDark ? '#FFFFFF' : '#0F172A';
    const axisLineColor = isDark ? '#334155' : '#CBD5E1';
    const axisLabelColor = isDark ? '#94A3B8' : '#475569';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
    const legendColor = isDark ? '#94A3B8' : '#334155';
    const donutBorderColor = isDark ? '#0f172a' : '#ffffff';

    // Find applicable alarm thresholds
    const matchingRules = alarmRules.filter(
      (r) =>
        r.isEnabled &&
        chartConfig.yAxisColumns?.some(
          (y) =>
            y &&
            (y.toLowerCase() === r.metricColumn?.toLowerCase() ||
              y.toLowerCase().includes(r.metricColumn?.toLowerCase()))
        )
    );

    // Build threshold marklines
    const markLineData = matchingRules
      .filter((r) => r.thresholdValue !== undefined && !isNaN(Number(r.thresholdValue)))
      .map((r) => ({
        yAxis: Number(r.thresholdValue),
        name: `${r.name} (${r.thresholdValue})`,
        lineStyle: {
          color: r.customColor || (r.alarmLevel === 'CRITICAL' ? '#EF4444' : '#F59E0B'),
          type: 'dashed',
          width: 2,
        },
        label: {
          formatter: `${r.alarmLevel}: {c}${chartConfig.unit || ''}`,
          position: 'end',
          color: r.customColor || '#F59E0B',
          fontSize: 10,
          fontWeight: 'bold',
        },
      }));

    if (isDonut) {
      const rawSeriesData = chartData.series[0]?.data || [];
      const donutData = rawSeriesData.map((item: any, idx: number) => {
        if (item && typeof item === 'object' && 'value' in item) {
          return {
            name: String(item.name ?? chartData.categories?.[idx] ?? `Item ${idx + 1}`),
            value: Number(item.value) || 0,
          };
        }
        return {
          name: String(chartData.categories?.[idx] ?? `Item ${idx + 1}`),
          value: Number(item) || 0,
        };
      });

      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: tooltipText },
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          textStyle: { color: legendColor, fontSize: 11 },
        },
        series: [
          {
            name: chartConfig.title,
            type: 'pie',
            radius: ['45%', '75%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 8,
              borderColor: donutBorderColor,
              borderWidth: 2,
            },
            label: {
              show: false,
              position: 'center',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: 'bold',
                color: tooltipTitle,
              },
            },
            data: donutData,
          },
        ],
      };
    }

    // Line / Area / Bar Chart configuration
    const seriesList = chartData.series.map((s, idx) => {
      const palette = chartConfig.colorPalette || ['#205CA5', '#38BDF8', '#00FF41', '#60A5FA', '#F59E0B', '#F43F5E'];
      const color = palette[idx % palette.length];

      // Sanitize data: ensure each item is a primitive number or null, not an object
      const sanitizedData = Array.isArray(s.data)
        ? s.data.map((item: any) => {
            if (item === null || item === undefined) return null;
            if (typeof item === 'object' && 'value' in item) {
              const num = Number(item.value);
              return isNaN(num) ? null : num;
            }
            const num = Number(item);
            return isNaN(num) ? null : num;
          })
        : [];

      return {
        name: s.name || `Series ${idx + 1}`,
        type: isBar ? 'bar' : 'line',
        smooth: !isBar,
        showSymbol: (chartData.categories?.length || 0) < 50,
        symbolSize: 6,
        data: sanitizedData,
        itemStyle: {
          color: color,
          borderRadius: isBar ? [2, 2, 0, 0] : 0,
        },
        areaStyle: isArea
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${color}80` },
                  { offset: 1, color: `${color}00` },
                ],
              },
            }
          : undefined,
        markLine:
          idx === 0 && markLineData.length > 0
            ? {
                silent: true,
                symbol: 'none',
                data: markLineData,
              }
            : undefined,
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 10,
        textStyle: { color: tooltipText, fontSize: 11, fontFamily: 'monospace' },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: tooltipTitle, type: 'dashed' },
          crossStyle: { color: tooltipTitle },
        },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const paramList = Array.isArray(params) ? params : [params];
          const first = paramList[0];
          const dataIndex = first.dataIndex;
          const rawRow = chartData.rawRows?.[dataIndex] || {};
          const activeDataset = datasets.find((d) => d.id === chartConfig.datasetId) || currentDataset;
          const datasetName = activeDataset?.name || 'Authorized Telemetry Dataset';
          const equipmentName =
            rawRow.equipment ||
            rawRow.equipmentId ||
            rawRow.generator ||
            rawRow.unit ||
            rawRow.Equipment ||
            rawRow.Generator ||
            rawRow.Unit ||
            (filters.equipment && filters.equipment !== 'ALL' ? filters.equipment : undefined);
          const timestamp =
            first.axisValueLabel ||
            first.name ||
            rawRow.timestamp ||
            rawRow.time ||
            rawRow.date ||
            'Recorded Data Point';

          let html = `<div style="font-family: monospace; font-size: 11px; min-width: 180px;">`;
          html += `<div style="font-weight: bold; color: ${tooltipTitle}; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid ${tooltipBorder}; padding-bottom: 4px;">${chartConfig.title || first.seriesName}</div>`;

          paramList.forEach((p: any) => {
            html += `<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 3px;">
              <span style="color: ${tooltipMuted};">${p.seriesName}:</span>
              <strong style="color: ${tooltipValColor}; font-size: 12px;">${p.value ?? '--'} ${chartConfig.unit || ''}</strong>
            </div>`;
          });

          if (equipmentName) {
            html += `<div style="color: ${tooltipMuted}; font-size: 10px; margin-top: 6px; border-top: 1px dashed ${tooltipBorder}; padding-top: 4px;">Equipment / Generator: <span style="color: ${tooltipTitle}; font-weight: bold;">${equipmentName}</span></div>`;
          }
          html += `<div style="color: ${tooltipMuted}; font-size: 10px;">Timestamp: <span style="color: ${tooltipText};">${timestamp}</span></div>`;
          html += `<div style="color: ${tooltipMuted}; font-size: 9px; margin-top: 2px;">Dataset: ${datasetName}</div>`;
          html += `</div>`;
          return html;
        },
      },
      legend:
        chartConfig.showLegend !== false && chartData.series.length > 0
          ? {
              data: chartData.series.map((s, idx) => s.name || `Series ${idx + 1}`),
              top: 0,
              textStyle: { color: legendColor, fontSize: 11, fontFamily: 'monospace' },
            }
          : undefined,
      grid: {
        top: chartConfig.showLegend !== false ? 36 : 20,
        left: '3%',
        right: '4%',
        bottom: chartConfig.showDataZoom ? '14%' : '6%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: (chartData.categories || []).map(String),
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: {
          color: axisLabelColor,
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (val: string) => {
            if (val && val.includes('T')) {
              return val.split('T')[1]?.substring(0, 5) || val;
            }
            return val?.length > 12 ? `${val.substring(0, 12)}…` : val;
          },
        },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value',
        name: chartConfig.unit ? `(${chartConfig.unit})` : undefined,
        nameTextStyle: { color: axisLabelColor, fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: axisLabelColor, fontSize: 10, fontFamily: 'monospace' },
      },
      dataZoom: chartConfig.showDataZoom
        ? [
            {
              type: 'inside',
              start: 0,
              end: 100,
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 16,
              bottom: 4,
              borderColor: axisLineColor,
              fillerColor: isDark ? 'rgba(32, 92, 165, 0.3)' : 'rgba(32, 92, 165, 0.15)',
              textStyle: { color: axisLabelColor, fontSize: 9, fontFamily: 'monospace' },
              handleStyle: { color: '#205CA5' },
            },
          ]
        : undefined,
      series: seriesList,
    };
  };

  return (
    <div
      id={`chart-container-${chartConfig.id}`}
      className={`relative rounded-sm bg-[#0A1124] border border-[#1E293B] p-4 transition-all duration-300 shadow-xl ${
        isFullscreen ? 'fixed inset-4 z-50 bg-[#070D18] flex flex-col border-[#205CA5]' : ''
      }`}
    >
      {/* Header & Professional Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-[#1E293B]">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide flex items-center space-x-2 font-mono uppercase">
            <span>{chartConfig.title}</span>
            {chartConfig.unit && (
              <span className="text-xs font-mono font-normal text-[#38BDF8] bg-[#205CA5]/20 px-2 py-0.5 rounded-xs border border-[#205CA5]/40">
                {chartConfig.unit}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
            X-Axis: {chartConfig.xAxisColumn} | Series: {chartConfig.yAxisColumns.join(', ')}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-1.5 font-mono">
          {/* Chart Type Selector */}
          <div className="flex items-center bg-[#070D18] rounded-xs p-0.5 border border-[#1E293B]">
            <button
              onClick={() => setCurrentChartType('line')}
              className={`p-1 rounded-xs text-xs cursor-pointer ${
                currentChartType === 'line' ? 'bg-[#205CA5] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Line Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentChartType('area')}
              className={`p-1 rounded-xs text-xs cursor-pointer ${
                currentChartType === 'area' ? 'bg-[#205CA5] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Smooth Area Chart"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentChartType('bar')}
              className={`p-1 rounded-xs text-xs cursor-pointer ${
                currentChartType === 'bar' ? 'bg-[#205CA5] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Bar Chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download Data as CSV */}
          <button
            id={`btn-download-csv-${chartConfig.id}`}
            onClick={handleDownloadCSV}
            className="p-1.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#38BDF8] border border-[#1E293B] text-xs flex items-center space-x-1 cursor-pointer uppercase"
            title="Download Filtered Data as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">CSV</span>
          </button>

          {/* Download Chart as PNG */}
          <button
            id={`btn-download-png-${chartConfig.id}`}
            onClick={handleDownloadPNG}
            className="p-1.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#38BDF8] border border-[#1E293B] text-xs flex items-center space-x-1 cursor-pointer uppercase"
            title="Download Chart as PNG Image"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">PNG</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchChartData}
            className="p-1.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#38BDF8]' : ''}`} />
          </button>

          {/* Customize if available */}
          {onCustomize && (
            <button
              onClick={() => onCustomize(chartConfig)}
              className="p-1.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#38BDF8] border border-[#1E293B] text-xs cursor-pointer"
              title="Customize Chart Parameters"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className={`relative ${isFullscreen ? 'flex-1 min-h-[500px]' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-[#070D18]/70 backdrop-blur-xs flex items-center justify-center z-10">
            <RefreshCw className="w-6 h-6 text-[#38BDF8] animate-spin" />
          </div>
        )}

        {chartData &&
        chartData.series &&
        chartData.series.length > 0 &&
        ((chartData.categories && chartData.categories.length > 0) || currentChartType === 'donut') ? (
          <ReactECharts
            ref={chartRef}
            option={getEChartsOption()}
            style={{ height: isFullscreen ? '100%' : height, width: '100%' }}
            notMerge={true}
            lazyUpdate={false}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center p-8 rounded-xs border border-dashed border-[#222]"
            style={{ height }}
          >
            <BarChart2 className="w-8 h-8 text-[#666] mb-2" />
            <p className="text-sm text-[#AAA] font-mono">No operational telemetry records match active filters</p>
            <p className="text-xs text-[#666] mt-1 font-mono">Upload telemetry or adjust equipment & time range filters</p>
          </div>
        )}
      </div>
    </div>
  );
};
