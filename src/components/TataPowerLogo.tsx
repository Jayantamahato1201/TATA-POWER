import React from 'react';

interface TataPowerLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'badge' | 'hero' | 'standalone';
  className?: string;
  showSubtitle?: boolean;
  subtitleText?: string;
  colorScheme?: 'brand' | 'white' | 'monochrome' | 'tata-blue';
}

/**
 * Official Tata Logo Image Component
 * Uses the exact uploaded Tata Logo (Emblem + TATA Wordmark in Tata Royal Blue #205CA5)
 */
export const TataLogoImage: React.FC<{
  className?: string;
  alt?: string;
}> = ({ className = 'h-10 w-auto', alt = 'TATA Logo' }) => {
  return (
    <img
      src="/tata-logo.svg"
      alt={alt}
      className={`object-contain ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};

/**
 * Complete Official Tata Power Brand Identity Logo
 */
export const TataPowerLogo: React.FC<TataPowerLogoProps> = ({
  variant = 'full',
  className = '',
  showSubtitle = true,
  subtitleText = 'JAMSHEDPUR OPERATIONS · 427.5 MW',
}) => {
  if (variant === 'standalone') {
    return (
      <div className={`inline-flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm border border-[#205CA5]/30 ${className}`}>
        <TataLogoImage className="h-16 w-auto" />
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        title="Tata Power - Lighting Up Lives"
      >
        <div className="w-full h-full p-1.5 rounded-sm bg-white border border-[#205CA5]/40 shadow-[0_0_15px_rgba(32,92,165,0.35)] flex items-center justify-center">
          <TataLogoImage className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-xs bg-[#070D18] border border-[#1E293B] border-l-2 border-l-[#205CA5] ${className}`}>
        <div className="w-7 h-6 p-0.5 bg-white rounded-xs flex items-center justify-center shrink-0">
          <TataLogoImage className="w-full h-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black tracking-widest text-white font-mono uppercase leading-tight">
            TATA POWER
          </span>
          <span className="text-[9px] text-[#38BDF8] font-mono tracking-wider uppercase leading-tight">
            Jojobera Station
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 ${className}`}>
        {/* Official White Tata Logo Badge */}
        <div className="p-3 sm:p-4 rounded-md bg-white border-2 border-[#205CA5] shadow-[0_0_35px_rgba(32,92,165,0.4)] flex flex-col items-center justify-center shrink-0">
          <TataLogoImage className="h-16 sm:h-20 w-auto" />
        </div>

        {/* Typographic Identity Block */}
        <div className="flex flex-col text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <span className="text-2xl sm:text-4xl font-black tracking-[0.16em] text-white uppercase">
              TATA POWER
            </span>
          </div>
          <div className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#38BDF8] uppercase font-mono mt-0.5">
            Lighting Up Lives · Jojobera Station
          </div>
          <div className="text-[11px] text-[#94A3B8] font-mono mt-1 tracking-wider uppercase flex items-center justify-center sm:justify-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
            <span>427.5 MW THERMAL POWER GENERATION ECOSYSTEM</span>
          </div>
        </div>
      </div>
    );
  }

  // Default 'full' or 'compact' variant (Used in Navbar, Footers, Modals)
  return (
    <div className={`flex items-center space-x-2 sm:space-x-3 select-none min-w-0 ${className}`}>
      {/* Official Tata Brand Logo Image Box */}
      <div className="h-8 sm:h-10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm bg-white border border-[#205CA5]/50 flex items-center justify-center shadow-[0_0_15px_rgba(32,92,165,0.35)] shrink-0 transition-transform duration-200 hover:scale-105">
        <TataLogoImage className="h-5 sm:h-7 w-auto" />
      </div>

      {/* Brand Typographic Title */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
          <span className="font-black text-xs sm:text-sm md:text-base tracking-[0.12em] sm:tracking-[0.16em] text-white uppercase whitespace-nowrap">
            TATA POWER
          </span>
          <span className="text-[#38BDF8] font-normal text-[11px] sm:text-xs md:text-sm tracking-wider whitespace-nowrap hidden xs:inline">
            | JAMSHEDPUR
          </span>
        </div>
        {showSubtitle && (
          <div className="hidden sm:flex items-center space-x-1.5 mt-0.5 min-w-0">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse shrink-0" />
            <p className="text-[10px] text-[#94A3B8] font-mono tracking-wider uppercase truncate">
              {subtitleText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

