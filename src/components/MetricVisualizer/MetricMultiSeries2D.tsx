import React from 'react';
import ReactECharts from 'echarts-for-react';
import { MetricAnalyticsPayload } from '../../types';

interface MetricMultiSeries2DProps {
  payload: MetricAnalyticsPayload;
  height?: number;
}

export const MetricMultiSeries2D: React.FC<MetricMultiSeries2DProps> = ({
  payload,
  height = 360,
}) => {
  const { metric, timeSeries, generatorSeries, distribution } = payload;
  const { unit, thresholds, colorScheme } = metric;

  const categories = timeSeries.map((t) => t.timestamp);

  const series = generatorSeries.map((gen) => {
    const data = timeSeries.map((t) => t.values[gen.name] ?? null);
    return {
      name: gen.name,
      type: 'line',
      smooth: true,
      data: data,
      itemStyle: { color: gen.color },
      lineStyle: { width: 2.5, color: gen.color },
      showSymbol: data.length < 50,
      symbolSize: 6,
      connectNulls: true,
      markLine:
        thresholds.enabled
          ? {
              symbol: 'none',
              data: [
                (thresholds.criticalLimit !== undefined || thresholds.high !== undefined)
                  ? {
                      yAxis: thresholds.criticalLimit !== undefined ? thresholds.criticalLimit : thresholds.high,
                      lineStyle: { color: thresholds.criticalColor || thresholds.highColor || '#EF4444', type: 'dashed', width: 1.8 },
                      label: {
                        formatter: `Critical: ${thresholds.criticalLimit !== undefined ? thresholds.criticalLimit : thresholds.high} ${unit || ''}`,
                        position: 'insideEndTop',
                        color: thresholds.criticalColor || thresholds.highColor || '#EF4444',
                        fontSize: 10,
                        fontWeight: 'bold',
                      },
                    }
                  : undefined,
                thresholds.warningLimit !== undefined
                  ? {
                      yAxis: thresholds.warningLimit,
                      lineStyle: { color: thresholds.warningColor || '#F59E0B', type: 'dashed', width: 1.8 },
                      label: {
                        formatter: `Warning: ${thresholds.warningLimit} ${unit || ''}`,
                        position: 'insideEndTop',
                        color: thresholds.warningColor || '#F59E0B',
                        fontSize: 10,
                        fontWeight: 'bold',
                      },
                    }
                  : undefined,
                thresholds.normalMax !== undefined
                  ? {
                      yAxis: thresholds.normalMax,
                      lineStyle: { color: thresholds.normalColor || '#10B981', type: 'dotted', width: 1.2 },
                      label: {
                        formatter: `Nominal Max: ${thresholds.normalMax} ${unit || ''}`,
                        position: 'insideEndTop',
                        color: thresholds.normalColor || '#10B981',
                        fontSize: 9,
                      },
                    }
                  : undefined,
                thresholds.normalMin !== undefined
                  ? {
                      yAxis: thresholds.normalMin,
                      lineStyle: { color: thresholds.normalColor || '#10B981', type: 'dotted', width: 1.2 },
                      label: {
                        formatter: `Nominal Min: ${thresholds.normalMin} ${unit || ''}`,
                        position: 'insideEndBottom',
                        color: thresholds.normalColor || '#10B981',
                        fontSize: 9,
                      },
                    }
                  : undefined,
                (thresholds.low !== undefined)
                  ? {
                      yAxis: thresholds.low,
                      lineStyle: { color: thresholds.lowColor || '#06B6D4', type: 'dashed', width: 1.8 },
                      label: {
                        formatter: `Low Limit: ${thresholds.low} ${unit || ''}`,
                        position: 'insideEndBottom',
                        color: thresholds.lowColor || '#06B6D4',
                        fontSize: 10,
                        fontWeight: 'bold',
                      },
                    }
                  : undefined,
              ].filter(Boolean) as any[],
            }
          : undefined,
    };
  });

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '12%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontFamily: 'monospace', fontSize: 12 },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: colorScheme.primary || '#38BDF8', width: 1 },
      },
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        let res = `<div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #334155; padding-bottom: 2px;">${params[0].axisValue}</div>`;
        params.forEach((item) => {
          const val = item.value !== null && item.value !== undefined ? `${item.value} ${unit}` : 'N/A';
          res += `<div style="display: flex; justify-content: space-between; gap: 16px; margin: 2px 0;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};"></span>
              ${item.seriesName}:
            </span>
            <span style="font-weight: bold; color: #fff;">${val}</span>
          </div>`;
        });
        return res;
      },
    },
    legend: {
      top: '0%',
      textStyle: { color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 },
      icon: 'roundRect',
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 },
    },
    yAxis: {
      type: 'value',
      name: unit ? `(${unit})` : '',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      min: (val: any) => Math.max(0, Math.floor(val.min * 0.95)),
      max: (val: any) => Math.ceil(val.max * 1.05) || undefined,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        bottom: 0,
        height: 18,
        borderColor: '#1e293b',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        fillerColor: 'rgba(56, 189, 248, 0.15)',
        textStyle: { color: '#64748b', fontSize: 9 },
      },
    ],
    series: series,
  };

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: colorScheme.primary || '#38BDF8' }}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Multi-Generator Synchronized Telemetry ({unit || 'Units'})
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Y-Axis: <b className="text-slate-300">Single Metric ({unit || 'Units'})</b></span>
          <span>Generators: <b className="text-slate-300">{generatorSeries.length}</b></span>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>
    </div>
  );
};
