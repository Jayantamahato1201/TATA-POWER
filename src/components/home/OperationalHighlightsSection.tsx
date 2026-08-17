import React from 'react';
import {
  Activity,
  BellRing,
  BarChart3,
  Layers,
  ShieldAlert,
  Database,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { SourceBadge } from '../SourceBadge';

interface HighlightItem {
  id: string;
  title: string;
  tag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderColor: string;
}

export const OperationalHighlightsSection: React.FC<{
  onSelectHighlight?: (id: string) => void;
}> = ({ onSelectHighlight }) => {
  const highlights: HighlightItem[] = [
    {
      id: 'realtime-telemetry',
      title: 'REAL-TIME TELEMETRY ANALYTICS',
      tag: 'STRUCTURED INGESTION',
      description:
        'Upload and analyse structured operational datasets with automatic identification of supported telemetry fields.',
      icon: Activity,
      accentColor: 'text-[#38BDF8]',
      borderColor: 'hover:border-[#205CA5]',
    },
    {
      id: 'configurable-alerting',
      title: 'CONFIGURABLE ALERTING',
      tag: 'THRESHOLD CLASSIFICATION',
      description:
        'Configure warning and critical thresholds for individual metrics and classify uploaded telemetry according to defined operating limits.',
      icon: BellRing,
      accentColor: 'text-amber-400',
      borderColor: 'hover:border-amber-500/60',
    },
    {
      id: 'isolated-analytics',
      title: 'ISOLATED METRIC ANALYTICS',
      tag: 'ONE METRIC = ONE CHART',
      description:
        'Each detected metric receives its own dedicated visualization to prevent unrelated units and operational variables from being mixed.',
      icon: BarChart3,
      accentColor: 'text-[#00FF41]',
      borderColor: 'hover:border-[#00FF41]/60',
    },
    {
      id: '3d-visualization',
      title: '3D DATA VISUALIZATION',
      tag: 'SPATIAL SURFACES',
      description:
        'Explore uploaded numerical telemetry through interactive 3D surfaces, spatial representations and threshold-aware visual analysis.',
      icon: Layers,
      accentColor: 'text-[#60A5FA]',
      borderColor: 'hover:border-blue-500/60',
    },
    {
      id: 'incident-analysis',
      title: 'INCIDENT & EVENT ANALYSIS',
      tag: 'SEVERITY & TIMELINE',
      description:
        'Analyse alarm and event records from uploaded datasets using severity, duration and timeline-based visualizations.',
      icon: ShieldAlert,
      accentColor: 'text-rose-400',
      borderColor: 'hover:border-rose-500/60',
    },
    {
      id: 'centralized-data-mgmt',
      title: 'CENTRALIZED DATA MANAGEMENT',
      tag: 'STAFF CONTROL PORTAL',
      description:
        'Authorised staff can upload CSV and Excel datasets, manage metric configuration and control visualization and threshold settings.',
      icon: Database,
      accentColor: 'text-purple-400',
      borderColor: 'hover:border-purple-500/60',
    },
  ];

  return (
    <section id="operational-highlights" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest font-semibold">COMMAND CENTER CAPABILITIES</span>
            </div>
            <SourceBadge type="PLATFORM_CAPABILITY" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
            Key Operational Highlights
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
            Core analytical, visual and alerting capabilities engineered within this data intelligence platform.
          </p>
        </div>

        {/* 6 Premium Capabilities Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                id={`highlight-card-${item.id}`}
                onClick={() => onSelectHighlight?.(item.id)}
                className={`p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] ${item.borderColor} transition-all duration-300 flex flex-col justify-between space-y-5 shadow-xl group cursor-pointer relative overflow-hidden`}
              >
                {/* Subtle Hover Backlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#205CA5]/5 rounded-full blur-2xl group-hover:bg-[#205CA5]/15 transition-all pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  {/* Top Bar: Icon + Category Tag */}
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B] group-hover:border-[#205CA5]/70 transition-colors">
                      <Icon className={`w-5 h-5 ${item.accentColor}`} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider bg-[#070D18] px-2.5 py-1 rounded-xs border border-[#1E293B]">
                      {item.tag}
                    </span>
                  </div>

                  {/* Title & Authentic Description */}
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight group-hover:text-[#38BDF8] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-light font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Capability Confirmation */}
                <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-[#64748B] group-hover:text-[#38BDF8] transition-colors">
                  <span className="text-[10px] uppercase">Platform Feature</span>
                  <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
