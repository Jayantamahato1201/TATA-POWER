import React from 'react';
import { Globe, Zap, Leaf, Users, Layers, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { SourceBadge } from '../SourceBadge';

export const CorporateContextSection: React.FC = () => {
  return (
    <section
      id="corporate-context-section"
      className="relative py-10 sm:py-14 border-t border-[#1E293B] w-full"
    >
      <div className="w-full space-y-8">
        {/* Section Header with verified source badge */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#0F172A] border-l-2 border-l-[#205CA5] border-y border-r border-[#1E293B] text-[#38BDF8] text-xs font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest font-semibold">TATA POWER ENTERPRISE</span>
              </div>
              <SourceBadge type="VERIFIED_CORPORATE_INFO" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-sans">
              Tata Power at a Glance
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-light">
              Official company-wide reference metrics representing Tata Power's nationwide utility footprint.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xs bg-[#0A1124] border border-[#1E293B] font-mono text-xs text-[#94A3B8] self-start lg:self-end">
            <span className="text-[#38BDF8] font-bold">CORPORATE SNAPSHOT</span> | FY2025-26
          </div>
        </div>

        {/* 5 Verified Corporate Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Metric 1 */}
          <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-[#205CA5]/70 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Total Generation</span>
              <Zap className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                16,716 <span className="text-sm text-[#38BDF8] font-sans">MW</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Total Generation Operational Capacity
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#64748B] pt-2 border-t border-[#1E293B]">
              FY2025-26 VERIFIED
            </div>
          </div>

          {/* Metric 2 */}
          <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-[#00FF41]/60 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Clean & Green</span>
              <Leaf className="w-4 h-4 text-[#00FF41]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#00FF41] font-mono">
                7,856 <span className="text-sm font-sans">MW</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Clean and Green Operational Capacity
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#64748B] pt-2 border-t border-[#1E293B]">
              FY2025-26 VERIFIED
            </div>
          </div>

          {/* Metric 3 */}
          <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-teal-500/60 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Clean Energy Share</span>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-teal-300 font-mono">
                47%
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Clean & Green Share in Operational Portfolio
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#64748B] pt-2 border-t border-[#1E293B]">
              OPERATIONAL PORTFOLIO
            </div>
          </div>

          {/* Metric 4 */}
          <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-sky-500/60 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Customer Reach</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
                13.1+ <span className="text-sm font-sans">M</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Distribution Customer Base
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#64748B] pt-2 border-t border-[#1E293B]">
              DISTRIBUTION NETWORK
            </div>
          </div>

          {/* Metric 5 */}
          <div className="p-5 rounded-sm bg-[#0A1124] border border-[#1E293B] hover:border-[#205CA5]/70 transition-all flex flex-col justify-between space-y-3 shadow-lg sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Transmission Network</span>
              <Layers className="w-4 h-4 text-[#93C5FD]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#93C5FD] font-mono">
                7,403 <span className="text-sm font-sans">ckm</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Total Transmission Portfolio as of March 31, 2026*
              </p>
            </div>
            <div className="text-[9px] font-mono text-[#64748B] pt-2 border-t border-[#1E293B]">
              *INCL. UNDER-CONSTRUCTION
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
