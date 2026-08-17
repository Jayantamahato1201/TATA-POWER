import React from 'react';
import {
  Upload,
  Cpu,
  Layers,
  Activity,
  Sliders,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { SourceBadge } from '../SourceBadge';

interface StageItem {
  number: string;
  title: string;
  tag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const MonitoringWorkflowSection: React.FC = () => {
  const stages: StageItem[] = [
    {
      number: '01',
      title: 'DATA INGESTION',
      tag: 'FILE UPLOAD',
      description: 'CSV and Excel datasets are uploaded through the authorised portal.',
      icon: Upload,
      color: 'text-[#38BDF8] border-[#38BDF8]/40 bg-[#38BDF8]/10',
    },
    {
      number: '02',
      title: 'SCHEMA DETECTION',
      tag: 'STRUCTURE PARSING',
      description: 'Columns, data types and supported field structures are analysed.',
      icon: Cpu,
      color: 'text-[#60A5FA] border-[#60A5FA]/40 bg-[#60A5FA]/10',
    },
    {
      number: '03',
      title: 'METRIC IDENTIFICATION',
      tag: 'FIELD CLASSIFICATION',
      description: 'Numerical operational metrics are classified by field name, unit and dataset structure.',
      icon: Layers,
      color: 'text-teal-400 border-teal-400/40 bg-teal-400/10',
    },
    {
      number: '04',
      title: 'DEDICATED ANALYTICS',
      tag: 'ONE METRIC = ONE CHART',
      description: 'Each metric is processed independently using the One Metric = One Visualization principle.',
      icon: Activity,
      color: 'text-[#00FF41] border-[#00FF41]/40 bg-[#00FF41]/10',
    },
    {
      number: '05',
      title: 'THRESHOLD CONFIGURATION',
      tag: 'SAFETY LIMITS',
      description: 'Authorised users define warning, normal and critical operating ranges.',
      icon: Sliders,
      color: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
    },
    {
      number: '06',
      title: 'ALARM CLASSIFICATION',
      tag: 'THRESHOLD EVALUATION',
      description: 'Uploaded values are evaluated against configured thresholds.',
      icon: AlertTriangle,
      color: 'text-rose-400 border-rose-400/40 bg-rose-400/10',
    },
    {
      number: '07',
      title: 'OPERATIONAL INSIGHTS',
      tag: 'TREND SYNTHESIS',
      description: 'Visual summaries, trends and downloadable data support analysis.',
      icon: Lightbulb,
      color: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
    },
  ];

  return (
    <section id="monitoring-workflow" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#205CA5]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
              <Activity className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest font-semibold">DATA PROCESSING ARCHITECTURE</span>
            </div>
            <SourceBadge type="PLATFORM_CAPABILITY" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
            Telemetry Analytics Workflow
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
            How uploaded operational datasets are processed inside this analytics platform.
          </p>
        </div>

        {/* Live Data Pipeline Flow */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden xl:block absolute top-[52px] inset-x-8 h-1 bg-gradient-to-r from-[#205CA5] via-[#38BDF8] to-[#00FF41] opacity-30 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 relative z-10">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.number}
                  className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-[#205CA5]/70 transition-all flex flex-col justify-between space-y-4 shadow-lg group relative"
                >
                  {/* Top Step Pill & Icon */}
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xs border ${stage.color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#64748B] group-hover:text-white transition-colors">
                      {stage.number}
                    </span>
                  </div>

                  {/* Stage Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="text-[9px] font-mono text-[#64748B] uppercase tracking-wider">
                      {stage.tag}
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono group-hover:text-[#38BDF8] transition-colors">
                      {stage.title}
                    </h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed font-light font-sans pt-1">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
