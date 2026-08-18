import React from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  Zap,
  Leaf,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Cpu,
} from 'lucide-react';
import { SourceBadge } from '../SourceBadge';

export const OperationsOverviewSection: React.FC = () => {
  return (
    <section id="operations-overview" className="relative py-12 sm:py-16 border-t border-[#1E293B] w-full">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#205CA5]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Building2 className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">TATA POWER JAMSHEDPUR</span>
              </div>
              <SourceBadge type="VERIFIED_PLANT_PROFILE" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              About Jojobera
            </h2>
            <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed font-normal">
              Tata Power's journey in Jharkhand began with the Jojobera Thermal Power Station in 1997. Located in Jojobera, Jharkhand, the station has a plant capacity of 427.5 MW and forms an important part of Tata Power's thermal generation portfolio.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] font-mono text-xs text-[#94A3B8] shrink-0 self-start lg:self-end">
            TOTAL CAPACITY: <span className="text-[#38BDF8] font-bold">427.5 MW</span> | SINCE <span className="text-[#00FF41] font-bold">1997</span>
          </div>
        </div>

        {/* Factual Operational & Technical Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Expansion & Strategic Role */}
          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#205CA5] shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#1E293B]">
                <div className="p-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#38BDF8]">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    Expansion & Evolution
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Foundational Generation in Jharkhand</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
                The company's Jharkhand presence began with the acquisition of a 67.5 MW captive power unit from Tata Steel. Tata Power subsequently expanded the Jojobera operation by adding five more units in response to growing power requirements.
              </p>
            </div>

            <div className="pt-3 border-t border-[#1E293B]/70 flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
              <span>Initial Unit: 67.5 MW</span>
              <span className="text-[#38BDF8] font-bold">+5 Expansion Units</span>
            </div>
          </div>

          {/* Card 2: Industrial Supply & Strategic Value */}
          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-sky-500 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#1E293B]">
                <div className="p-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-sky-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    Vital Energy Lifeline
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Jamshedpur & Industrial Core</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
                According to Tata Power, Jojobera is a vital source of energy for Jamshedpur and Tata Steel. The station delivers continuous base-load power critical to regional manufacturing and civic infrastructure reliability.
              </p>
            </div>

            <div className="pt-3 border-t border-[#1E293B]/70 flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
              <span>Key Offtakers</span>
              <span className="text-sky-400 font-bold">Tata Steel & Jamshedpur</span>
            </div>
          </div>

          {/* Card 3: Environmental Technology & DE-NOx */}
          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#00FF41] shadow-xl space-y-4 flex flex-col justify-between md:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#1E293B]">
                <div className="p-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#00FF41]">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    Advanced DE-NOx System
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Industry-First Environmental Implementation</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
                The plant is recognized as the first in the industry to use an advanced DE-NOx system to optimise combustion and reduce emissions, maintaining operational excellence while reducing environmental footprint.
              </p>
            </div>

            <div className="pt-3 border-t border-[#1E293B]/70 flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
              <span>Emission Control</span>
              <span className="text-[#00FF41] font-bold">Combustion Optimization</span>
            </div>
          </div>
        </div>

        {/* Plant Location & Profile Reference Bar */}
        <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block flex items-center space-x-1.5">
              <MapPin className="w-3 h-3 text-[#38BDF8]" />
              <span>Plant Location</span>
            </span>
            <span className="text-white font-bold block">Jojobera, PO-Rahargora</span>
            <span className="text-[10px] text-[#94A3B8]">Jamshedpur – 831016, Jharkhand</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block flex items-center space-x-1.5">
              <Zap className="w-3 h-3 text-[#38BDF8]" />
              <span>Installed Plant Capacity</span>
            </span>
            <span className="text-[#38BDF8] font-bold text-sm block">427.5 MW</span>
            <span className="text-[10px] text-[#94A3B8]">Thermal Generation Portfolio</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block flex items-center space-x-1.5">
              <Calendar className="w-3 h-3 text-[#00FF41]" />
              <span>Jharkhand Operational Heritage</span>
            </span>
            <span className="text-[#00FF41] font-bold text-sm block">Established 1997</span>
            <span className="text-[10px] text-[#94A3B8]">First Tata Power Jharkhand Station</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block flex items-center space-x-1.5">
              <ShieldCheck className="w-3 h-3 text-[#38BDF8]" />
              <span>Data Authenticity</span>
            </span>
            <div className="pt-0.5">
              <SourceBadge type="VERIFIED_PLANT_PROFILE" size="xs" />
            </div>
            <span className="text-[10px] text-[#64748B]">Official Plant Profile Reference</span>
          </div>
        </div>
      </div>
    </section>
  );
};
