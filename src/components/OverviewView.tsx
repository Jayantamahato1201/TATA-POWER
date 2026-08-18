import React, { useState, useRef } from 'react';
import {
  Layers,
  Database,
  Bell,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  BarChart2,
  Calendar,
  ArrowRight,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Building,
  History,
  Zap,
  Leaf,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { HeroSection } from './HeroSection';
import { useData } from '../context/DataContext';
import { Dataset } from '../types';

interface OverviewViewProps {
  onNavigateToAnalytics: (datasetId?: string) => void;
  onNavigateToUpload: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToDataManagement: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateToAnalytics,
  onNavigateToUpload,
  onNavigateToAlerts,
  onNavigateToDataManagement,
}) => {
  const {
    overview,
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    alarmSummary,
    exportDatasetCSV,
    seedSampleDataset,
    isUploading,
    alarmSettings,
    deleteDataset,
    replaceDataset,
    appendDataset,
  } = useData();

  // State for expandable historical facts
  const [showSecondaryFacts, setShowSecondaryFacts] = useState(false);

  // State for dataset action modals
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [datasetToReplace, setDatasetToReplace] = useState<Dataset | null>(null);
  const [datasetToAppend, setDatasetToAppend] = useState<Dataset | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Hidden file inputs for replace / append
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const appendFileInputRef = useRef<HTMLInputElement | null>(null);

  // REAL Dynamic KPI calculations from database/backend ONLY
  const totalDatabaseRecords = datasets.reduce((sum, d) => sum + (d.totalRows || 0), 0);
  const activeDatasetCount = datasets.length;
  const isAlarmEnabled = alarmSettings?.systemEnabled !== false;
  const activeAlertsCount = isAlarmEnabled ? alarmSummary.active : 0;
  const criticalAlertsCount = isAlarmEnabled ? alarmSummary.critical : 0;
  const warningAlertsCount = isAlarmEnabled ? alarmSummary.warning : 0;

  // Detected telemetry channels
  const activeDatasetObj = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];
  const telemetryChannelsCount =
    activeDatasetObj?.detectedMetrics?.length ||
    overview?.detectedMetrics?.length ||
    datasets.reduce((max, d) => Math.max(max, d.detectedMetrics?.length || 0), 0);

  // Latest dataset
  const latestDataset = datasets.length > 0 ? datasets[0] : null;

  // Derive System Health strictly based on actual data
  const getSystemStatus = () => {
    if (datasets.length === 0 || totalDatabaseRecords === 0) {
      return {
        label: 'AWAITING DATA INGESTION',
        color: 'text-slate-400',
        bg: 'bg-slate-900/40 border-slate-800',
        dot: 'bg-slate-500',
        subtext: 'No active telemetry data uploaded',
      };
    }
    if (!isAlarmEnabled) {
      return {
        label: 'MONITORING STANDBY',
        color: 'text-slate-400',
        bg: 'bg-slate-800/40 border-slate-700',
        dot: 'bg-slate-400',
        subtext: 'Alarm evaluation paused by administrator',
      };
    }
    if (criticalAlertsCount > 0) {
      return {
        label: 'CRITICAL ATTENTION',
        color: 'text-rose-400',
        bg: 'bg-rose-950/20 border-rose-900/40',
        dot: 'bg-rose-500 animate-pulse',
        subtext: `${criticalAlertsCount} critical limit breach(es) detected`,
      };
    }
    if (warningAlertsCount > 0) {
      return {
        label: 'OPERATIONAL WARNING',
        color: 'text-amber-400',
        bg: 'bg-amber-950/20 border-amber-900/40',
        dot: 'bg-amber-400',
        subtext: `${warningAlertsCount} warning parameter(s) approaching limits`,
      };
    }
    return {
      label: 'SYSTEM HEALTHY',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-900/40',
      dot: 'bg-emerald-400',
      subtext: 'All operational metrics within nominal limits',
    };
  };

  const systemStatus = getSystemStatus();

  // Handle Delete Dataset with confirmation
  const handleConfirmDelete = async () => {
    if (!datasetToDelete) return;
    setIsDeleting(true);
    try {
      const ok = await deleteDataset(datasetToDelete.id);
      if (ok) {
        setActionFeedback({
          type: 'success',
          message: `Dataset "${datasetToDelete.name}" successfully deleted.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `Failed to delete dataset "${datasetToDelete.name}".`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error occurred during deletion.',
      });
    } finally {
      setIsDeleting(false);
      setDatasetToDelete(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Handle Replace Dataset file change
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !datasetToReplace) return;

    try {
      const result = await replaceDataset(datasetToReplace.id, file);
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: `Dataset "${datasetToReplace.name}" replaced successfully with new data.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: result.error || 'Failed to replace dataset.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to replace dataset.',
      });
    } finally {
      setDatasetToReplace(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Handle Append Dataset file change
  const handleAppendFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !datasetToAppend) return;

    try {
      const result = await appendDataset(datasetToAppend.id, file);
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: `Appended ${result.added || 0} rows to "${datasetToAppend.name}".`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: result.error || 'Failed to append data.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to append data.',
      });
    } finally {
      setDatasetToAppend(null);
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div id="overview-dashboard" className="w-full space-y-8 sm:space-y-10 pb-16">
      {/* Hidden File Inputs for Replace / Append actions */}
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />
      <input
        type="file"
        ref={appendFileInputRef}
        onChange={handleAppendFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      {/* ACTION FEEDBACK TOAST */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 1 — HERO / COMPANY IDENTITY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <HeroSection
        onNavigateToAnalytics={() => onNavigateToAnalytics()}
        onNavigateToUpload={onNavigateToUpload}
        onNavigateToAlerts={onNavigateToAlerts}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 2 — ABOUT JOJOBERA OPERATIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="about-jojobera-operations"
        className="w-full max-w-full rounded-2xl border border-[#1E293B] bg-[#0A101D] p-5 sm:p-7 lg:p-9 space-y-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
          <div className="min-w-0 max-w-full">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC] tracking-tight font-sans uppercase break-words">
                About Jojobera Operations
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] mt-1 font-normal break-words">
              Verified corporate profile and operational background · Tata Power Jojobera Thermal Power Station
            </p>
          </div>
          <div className="facility-badge-dark self-start sm:self-center shrink-0 inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-mono text-[#F1F5F9] bg-[#0F172A] border border-[#1E293B]">
            <Building className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <span className="font-semibold whitespace-nowrap">Facility Code: TP-JSR-JOJOBERA</span>
          </div>
        </div>

        {/* 5 Verified Corporate Facts in Clean Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Item 1: Location */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-semibold block">
                  Location
                </span>
                <span className="text-sm font-bold text-white leading-tight block">
                  Jojobera, Jamshedpur, Jharkhand
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
              Located in the industrial corridor of Jamshedpur, Jharkhand, India.
            </p>
          </div>

          {/* Item 2: Plant Capacity */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-semibold block">
                  Plant Capacity
                </span>
                <span className="text-sm font-bold text-white leading-tight block font-mono">
                  427.5 MW
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
              Total installed generation capacity across active thermal units.
            </p>
          </div>

          {/* Item 3: Tata Power Journey */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-semibold block">
                  Tata Power Journey
                </span>
                <span className="text-sm font-bold text-white leading-tight block">
                  Began at Jojobera in 1997
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
              Initiated after acquiring a 67.5 MW captive power unit from Tata Steel, subsequently expanded with additional units.
            </p>
          </div>

          {/* Item 4: Operational Role */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-3 md:col-span-1 lg:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-semibold block">
                  Operational Role
                </span>
                <span className="text-sm font-bold text-white leading-tight block">
                  Critical Regional Power Source
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
              Important power source dedicated to Jamshedpur municipal distribution and Tata Steel industrial operations.
            </p>
          </div>

          {/* Item 5: Technology */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-semibold block">
                  Technology & Emissions Optimization
                </span>
                <span className="text-sm font-bold text-white leading-tight block">
                  Advanced DE-NOx System
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-normal">
              The plant uses an advanced DE-NOx system designed to optimize combustion and reduce emissions, supporting environmental standards.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 3 — VERIFIED PLANT FACTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="verified-plant-facts" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#1E293B]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-md bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Verified Plant Facts
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Official annual performance metrics and operational milestones (Corporate records · Static reference values)
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSecondaryFacts(!showSecondaryFacts)}
            className="inline-flex items-center space-x-1 text-xs font-mono text-[#38BDF8] hover:text-[#7DD3FC] transition-colors py-1 cursor-pointer"
          >
            <span>{showSecondaryFacts ? 'Hide Historical Comparison' : 'View FY 2024-25 & FGD Details'}</span>
            {showSecondaryFacts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 4 Primary Premium Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Installed Plant Capacity */}
          <div
            id="fact-card-capacity"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Installed Capacity
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8]">
                RATED
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                427.5 MW
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                Installed Plant Capacity
              </p>
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono">
              Captive & Grid Generation
            </div>
          </div>

          {/* Card 2: Tata Power's Jojobera Journey Began */}
          <div
            id="fact-card-journey"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Operations Inception
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8]">
                HERITAGE
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                1997
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                Tata Power's Jojobera Journey Began
              </p>
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono">
              Commenced with 67.5 MW unit
            </div>
          </div>

          {/* Card 3: Plant Availability — FY 2025-26 */}
          <div
            id="fact-card-availability-fy26"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Plant Availability
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                FY 2025-26
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
                96.8%
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                Plant Availability — FY 2025-26
              </p>
            </div>
            <div className="text-[11px] text-emerald-400/80 font-mono">
              High operational reliability
            </div>
          </div>

          {/* Card 4: Sales — FY 2025-26 */}
          <div
            id="fact-card-sales-fy26"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Annual Power Sales
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-500/30">
                FY 2025-26
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 tracking-tight font-mono">
                2,880 MUs
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
                Sales — FY 2025-26
              </p>
            </div>
            <div className="text-[11px] text-sky-400/80 font-mono">
              Million Units Delivered
            </div>
          </div>
        </div>

        {/* Expandable Secondary Facts Area */}
        {showSecondaryFacts && (
          <div className="p-5 rounded-xl bg-[#0B132B]/60 border border-[#1E293B] space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-bold">
                Secondary Performance & Sustainability Benchmarks
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                Corporate Reference Data
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Secondary 1: FY 2024-25 Availability */}
              <div className="p-4 rounded-lg bg-[#0F172A] border border-[#1E293B]">
                <div className="text-xs font-mono text-[#94A3B8]">Plant Availability — FY 2024-25</div>
                <div className="text-xl font-bold text-white font-mono mt-1">95.1%</div>
                <div className="text-[11px] text-[#CBD5E1] mt-1">Previous financial year operational availability benchmark</div>
              </div>

              {/* Secondary 2: FY 2024-25 Sales */}
              <div className="p-4 rounded-lg bg-[#0F172A] border border-[#1E293B]">
                <div className="text-xs font-mono text-[#94A3B8]">Sales — FY 2024-25</div>
                <div className="text-xl font-bold text-white font-mono mt-1">2,904 MUs</div>
                <div className="text-[11px] text-[#CBD5E1] mt-1">Million Units generation delivered in FY 2024-25</div>
              </div>

              {/* Secondary 3: FGD Sustainability Work */}
              <div className="p-4 rounded-lg bg-[#0F172A] border border-[#1E293B]">
                <div className="text-xs font-mono text-emerald-400 font-bold flex items-center space-x-1.5">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>FGD Sustainability Progress</span>
                </div>
                <div className="text-sm font-bold text-white mt-1">Emissions Compliance & Long-Term Sustainability</div>
                <div className="text-[11px] text-[#CBD5E1] mt-1">
                  Flue Gas Desulphurization (FGD) work is progressing to support emissions compliance and long-term environmental sustainability.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 4 — LIVE PLATFORM / DATABASE STATUS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="live-platform-status" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#1E293B]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Live Platform & Database Status
              </h2>
              <p className="text-xs text-[#CBD5E1]">
                Real dynamic parameters calculated strictly from stored database telemetry records
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              Storage: <strong className="text-white">Active Database</strong>
            </span>
          </div>
        </div>

        {/* Dynamic KPI Cards Grid (Total Records, Active Datasets, Telemetry Channels, Active Alerts, Critical Alerts, Warning Alerts, Latest Dataset, System Health) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Records */}
          <div
            id="dyn-kpi-total-records"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0284C7]/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Total Records
              </span>
              <div className="p-2 rounded-lg bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {totalDatabaseRecords.toLocaleString()}
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1">
                Total rows stored in database
              </p>
            </div>
            <div className="text-[11px] text-[#38BDF8] font-mono">
              {datasets.length > 0
                ? `${totalDatabaseRecords.toLocaleString()} telemetry observations`
                : 'No data stored'}
            </div>
          </div>

          {/* KPI 2: Active Datasets */}
          <div
            id="dyn-kpi-active-datasets"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Active Datasets
              </span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {activeDatasetCount}
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1">
                Authorized uploaded datasets
              </p>
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono">
              {datasets.length > 0 ? `${datasets.length} file(s) available` : '0 datasets'}
            </div>
          </div>

          {/* KPI 3: Telemetry Channels */}
          <div
            id="dyn-kpi-telemetry-channels"
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Telemetry Channels
              </span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <Sliders className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {telemetryChannelsCount}
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1">
                Detected numeric metrics
              </p>
            </div>
            <div className="text-[11px] text-[#38BDF8] font-mono">
              {telemetryChannelsCount > 0 ? 'Independently monitored' : 'No channels'}
            </div>
          </div>

          {/* KPI 4: Active Alerts (with Critical & Warning counts) */}
          <div
            id="dyn-kpi-active-alerts"
            onClick={onNavigateToAlerts}
            className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider font-semibold">
                Active Alerts
              </span>
              <div
                className={`p-2 rounded-lg border group-hover:scale-105 transition-transform ${
                  activeAlertsCount > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono flex items-center space-x-2">
                <span>{activeAlertsCount}</span>
                {criticalAlertsCount > 0 && (
                  <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                    {criticalAlertsCount} Critical
                  </span>
                )}
              </div>
              <p className="text-xs text-[#CBD5E1] mt-1">
                {criticalAlertsCount} Critical • {warningAlertsCount} Warning
              </p>
            </div>
            <div className="text-[11px] text-amber-400 font-mono flex items-center space-x-1">
              <span>View Alert Center &rarr;</span>
            </div>
          </div>
        </div>

        {/* Secondary Row for Latest Dataset and System Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Latest Dataset Banner */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-[#1E293B] text-[#94A3B8]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#64748B] font-semibold block">
                  Latest Dataset
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {latestDataset ? latestDataset.name : 'No dataset loaded'}
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-[#94A3B8]">
              {latestDataset ? (
                <>
                  <div>{latestDataset.totalRows?.toLocaleString()} records</div>
                  <div className="text-[#64748B]">{latestDataset.uploadDate || 'Recent'}</div>
                </>
              ) : (
                <span className="text-[#64748B]">None</span>
              )}
            </div>
          </div>

          {/* System Health Status */}
          <div className={`p-4 rounded-xl bg-[#0F172A] border flex items-center justify-between ${systemStatus.bg}`}>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-black/30 border border-[#1E293B]">
                <ShieldCheck className={`w-4 h-4 ${systemStatus.color}`} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#94A3B8] font-semibold block">
                  System Health
                </span>
                <span className={`text-xs sm:text-sm font-bold flex items-center space-x-1.5 ${systemStatus.color}`}>
                  <span className={`w-2 h-2 rounded-full ${systemStatus.dot}`} />
                  <span>{systemStatus.label}</span>
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-[#94A3B8]">
              {systemStatus.subtext}
            </div>
          </div>
        </div>

        {/* Empty State Banner when no datasets exist */}
        {datasets.length === 0 && (
          <div className="p-8 sm:p-10 rounded-xl bg-[#0F172A] border border-[#1E293B] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] text-[#38BDF8] flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-white">No Telemetry Data Uploaded Yet</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                No telemetry data uploaded yet. Upload a CSV or Excel file to begin operational analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onNavigateToUpload}
                className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV or Excel File</span>
              </button>
              <button
                onClick={seedSampleDataset}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[#38BDF8] text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading Sample...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Jojobera 427.5MW Dataset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 5 — DATASET OVERVIEW
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="dataset-overview" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#1E293B]">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <span>Dataset Overview</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Permanently stored backend telemetry datasets and operational equipment records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToUpload}
              className="px-3 py-1.5 rounded-md bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest New Dataset</span>
            </button>
            <button
              onClick={onNavigateToDataManagement}
              className="px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[36px]"
            >
              <span>Data Management &rarr;</span>
            </button>
          </div>
        </div>

        {/* Datasets Table */}
        {datasets.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0F172A] border border-[#1E293B] text-center text-xs font-mono text-[#94A3B8]">
            No datasets stored in backend. Ingest a telemetry dataset to view records and execute analytics.
          </div>
        ) : (
          <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0F172A]">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#0A1124] text-[#94A3B8] font-mono uppercase text-[11px] border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Dataset Name</th>
                  <th className="px-4 py-3 font-semibold">Upload Date</th>
                  <th className="px-4 py-3 font-semibold">Number of Records</th>
                  <th className="px-4 py-3 font-semibold">Detected Metrics</th>
                  <th className="px-4 py-3 font-semibold">File Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 text-[#CBD5E1]">
                {datasets.map((dataset) => {
                  const isCurrent = dataset.id === selectedDatasetId;
                  const detectedMetricsList = (dataset.detectedMetrics || [])
                    .filter((m: any) => typeof m === 'string' || (m && m.dataType === 'numeric'))
                    .map((m: any) => (typeof m === 'string' ? m : m.displayName || m.name));

                  // Determine file type representation
                  const fileType =
                    dataset.fileType?.toUpperCase() ||
                    (dataset.fileName?.endsWith('.xlsx') ? 'XLSX' : dataset.fileName?.endsWith('.xls') ? 'XLS' : 'CSV');

                  return (
                    <tr
                      key={dataset.id}
                      className={`hover:bg-[#141E33] transition-colors ${
                        isCurrent ? 'bg-[#0284C7]/5' : ''
                      }`}
                    >
                      {/* Dataset Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <Database
                            className={`w-4 h-4 shrink-0 ${
                              isCurrent ? 'text-[#38BDF8]' : 'text-[#64748B]'
                            }`}
                          />
                          <div>
                            <div className="font-semibold text-white flex items-center space-x-1.5">
                              <span>{dataset.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0284C7] text-white font-mono uppercase font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              {dataset.fileName || dataset.category || 'Thermal Telemetry'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8] whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{dataset.uploadDate || 'Recent'}</span>
                        </div>
                      </td>

                      {/* Number of Records */}
                      <td className="px-4 py-3.5 font-mono">
                        <span className="font-bold text-white">
                          {(dataset.totalRows || dataset.recordsCount || 0).toLocaleString()}
                        </span>
                        <span className="text-[#64748B] ml-1">rows</span>
                      </td>

                      {/* Detected Metrics */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {detectedMetricsList.slice(0, 3).map((metricName: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[#1E293B] text-[10px] font-mono text-[#94A3B8]"
                            >
                              {metricName}
                            </span>
                          ))}
                          {detectedMetricsList.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[10px] font-mono text-[#38BDF8]">
                              +{detectedMetricsList.length - 3} more
                            </span>
                          )}
                          {detectedMetricsList.length === 0 && (
                            <span className="text-[10px] font-mono text-[#64748B]">Auto-detected</span>
                          )}
                        </div>
                      </td>

                      {/* File Type */}
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                        <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[10px] font-bold text-[#CBD5E1]">
                          {fileType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>PERSISTED</span>
                        </span>
                      </td>

                      {/* Available Actions: VIEW, UPDATE / REPLACE, APPEND DATA, DOWNLOAD, DELETE */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* VIEW Action */}
                          <button
                            onClick={() => {
                              setSelectedDatasetId(dataset.id);
                              onNavigateToAnalytics(dataset.id);
                            }}
                            className="px-2.5 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                            title="View Detailed Analytics"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* UPDATE / REPLACE Action */}
                          <button
                            onClick={() => {
                              setDatasetToReplace(dataset);
                              if (replaceFileInputRef.current) replaceFileInputRef.current.click();
                            }}
                            className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] hover:text-white font-medium text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Replace / Update dataset with new file"
                          >
                            <RefreshCw className="w-3 h-3 text-[#38BDF8]" />
                            <span className="hidden xl:inline">Replace</span>
                          </button>

                          {/* APPEND DATA Action */}
                          <button
                            onClick={() => {
                              setDatasetToAppend(dataset);
                              if (appendFileInputRef.current) appendFileInputRef.current.click();
                            }}
                            className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] hover:text-white font-medium text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Append additional rows to dataset"
                          >
                            <Plus className="w-3 h-3 text-emerald-400" />
                            <span className="hidden xl:inline">Append</span>
                          </button>

                          {/* DOWNLOAD Action */}
                          <button
                            onClick={() => exportDatasetCSV(dataset.id)}
                            className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* DELETE Action with Confirmation */}
                          <button
                            onClick={() => setDatasetToDelete(dataset)}
                            className="p-1 rounded bg-[#1E293B] hover:bg-rose-900/60 text-[#94A3B8] hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DELETE CONFIRMATION MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {datasetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Dataset Deletion</h3>
                <p className="text-xs text-[#94A3B8]">Permanent storage removal</p>
              </div>
            </div>

            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Are you sure you want to permanently delete dataset{' '}
              <strong className="text-white">"{datasetToDelete.name}"</strong>?
              This will remove all associated telemetry records and cannot be undone.
            </p>

            <div className="p-3 bg-[#070D18] rounded-lg border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] space-y-1">
              <div>Records: <strong className="text-white">{datasetToDelete.totalRows?.toLocaleString()}</strong></div>
              <div>Upload Date: <strong className="text-white">{datasetToDelete.uploadDate || 'Recent'}</strong></div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDatasetToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
