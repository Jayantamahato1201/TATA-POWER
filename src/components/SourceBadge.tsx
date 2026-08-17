import React from 'react';
import { Shield, Building, Database, Calculator, Settings, AlertCircle, Info, Sparkles } from 'lucide-react';

export type SourceType =
  | 'VERIFIED_PLANT_PROFILE'
  | 'VERIFIED_CORPORATE_INFO'
  | 'USER_UPLOADED_TELEMETRY'
  | 'CALCULATED_FROM_DATASET'
  | 'CONFIGURED_BY_ADMIN'
  | 'PLATFORM_CAPABILITY'
  | 'AWAITING_TELEMETRY';

interface SourceBadgeProps {
  type: SourceType;
  customText?: string;
  size?: 'xs' | 'sm';
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  type,
  customText,
  size = 'xs',
  className = '',
}) => {
  const configs: Record<
    SourceType,
    { text: string; bg: string; border: string; textCol: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    VERIFIED_PLANT_PROFILE: {
      text: 'VERIFIED PLANT PROFILE',
      bg: 'bg-[#205CA5]/15',
      border: 'border-[#205CA5]/40',
      textCol: 'text-[#93C5FD]',
      icon: Building,
    },
    VERIFIED_CORPORATE_INFO: {
      text: 'CORPORATE REFERENCE INFORMATION',
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-700/40',
      textCol: 'text-indigo-300',
      icon: Shield,
    },
    USER_UPLOADED_TELEMETRY: {
      text: 'USER-UPLOADED TELEMETRY',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-700/40',
      textCol: 'text-emerald-300',
      icon: Database,
    },
    CALCULATED_FROM_DATASET: {
      text: 'CALCULATED FROM CURRENT DATASET',
      bg: 'bg-sky-950/40',
      border: 'border-sky-700/40',
      textCol: 'text-sky-300',
      icon: Calculator,
    },
    CONFIGURED_BY_ADMIN: {
      text: 'CONFIGURED BY AUTHORISED STAFF',
      bg: 'bg-amber-950/40',
      border: 'border-amber-700/40',
      textCol: 'text-amber-300',
      icon: Settings,
    },
    PLATFORM_CAPABILITY: {
      text: 'PLATFORM CAPABILITY',
      bg: 'bg-slate-900/80',
      border: 'border-slate-700/50',
      textCol: 'text-slate-300',
      icon: Sparkles,
    },
    AWAITING_TELEMETRY: {
      text: 'AWAITING TELEMETRY DATA',
      bg: 'bg-slate-950/60',
      border: 'border-slate-800',
      textCol: 'text-slate-400',
      icon: Info,
    },
  };

  const config = configs[type] || configs.PLATFORM_CAPABILITY;
  const Icon = config.icon;
  const displayText = customText || config.text;

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[9.5px] tracking-wider'
      : 'px-2.5 py-1 text-[11px] tracking-widest';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-xs font-mono font-semibold uppercase border ${config.bg} ${config.border} ${config.textCol} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{displayText}</span>
    </span>
  );
};
