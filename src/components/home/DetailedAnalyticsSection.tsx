import React from 'react';
import { BarChart3, Layers, SlidersHorizontal, Activity } from 'lucide-react';
import { MetricExplorerView } from '../MetricVisualizer/MetricExplorerView';

export const DetailedAnalyticsSection: React.FC<{
  onOpenUpload: () => void;
}> = ({ onOpenUpload }) => {
  return (
    <section id="detailed-analytics" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-8">
        {/* Section Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest font-semibold">ISOLATED TIME-SERIES INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
            Detailed Metric Analytics
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
            Explore each operational metric independently with dedicated visualizations, threshold analysis, histogram distributions, and equipment-level comparisons.
          </p>
        </div>

        {/* Dynamic Metric Explorer Engine (Strict Rule: One Metric = One Visualization) */}
        <div className="w-full">
          <MetricExplorerView onOpenUpload={onOpenUpload} />
        </div>
      </div>
    </section>
  );
};
