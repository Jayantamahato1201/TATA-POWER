import React from 'react';
import ReactECharts from 'echarts-for-react';
import { MetricAnalyticsPayload } from '../../types';

interface MetricHistogramDistributionProps {
  payload: MetricAnalyticsPayload;
  height?: number;
}

export const MetricHistogramDistribution: React.FC<MetricHistogramDistributionProps> = ({
  payload,
  height = 320,
}) => {
  const { metric, distribution } = payload;
  const { unit, colorScheme } = metric;
  const { bins, stats } = distribution;

  const categories = bins.map((b) => b.label);
  const data = bins.map((b) => b.count);

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '10%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontFamily: 'monospace', fontSize: 12 },
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        const item = params[0];
        return `<div style="font-weight: bold; margin-bottom: 2px;">Bin Range: ${item.axisValue}</div>
          <div>Telemetry Frequency: <span style="font-weight:bold;color:#38bdf8;">${item.value}</span> records</div>`;
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 15 },
    },
    yAxis: {
      type: 'value',
      name: 'Records',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: 'Frequency',
        type: 'bar',
        data: data,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colorScheme.primary || '#38BDF8' },
              { offset: 1, color: `${colorScheme.primary || '#38BDF8'}55` },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 shadow-xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Minimum</span>
          <div className="text-lg font-bold text-white font-mono">
            {stats.min} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Average</span>
          <div className="text-lg font-bold text-cyan-400 font-mono">
            {stats.avg} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Maximum</span>
          <div className="text-lg font-bold text-amber-400 font-mono">
            {stats.max} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Total Ingested</span>
          <div className="text-lg font-bold text-slate-200 font-mono">
            {stats.totalRecords} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
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
