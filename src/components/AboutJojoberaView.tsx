import React from 'react';
import {
  MapPin,
  Calendar,
  Zap,
  Leaf,
  Shield,
  Activity,
  Globe,
  Users,
  Building,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { TataPowerLogo } from './TataPowerLogo';
import { SourceBadge } from './SourceBadge';

export const AboutJojoberaView: React.FC = () => {
  return (
    <div id="about-jojobera-page" className="py-4 sm:py-8 space-y-10 sm:space-y-16 w-full">
      {/* SECTION 1: TATA POWER CORPORATE AT A GLANCE */}
      <section className="relative rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#205CA5] p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl w-full">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#205CA5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-[#1E293B]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">TATA POWER ENTERPRISE</span>
              </div>
              <SourceBadge type="VERIFIED_CORPORATE_INFO" />
            </div>

            <TataPowerLogo
              variant="full"
              subtitleText="Pioneering Integrated Power Utility"
              className="py-1"
            />

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase mt-2">
              Tata Power at a Glance
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl font-light">
              Official company-wide reference metrics representing Tata Power's nationwide utility footprint.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xs bg-[#070D18] border border-[#1E293B] text-xs text-[#94A3B8] font-mono self-start lg:self-center">
            <span className="text-[#38BDF8] font-bold">CORPORATE SNAPSHOT</span> | FY2025-26
          </div>
        </div>

        {/* Corporate Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
          <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] hover:border-[#205CA5]/70 transition-all space-y-2">
            <div className="text-[#94A3B8] text-[10px] uppercase">Total Generation</div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              16,716 <span className="text-sm text-[#38BDF8] font-sans">MW</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">Total Generation Operational Capacity</p>
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">FY2025-26 VERIFIED</div>
          </div>

          <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] hover:border-[#00FF41]/60 transition-all space-y-2">
            <div className="text-[#94A3B8] text-[10px] uppercase">Clean & Green</div>
            <div className="text-2xl sm:text-3xl font-black text-[#00FF41]">
              7,856 <span className="text-sm font-sans">MW</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">Clean and Green Operational Capacity</p>
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">FY2025-26 VERIFIED</div>
          </div>

          <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] hover:border-teal-500/60 transition-all space-y-2">
            <div className="text-[#94A3B8] text-[10px] uppercase">Clean Energy Share</div>
            <div className="text-2xl sm:text-3xl font-black text-teal-300">47%</div>
            <p className="text-[11px] text-[#94A3B8] font-sans">Share in Operational Portfolio</p>
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">OPERATIONAL PORTFOLIO</div>
          </div>

          <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] hover:border-sky-500/60 transition-all space-y-2">
            <div className="text-[#94A3B8] text-[10px] uppercase">Customer Base</div>
            <div className="text-2xl sm:text-3xl font-black text-sky-400">
              13.1+ <span className="text-sm font-sans">M</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">Distribution Customer Base</p>
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">DISTRIBUTION NETWORK</div>
          </div>

          <div className="p-5 rounded-xs bg-[#070D18] border border-[#1E293B] hover:border-[#205CA5]/70 transition-all space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="text-[#94A3B8] text-[10px] uppercase">Transmission Network</div>
            <div className="text-2xl sm:text-3xl font-black text-[#93C5FD]">
              7,403 <span className="text-sm font-sans">ckm</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">Total Transmission Portfolio*</p>
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">*INCL. UNDER-CONSTRUCTION</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: JOJOBERA THERMAL POWER PLANT STORY & PROFILE */}
      <section className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Building className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">PLANT PROFILE</span>
              </div>
              <SourceBadge type="VERIFIED_PLANT_PROFILE" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
              About Jojobera
            </h2>
            <p className="text-base text-[#CBD5E1] mt-2 font-light leading-relaxed">
              Tata Power's journey in Jharkhand began with the Jojobera Thermal Power Station in 1997. Located in Jojobera, Jharkhand, the station has a plant capacity of 427.5 MW and forms an important part of Tata Power's thermal generation portfolio.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xs bg-[#070D18] border border-[#1E293B] text-xs font-mono text-[#94A3B8]">
            INSTALLED CAPACITY: <span className="text-[#38BDF8] font-bold">427.5 MW</span>
          </div>
        </div>

        {/* Jojobera Key Plant Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#205CA5] flex items-start space-x-4">
            <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#38BDF8]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-[#94A3B8] font-mono uppercase">Plant Capacity</span>
              <h3 className="text-2xl font-bold text-white font-mono">427.5 MW</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Total Installed Capacity</p>
            </div>
          </div>

          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-sky-500 flex items-start space-x-4">
            <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B] text-sky-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-[#94A3B8] font-mono uppercase">Operational Journey</span>
              <h3 className="text-2xl font-bold text-white font-mono">Since 1997</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Tata Power in Jharkhand</p>
            </div>
          </div>

          <div className="p-6 rounded-sm bg-[#0A1124] border border-[#1E293B] border-l-4 border-l-[#00FF41] flex items-start space-x-4">
            <div className="p-3 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#00FF41]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-[#94A3B8] font-mono uppercase">Plant Location</span>
              <h3 className="text-xl font-bold text-white font-mono">Jojobera, Jharkhand</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Jamshedpur Region</p>
            </div>
          </div>
        </div>

        {/* Narrative Details */}
        <div className="p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2 font-mono uppercase">
            <Activity className="w-5 h-5 text-[#38BDF8]" />
            <span>Station Evolution & Strategic Role</span>
          </h3>

          <div className="space-y-4 text-sm text-[#CBD5E1] leading-relaxed font-light">
            <p>
              The company's Jharkhand presence began with the acquisition of a 67.5 MW captive power unit from Tata Steel. Tata Power subsequently expanded the Jojobera operation by adding five more units in response to growing power requirements.
            </p>
            <p>
              According to Tata Power, Jojobera is a vital source of energy for Jamshedpur and Tata Steel. The plant also represents Tata Power's focus on operational technology, including the use of an advanced DE-NOx system to optimise combustion and reduce emissions.
            </p>
          </div>
        </div>

        {/* Technology and Innovation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] space-y-4">
            <div className="p-3 w-fit rounded-xs bg-[#070D18] border border-[#00FF41]/40 text-[#00FF41]">
              <Leaf className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase font-mono">Advanced DE-NOx Technology</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed font-light">
              The Jojobera plant is recognized as the first in the industry to use an advanced DE-NOx system to optimise combustion and curb emissions.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-[#CBD5E1] font-mono">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0" />
                <span>Combustion process optimization</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0" />
                <span>Reduction in nitrogen oxide (NOx) emissions</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0" />
                <span>Industry-first environmental implementation</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] space-y-4">
            <div className="p-3 w-fit rounded-xs bg-[#070D18] border border-[#205CA5]/50 text-[#38BDF8]">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase font-mono">Plant Location & Context</h3>
            <div className="p-4 rounded-xs bg-[#070D18] border border-[#1E293B] text-sm font-mono text-[#E2E8F0] leading-loose">
              <p className="font-bold text-white">Tata Power Jojobera Power Plant</p>
              <p>PO-Rahargora</p>
              <p>Jamshedpur – 831016</p>
              <p>Jharkhand, India</p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <SourceBadge type="VERIFIED_PLANT_PROFILE" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
