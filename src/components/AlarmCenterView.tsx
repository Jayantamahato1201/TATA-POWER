import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  Sliders,
  Shield,
  Search,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Settings,
  Flame,
  Zap,
  Activity,
  Radio,
  Gauge,
  Check,
  X,
  Power,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { AlarmRule, AlarmCondition, AlarmLevel, AlarmEvent } from '../types';

export const AlarmCenterView: React.FC = () => {
  const {
    alarmRules,
    alarmEvents,
    alarmSummary,
    alarmSettings,
    toggleAlarmSystem,
    acknowledgeAlarm,
    resolveAlarm,
    clearAlarm,
    clearAlarmsBatch,
    clearAllAlarms,
    saveAlarmRule,
    deleteAlarmRule,
    reEvaluateAlarms,
    exportAlarmsCSV,
    audioSettings,
    updateAudioSettings,
    testAudioAlert,
    toggleAudioMute,
  } = useData();

  const { isStaff, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'events' | 'rules'>('events');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'ACTIVE' | 'CRITICAL' | 'WARNING' | 'RESOLVED' | 'CLEARED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isEditingRule, setIsEditingRule] = useState<boolean>(false);
  const [isReEvaluating, setIsReEvaluating] = useState<boolean>(false);
  const [isTogglingAlarm, setIsTogglingAlarm] = useState<boolean>(false);
  const [audioTestingState, setAudioTestingState] = useState<string | null>(null);

  const [editingRule, setEditingRule] = useState<Partial<AlarmRule>>({
    name: '',
    metricColumn: 'temperature',
    equipmentScope: 'ALL',
    condition: 'GT',
    thresholdValue: 30,
    alarmLevel: 'CRITICAL',
    customColor: '#EF4444',
    priority: 1,
    isEnabled: true,
  });

  const [resolveModalOpen, setResolveModalOpen] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const isAlarmSystemOn = alarmSettings?.systemEnabled !== false;

  // Filter events
  const filteredEvents = alarmEvents.filter((event) => {
    if (severityFilter === 'ACTIVE' && (event.status === 'RESOLVED' || event.status === 'CLEARED')) return false;
    if (severityFilter === 'CRITICAL' && (event.alarmLevel !== 'CRITICAL' || event.status === 'RESOLVED' || event.status === 'CLEARED')) return false;
    if (severityFilter === 'WARNING' && (event.alarmLevel !== 'WARNING' || event.status === 'RESOLVED' || event.status === 'CLEARED')) return false;
    if (severityFilter === 'RESOLVED' && event.status !== 'RESOLVED') return false;
    if (severityFilter === 'CLEARED' && event.status !== 'CLEARED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMetric = event.ruleName?.toLowerCase().includes(q);
      const matchEq = event.equipmentId?.toLowerCase().includes(q);
      const matchMsg = event.message?.toLowerCase().includes(q);
      if (!matchMetric && !matchEq && !matchMsg) return false;
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEvents.map((e) => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsClearing(true);
    await clearAlarmsBatch(selectedIds);
    setSelectedIds([]);
    setIsClearing(false);
  };

  const handleClearAllFiltered = async () => {
    const count = filteredEvents.filter((e) => e.status !== 'CLEARED').length;
    if (count === 0) return;
    if (!window.confirm(`Are you sure you want to mark ${count} alert(s) as CLEARED? This will update status in MongoDB while preserving audit records.`)) {
      return;
    }
    setIsClearing(true);
    const idsToClear = filteredEvents.filter((e) => e.status !== 'CLEARED').map((e) => e.id);
    await clearAlarmsBatch(idsToClear);
    setSelectedIds([]);
    setIsClearing(false);
  };

  const handleToggleAlarmSystem = async () => {
    setIsTogglingAlarm(true);
    await toggleAlarmSystem(!isAlarmSystemOn);
    setIsTogglingAlarm(false);
  };

  const handleTestAudio = (severity: 'CRITICAL' | 'WARNING') => {
    setAudioTestingState(severity);
    testAudioAlert(severity);
    setTimeout(() => {
      setAudioTestingState(null);
    }, 2000);
  };

  const handleReEvaluate = async () => {
    setIsReEvaluating(true);
    await reEvaluateAlarms();
    setIsReEvaluating(false);
  };

  const handleCreateOrUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule.name || !editingRule.metricColumn || editingRule.thresholdValue === undefined) {
      alert('Please provide rule name, metric column, and threshold value');
      return;
    }

    const success = await saveAlarmRule(editingRule);
    if (success) {
      setIsEditingRule(false);
      setEditingRule({
        name: '',
        metricColumn: 'temperature',
        equipmentScope: 'ALL',
        condition: 'GT',
        thresholdValue: 30,
        alarmLevel: 'CRITICAL',
        customColor: '#EF4444',
        priority: 1,
        isEnabled: true,
      });
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveModalOpen) return;
    await resolveAlarm(resolveModalOpen, resolveNotes);
    setResolveModalOpen(null);
    setResolveNotes('');
  };

  const getMetricIcon = (metricColumn: string) => {
    const col = metricColumn?.toLowerCase() || '';
    if (col.includes('temp')) return <Flame className="w-4 h-4 text-rose-400" />;
    if (col.includes('volt') || col.includes('power')) return <Zap className="w-4 h-4 text-amber-400" />;
    if (col.includes('freq')) return <Radio className="w-4 h-4 text-emerald-400" />;
    if (col.includes('press')) return <Gauge className="w-4 h-4 text-cyan-400" />;
    return <Activity className="w-4 h-4 text-[#38BDF8]" />;
  };

  return (
    <div id="alarm-center-container" className="w-full space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Alerts & Incident Management
            </h1>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Real-time threshold evaluation, alarm escalation, and incident resolution
          </p>
        </div>

        {/* Action Controls: Master Alarm Toggle + Re-evaluate + Audio */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Master Alarm System Toggle */}
          {(isAdmin || isStaff) && (
            <div className="flex items-center space-x-2 bg-[#070D18] px-3 py-1.5 rounded-lg border border-[#1E293B]">
              <span className="text-xs font-mono text-[#94A3B8]">Alarm System:</span>
              <button
                onClick={handleToggleAlarmSystem}
                disabled={isTogglingAlarm}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isAlarmSystemOn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
                title={isAlarmSystemOn ? 'Click to disable alarm monitoring' : 'Click to enable alarm monitoring'}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isAlarmSystemOn ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleAudioMute}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              audioSettings.masterEnabled
                ? 'bg-[#070D18] border-[#1E293B] text-[#38BDF8] hover:bg-[#1E293B]'
                : 'bg-rose-950/20 border-rose-900/40 text-rose-400'
            }`}
            title={audioSettings.masterEnabled ? 'Sound is Enabled (Click to Mute)' : 'Sound is Muted (Click to Unmute)'}
          >
            {audioSettings.masterEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Re-Evaluate Alarms Button */}
          <button
            onClick={handleReEvaluate}
            disabled={isReEvaluating}
            className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReEvaluating ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportAlarmsCSV(severityFilter)}
            className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* SYSTEM OFF WARNING BANNER */}
      {!isAlarmSystemOn && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Alarm System is currently Standby / Disabled.</strong> Telemetry data continues to be ingested and visualized, but notifications and alerts are suppressed.
            </span>
          </div>
          {(isAdmin || isStaff) && (
            <button
              onClick={handleToggleAlarmSystem}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black font-bold font-mono text-xs cursor-pointer ml-3 shrink-0"
            >
              Turn On Alarm System
            </button>
          )}
        </div>
      )}

      {/* 3 SUMMARY CARDS: CRITICAL, WARNING, NORMAL/RESOLVED */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CRITICAL CARD */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            severityFilter === 'CRITICAL'
              ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider">
              Critical Breaches
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {alarmSummary.critical}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">High-priority limit violations</p>
          </div>
          <div className="text-[11px] text-rose-400 font-mono flex items-center justify-between">
            <span>Requires immediate operator action</span>
            <span className="text-xs">&rarr;</span>
          </div>
        </div>

        {/* WARNING CARD */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'WARNING' ? 'ALL' : 'WARNING')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            severityFilter === 'WARNING'
              ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Operational Warnings
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {alarmSummary.warning}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Parameters approaching limits</p>
          </div>
          <div className="text-[11px] text-amber-400 font-mono flex items-center justify-between">
            <span>Monitor for drift or escalation</span>
            <span className="text-xs">&rarr;</span>
          </div>
        </div>

        {/* NORMAL / RESOLVED CARD */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            severityFilter === 'RESOLVED'
              ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Resolved & Compliant
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {alarmSummary.resolved}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Resolved operational incidents</p>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center justify-between">
            <span>Nominal plant baseline compliant</span>
            <span className="text-xs">&rarr;</span>
          </div>
        </div>
      </div>

      {/* FILTER & TAB BAR */}
      <div className="flex flex-col gap-3 p-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tab Toggle: Events vs Rules */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center rounded-lg bg-[#070D18] p-0.5 border border-[#1E293B]">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'events' ? 'bg-[#0284C7] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Alert Events ({alarmEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'rules' ? 'bg-[#0284C7] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Threshold Rules ({alarmRules.length})
              </button>
            </div>

            {/* Quick Filter Chips for Events */}
            {activeTab === 'events' && (
              <div className="hidden lg:flex items-center space-x-1.5">
                {(['ALL', 'ACTIVE', 'CRITICAL', 'WARNING', 'RESOLVED', 'CLEARED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      severityFilter === filter
                        ? 'bg-[#1E293B] text-white font-bold border border-slate-600'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search / Add Rule */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {activeTab === 'events' ? (
              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search alerts by metric or generator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#070D18] border border-[#1E293B] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#0284C7] min-h-[36px]"
                />
              </div>
            ) : (
              (isAdmin || isStaff) && (
                <button
                  onClick={() => {
                    setEditingRule({
                      name: '',
                      metricColumn: 'temperature',
                      equipmentScope: 'ALL',
                      condition: 'GT',
                      thresholdValue: 30,
                      alarmLevel: 'CRITICAL',
                      customColor: '#EF4444',
                      priority: 1,
                      isEnabled: true,
                    });
                    setIsEditingRule(true);
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Threshold Rule</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Action Toolbar for Alert Events: Selection & Batch Clearing */}
        {activeTab === 'events' && filteredEvents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E293B] text-xs font-mono">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 text-[#94A3B8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredEvents.length && filteredEvents.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-[#334155] bg-[#070D18] text-[#0284C7] focus:ring-0 cursor-pointer"
                />
                <span>Select All ({filteredEvents.length})</span>
              </label>
              {selectedIds.length > 0 && (
                <span className="text-[#38BDF8] font-bold">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleClearSelected}
                  disabled={isClearing}
                  className="px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 font-medium transition-colors cursor-pointer flex items-center space-x-1 min-h-[32px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Selected ({selectedIds.length})</span>
                </button>
              )}
              <button
                onClick={handleClearAllFiltered}
                disabled={isClearing}
                className="px-2.5 py-1.5 rounded bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer min-h-[32px]"
              >
                Clear All in View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT: ALARM EVENTS LIST */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-12 rounded-xl bg-[#0F172A] border border-[#1E293B] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">No Matching Alerts</p>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                All operational metrics are within configured nominal limits, or no events matched the current filter.
              </p>
            </div>
          ) : (
            filteredEvents.map((event, eventIdx) => {
              const isCritical = event.alarmLevel === 'CRITICAL';
              const isWarning = event.alarmLevel === 'WARNING';
              const isResolved = event.status === 'RESOLVED';
              const isCleared = event.status === 'CLEARED';
              const isAck = event.status === 'ACKNOWLEDGED';
              const isSelected = selectedIds.includes(event.id);

              return (
                <div
                  key={`${event.id || 'evt'}_${eventIdx}`}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 min-w-0 ${
                    isCleared
                      ? 'bg-[#0B132B]/40 border-slate-800 opacity-75'
                      : isResolved
                      ? 'bg-[#0F172A]/70 border-[#1E293B]'
                      : isCritical
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/50'
                      : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-500/50'
                  }`}
                >
                  {/* Left: Checkbox, Metric Icon, Name, Equipment & Description */}
                  <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(event.id)}
                      className="mt-2.5 rounded border-[#334155] bg-[#070D18] text-[#0284C7] focus:ring-0 cursor-pointer shrink-0"
                    />

                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        isCleared
                          ? 'bg-slate-800/40 border-slate-700 text-slate-400'
                          : isResolved
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : isCritical
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {getMetricIcon(event.metricColumn || '')}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Severity Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                            isCleared
                              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
                              : isResolved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isCritical
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {isCleared ? 'CLEARED' : isResolved ? 'RESOLVED' : isCritical ? 'CRITICAL' : 'WARNING'}
                        </span>

                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">{event.ruleName}</span>

                        {event.equipmentId && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#070D18] text-[#38BDF8] border border-[#1E293B]">
                            {event.equipmentId}
                          </span>
                        )}

                        {isAck && !isResolved && !isCleared && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-[#38BDF8] border border-sky-800/40">
                            Acknowledged by {event.acknowledgedBy || 'Operator'}
                          </span>
                        )}

                        {isCleared && event.clearedBy && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                            Cleared by {event.clearedBy}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#CBD5E1] break-words">
                        {event.message}
                      </p>

                      {/* Threshold info, Dataset & Timestamp */}
                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] font-mono text-[#94A3B8] pt-1">
                        {(event.actualValue !== undefined || event.value !== undefined) && (
                          <span>
                            Actual Value: <strong className={isCritical ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>{event.actualValue ?? event.value}</strong>
                          </span>
                        )}
                        {event.thresholdValue !== undefined && (
                          <span>
                            Limit: <strong className="text-slate-200">{event.thresholdValue}</strong>
                          </span>
                        )}
                        {event.datasetName && (
                          <span>
                            Dataset: <strong className="text-[#38BDF8]">{event.datasetName}</strong>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Clock className="w-3 h-3 text-[#64748B] shrink-0" />
                          <span>{event.timestamp ? new Date(event.timestamp).toLocaleString() : (event.triggeredAt || 'Recent')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0">
                    {!isResolved && !isCleared && !isAck && (
                      <button
                        onClick={() => acknowledgeAlarm(event.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#38BDF8] text-xs font-medium transition-colors cursor-pointer min-h-[34px]"
                      >
                        Acknowledge
                      </button>
                    )}

                    {!isResolved && !isCleared && (
                      <button
                        onClick={() => {
                          setResolveModalOpen(event.id);
                          setResolveNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer min-h-[34px]"
                      >
                        Resolve
                      </button>
                    )}

                    {!isCleared && (
                      <button
                        onClick={() => clearAlarm(event.id)}
                        title="Clear alert and update database"
                        className="px-2.5 py-1.5 rounded-lg bg-[#070D18] hover:bg-rose-950/40 border border-[#1E293B] hover:border-rose-800/50 text-[#94A3B8] hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1 min-h-[34px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}

                    {isResolved && !isCleared && (
                      <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-950/30 rounded border border-emerald-900/40 min-h-[34px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolved</span>
                      </span>
                    )}

                    {isCleared && (
                      <span className="text-xs font-mono text-slate-400 flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 rounded border border-slate-700 min-h-[34px]">
                        <Check className="w-3.5 h-3.5" />
                        <span>Cleared</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: THRESHOLD RULES LIST */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0F172A]">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-[#0A1124] text-[#94A3B8] font-mono uppercase text-[11px] border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Rule Name</th>
                  <th className="px-4 py-3 font-semibold">Metric Column</th>
                  <th className="px-4 py-3 font-semibold">Equipment Scope</th>
                  <th className="px-4 py-3 font-semibold">Condition</th>
                  <th className="px-4 py-3 font-semibold">Threshold Value</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 text-[#CBD5E1]">
                {alarmRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-[#141E33] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{rule.name}</td>
                    <td className="px-4 py-3 font-mono text-[#38BDF8]">{rule.metricColumn}</td>
                    <td className="px-4 py-3 font-mono text-[#94A3B8]">{rule.equipmentScope || 'ALL'}</td>
                    <td className="px-4 py-3 font-mono">{rule.condition}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{rule.thresholdValue}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          rule.alarmLevel === 'CRITICAL'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-black'
                        }`}
                      >
                        {rule.alarmLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {(isAdmin || isStaff) && (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setIsEditingRule(true);
                            }}
                            className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] transition-colors cursor-pointer"
                            title="Edit Threshold Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => deleteAlarmRule(rule.id)}
                              className="p-1 rounded bg-[#1E293B] hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESOLVE ALARM MODAL */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Resolve Operational Alarm</h3>
            <p className="text-xs text-[#94A3B8]">
              Record resolution notes and operator confirmation to mark this incident as resolved.
            </p>
            <div>
              <label className="text-xs text-[#94A3B8] block mb-1 font-mono">Resolution Notes</label>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g. Generator 2 cooling valve inspected and restored to nominal operating temperature."
                className="w-full p-2.5 rounded-lg bg-[#070D18] border border-[#1E293B] text-xs text-white focus:outline-none focus:border-[#0284C7]"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setResolveModalOpen(null)}
                className="px-3 py-1.5 rounded-lg bg-[#1E293B] text-[#94A3B8] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT THRESHOLD RULE MODAL */}
      {isEditingRule && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white">
                {editingRule.id ? 'Edit Threshold Rule' : 'Create New Threshold Rule'}
              </h3>
              <button
                onClick={() => setIsEditingRule(false)}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateRule} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-mono">Rule Name</label>
                <input
                  type="text"
                  required
                  value={editingRule.name || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g. Critical High Temperature Alert"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-mono">Target Metric Column</label>
                  <input
                    type="text"
                    required
                    value={editingRule.metricColumn || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, metricColumn: e.target.value })}
                    placeholder="temperature, voltage, power..."
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1 font-mono">Equipment Scope</label>
                  <input
                    type="text"
                    value={editingRule.equipmentScope || 'ALL'}
                    onChange={(e) => setEditingRule({ ...editingRule, equipmentScope: e.target.value })}
                    placeholder="ALL or specific Generator ID"
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-mono">Condition</label>
                  <select
                    value={editingRule.condition || 'GT'}
                    onChange={(e) => setEditingRule({ ...editingRule, condition: e.target.value as AlarmCondition })}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7] cursor-pointer"
                  >
                    <option value="GT">&gt; (Greater Than)</option>
                    <option value="LT">&lt; (Less Than)</option>
                    <option value="GTE">&gt;= (Greater or Equal)</option>
                    <option value="LTE">&lt;= (Less or Equal)</option>
                    <option value="EQ">= (Equal)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1 font-mono">Threshold Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingRule.thresholdValue ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, thresholdValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1 font-mono">Alarm Level</label>
                  <select
                    value={editingRule.alarmLevel || 'CRITICAL'}
                    onChange={(e) => setEditingRule({ ...editingRule, alarmLevel: e.target.value as AlarmLevel })}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#0284C7] cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL (Red)</option>
                    <option value="WARNING">WARNING (Amber)</option>
                    <option value="INFO">INFO (Blue)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsEditingRule(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold cursor-pointer"
                >
                  Save & Apply Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
