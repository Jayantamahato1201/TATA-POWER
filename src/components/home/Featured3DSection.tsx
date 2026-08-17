import React from 'react';
import { Layers, Sparkles, Box, Radio } from 'lucide-react';
import { ThreeDTemperatureAnalytics } from '../ThreeDTemperature/ThreeDTemperatureAnalytics';
import { SourceBadge } from '../SourceBadge';
import { useData } from '../../context/DataContext';

export const Featured3DSection: React.FC<{
  onOpenUpload: () => void;
}> = ({ onOpenUpload }) => {
  const { overview, currentDataset } = useData();
  const hasData = overview?.hasData;

  return (
    <section id="featured-3d-visualization" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Layers className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">SPATIAL TELEMETRY INTELLIGENCE</span>
              </div>
              {hasData ? (
                <SourceBadge type="CALCULATED_FROM_DATASET" />
              ) : (
                <SourceBadge type="AWAITING_TELEMETRY" />
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              Advanced 3D Telemetry Visualization
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
              Explore uploaded numerical operational telemetry across interactive 3D WebGL mathematical surface meshes, spatial representations, and threshold-aware visual analysis.
            </p>
          </div>

          {/* Dataset Status Badge */}
          {hasData && (
            <div className="px-3.5 py-1.5 rounded-xs bg-[#0A1124] border border-[#1E293B] font-mono text-xs text-[#94A3B8] shrink-0 self-start lg:self-end">
              <span className="text-[#38BDF8] font-bold">ACTIVE TELEMETRY:</span> {currentDataset?.name}
            </div>
          )}
        </div>

        {/* 3D Visualization Studio Centerpiece */}
        <div className="w-full">
          <ThreeDTemperatureAnalytics onOpenUpload={onOpenUpload} />
        </div>
      </div>
    </section>
  );
};
