import React from 'react';
import {
  Activity,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Thermometer,
  Zap,
  Gauge,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SourceBadge } from '../SourceBadge';

interface LiveCommandPreviewSectionProps {
  onScrollToAnalytics: () => void;
  onScrollTo3D: () => void;
}

export const LiveCommandPreviewSection: React.FC<LiveCommandPreviewSectionProps> = ({
  onScrollToAnalytics,
  onScrollTo3D,
}) => {
  const { overview, currentDataset, filters, setFilters, activeDatasetMetrics, processedData } = useData();
  const hasData = overview?.hasData && (overview?.totalRecords || 0) > 0;

  // Extract actual equipment from processed dataset if available
  const availableEquipment = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const eqSet = new Set<string>();
    processedData.forEach((row) => {
      if (row.equipment_id) eqSet.add(String(row.equipment_id));
      else if (row.equipment) eqSet.add(String(row.equipment));
      else if (row.unit) eqSet.add(String(row.unit));
    });
    return Array.from(eqSet);
  }, [processedData]);

  // Compute actual min/max/avg for detected active metrics
  const detectedMetricsSummary = React.useMemo(() => {
    if (!processedData || processedData.length === 0 || !activeDatasetMetrics) return [];
    return activeDatasetMetrics.slice(0, 4).map((metric) => {
      const values = processedData
        .map((r) => r[metric.fieldKey])
        .filter((v) => typeof v === 'number' && !isNaN(v));
      
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      return {
        key: metric.fieldKey,
        label: metric.displayName || metric.fieldKey,
        unit: metric.unit || '',
        category: metric.category,
        min: Number(min.toFixed(1)),
        max: Number(max.toFixed(1)),
        avg: Number(avg.toFixed(1)),
        count: values.length,
      };
    });
  }, [processedData, activeDatasetMetrics]);

  return (
    <section id="live-command-preview" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Activity className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">ANALYTICS ENVIRONMENT TRANSITION</span>
              </div>
              {hasData ? (
                <SourceBadge type="CALCULATED_FROM_DATASET" />
              ) : (
                <SourceBadge type="AWAITING_TELEMETRY" />
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              Live Operations Intelligence
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
              Explore calculated metrics, sensor ranges, and multi-variable distributions derived from currently uploaded datasets.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onScrollTo3D}
              className="px-4 py-2.5 rounded-xs bg-[#0F172A] hover:bg-[#1E293B] text-[#38BDF8] border border-[#205CA5]/50 font-mono text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-md"
            >
              <Layers className="w-4 h-4" />
              <span>Explore 3D Studio</span>
            </button>

            <button
              id="btn-open-full-analytics"
              onClick={onScrollToAnalytics}
              className="px-5 py-2.5 rounded-xs bg-[#205CA5] hover:bg-[#2B68B8] text-white font-bold text-xs sm:text-sm uppercase font-mono tracking-wider transition-all shadow-[0_0_20px_rgba(32,92,165,0.45)] flex items-center space-x-2 cursor-pointer"
            >
              <span>Open Full Analytics</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Dynamic Telemetry Intelligence Card */}
        {hasData ? (
          <div className="p-6 sm:p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white uppercase font-mono flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#38BDF8]" />
                  <span>Dataset Telemetry Streams</span>
                </h3>
                <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                  Source: {currentDataset?.name} ({overview?.totalRecords} records)
                </p>
              </div>

              {/* Equipment Selector (from dataset) */}
              {availableEquipment.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-[#64748B] uppercase">Filter Unit:</span>
                  <button
                    onClick={() => setFilters({ ...filters, equipment: 'ALL' })}
                    className={`px-2.5 py-1 rounded-xs text-xs font-mono uppercase transition-all cursor-pointer ${
                      !filters.equipment || filters.equipment === 'ALL'
                        ? 'bg-[#205CA5] text-white font-bold'
                        : 'bg-[#070D18] text-[#94A3B8] hover:text-white border border-[#1E293B]'
                    }`}
                  >
                    All Fleet
                  </button>
                  {availableEquipment.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => setFilters({ ...filters, equipment: eq })}
                      className={`px-2.5 py-1 rounded-xs text-xs font-mono uppercase transition-all cursor-pointer ${
                        filters.equipment === eq
                          ? 'bg-[#205CA5] text-white font-bold'
                          : 'bg-[#070D18] text-[#94A3B8] hover:text-white border border-[#1E293B]'
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Floating Metric Preview Indicators (Dynamic Calculated) */}
            {detectedMetricsSummary.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {detectedMetricsSummary.map((m) => (
                  <div
                    key={m.key}
                    className="p-4 rounded-xs bg-[#070D18] border border-[#1E293B] flex items-center space-x-3.5"
                  >
                    <div className="p-2.5 rounded-xs bg-[#0A1124] border border-[#205CA5]/40 text-[#38BDF8]">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                        {m.label}
                      </span>
                      <div className="text-sm font-bold text-white font-mono">
                        {m.avg} <span className="text-xs text-[#38BDF8]">{m.unit}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#94A3B8] block">
                        Range: {m.min} — {m.max} {m.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xs bg-[#070D18] border border-[#1E293B] text-xs font-mono text-[#94A3B8]">
                Telemetry metrics parsed from current dataset. Open full analytics for time-series charts.
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] text-center space-y-3">
            <Info className="w-8 h-8 text-[#64748B] mx-auto" />
            <h3 className="text-base font-bold text-white font-mono uppercase">
              DATASET REQUIRED FOR LIVE ANALYTICS
            </h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              Please upload or load a verified operational telemetry dataset to unlock dynamic range calculations and equipment-level telemetry previews.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
