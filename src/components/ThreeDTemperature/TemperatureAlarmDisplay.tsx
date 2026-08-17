import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  Filter,
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Cpu,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { TemperatureAlarmItem, TemperatureThresholdConfig, TemperatureDataPoint } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { playCriticalAlarmSound, playWarningAlarmSound } from '../../utils/audioAlertEngine';

interface TemperatureAlarmDisplayProps {
  alarms: TemperatureAlarmItem[];
  config: TemperatureThresholdConfig;
  unit: string;
  onSelectPoint?: (point: TemperatureDataPoint) => void;
  onAcknowledgeAlarm?: (alarmId: string) => void;
  onAcknowledgeAll?: () => void;
}

export const TemperatureAlarmDisplay: React.FC<TemperatureAlarmDisplayProps> = ({
  alarms,
  config,
  unit,
  onSelectPoint,
  onAcknowledgeAlarm,
  onAcknowledgeAll,
}) => {
  const { isStaff, isAdmin } = useAuth();
  const { audioSettings, toggleAudioMute } = useData();
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ABOVE' | 'BELOW' | 'UNACKNOWLEDGED'>('ALL');
  const [dismissedFloating, setDismissedFloating] = useState(false);

  const isSoundMuted = !audioSettings.masterEnabled || (!audioSettings.criticalAudioEnabled && !audioSettings.warningAudioEnabled);

  // Sound Synth Generator for Alarm Beeper utilizing global audio engine
  const triggerAlarmSound = () => {
    if (!audioSettings.masterEnabled) return;
    const hasAbove = alarms.some((a) => a.thresholdType === 'ABOVE');
    if (hasAbove && audioSettings.criticalAudioEnabled) {
      playCriticalAlarmSound();
    } else if (audioSettings.warningAudioEnabled) {
      playWarningAlarmSound();
    }
  };

  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (alarms.length > 0 && config.playAlarmSound && audioSettings.masterEnabled) {
      triggerAlarmSound();
    }
  }, [alarms.length, config.playAlarmSound, audioSettings.masterEnabled, audioSettings.criticalAudioEnabled, audioSettings.warningAudioEnabled]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, id]));
    if (onAcknowledgeAlarm) onAcknowledgeAlarm(id);
  };

  const handleAckAll = () => {
    const allIds = new Set(alarms.map((a) => a.id));
    setAcknowledgedIds(allIds);
    if (onAcknowledgeAll) onAcknowledgeAll();
  };

  // Export Alarm Log CSV
  const handleExportAlarmCSV = () => {
    if (alarms.length === 0) return;
    const headers = ['Alarm ID', 'Row Index', 'Timestamp', 'Equipment', 'Actual Temperature', 'Configured Threshold', 'Threshold Type', 'Severity', 'Status Message', 'Acknowledged'];
    const rows = alarms.map((a) => [
      a.id,
      a.rowIndex,
      `"${a.timestamp}"`,
      `"${a.equipment}"`,
      a.actualTemperature,
      a.configuredThreshold,
      a.thresholdType,
      a.alarmLevel,
      `"${a.message.replace(/"/g, '""')}"`,
      acknowledgedIds.has(a.id) || a.isAcknowledged ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tatapower_thermal_alarm_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAlarms = alarms.filter((a) => {
    const isAck = acknowledgedIds.has(a.id) || a.isAcknowledged;
    if (selectedFilter === 'ABOVE') return a.thresholdType === 'ABOVE';
    if (selectedFilter === 'BELOW') return a.thresholdType === 'BELOW';
    if (selectedFilter === 'UNACKNOWLEDGED') return !isAck;
    return true;
  });

  const unacknowledgedCount = alarms.filter((a) => !acknowledgedIds.has(a.id) && !a.isAcknowledged).length;
  const aboveAlarmsCount = alarms.filter((a) => a.thresholdType === 'ABOVE').length;
  const belowAlarmsCount = alarms.filter((a) => a.thresholdType === 'BELOW').length;

  const position = config.alarmDisplayPosition || 'below_graph';
  const showAlarms = config.showAlarmsOnDashboard !== false && config.enableMonitoring !== false;

  if (!showAlarms || alarms.length === 0) {
    if (showAlarms && alarms.length === 0) {
      return (
        <div className="p-4 rounded-sm bg-[#080C08] border border-emerald-900/60 flex items-center justify-between font-mono text-xs shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xs bg-emerald-950/80 text-[#00FF41] border border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white uppercase tracking-wider">
                Thermal Boundary Monitoring: All Clear
              </span>
              <p className="text-[11px] text-[#AAA] mt-0.5">
                Zero temperature excursions detected across all active power generation units.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-ping" />
            <span>Telemetry Normal</span>
          </div>
        </div>
      );
    }
    return null;
  }

  // Render based on configured Alarm Display Position
  // 1. TOP NOTIFICATION BAR
  if (position === 'top_notification') {
    return (
      <div className="p-3 rounded-sm bg-[#1A0A0A] border-l-4 border-l-[#EF4444] border-y border-r border-[#331111] shadow-2xl font-mono text-xs flex flex-wrap items-center justify-between gap-3 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-xs bg-rose-950 text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white uppercase tracking-wider">
                ACTIVE THERMAL ALARM BROADCAST ({alarms.length} EXCURSIONS)
              </span>
              <span className="px-2 py-0.2 rounded-xs bg-rose-950 text-rose-300 font-extrabold text-[10px]">
                {unacknowledgedCount} UNACKNOWLEDGED
              </span>
            </div>
            <p className="text-[11px] text-[#CCC] mt-0.5">
              Latest alert: {alarms[0]?.message}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {config.requireAcknowledgement && unacknowledgedCount > 0 && (
            <button
              onClick={handleAckAll}
              className="px-3 py-1.5 rounded-xs bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase cursor-pointer"
            >
              Acknowledge All ({unacknowledgedCount})
            </button>
          )}
          <button
            onClick={handleExportAlarmCSV}
            className="px-2.5 py-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#333] cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. FLOATING ALERT PANEL (BOTTOM RIGHT)
  if (position === 'floating_panel') {
    if (dismissedFloating) {
      return (
        <button
          onClick={() => setDismissedFloating(false)}
          className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-sm bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-2xl flex items-center space-x-2 cursor-pointer uppercase tracking-wider border border-white/20 animate-bounce"
        >
          <Bell className="w-4 h-4" />
          <span>Thermal Alarms ({alarms.length})</span>
        </button>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col bg-[#0A0A0A] border-2 border-[#EF4444] rounded-sm shadow-[0_0_30px_rgba(239,68,68,0.3)] font-mono text-xs overflow-hidden">
        {/* Floating Header */}
        <div className="p-3 bg-[#1A0A0A] border-b border-[#331111] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="font-bold text-white uppercase">
              Thermal Alarms ({alarms.length})
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleAudioMute}
              className="p-1 rounded-xs hover:bg-[#222] text-[#888] hover:text-white cursor-pointer"
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <button
              onClick={() => setDismissedFloating(true)}
              className="p-1 rounded-xs hover:bg-[#222] text-[#888] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Alarm Items */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-96 flex-1">
          {filteredAlarms.slice(0, 10).map((alarm, idx) => {
            const isAck = acknowledgedIds.has(alarm.id) || alarm.isAcknowledged;
            return (
              <div
                key={`${alarm.id || 'alm'}_${idx}`}
                className={`p-2.5 rounded-xs border transition-colors ${
                  alarm.thresholdType === 'ABOVE'
                    ? 'bg-rose-950/40 border-rose-900/80 hover:border-rose-500'
                    : 'bg-cyan-950/40 border-cyan-900/80 hover:border-cyan-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white">{alarm.equipment}</span>
                      <span
                        className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold uppercase"
                        style={{ backgroundColor: alarm.color, color: '#000' }}
                      >
                        {alarm.status}
                      </span>
                    </div>
                    <div className="text-white font-extrabold text-sm mt-0.5">
                      {alarm.actualTemperature} {unit}{' '}
                      <span className="text-[10px] font-normal text-[#888]">
                        (Limit: {alarm.configuredThreshold} {unit})
                      </span>
                    </div>
                  </div>
                  {!isAck && (
                    <button
                      onClick={() => handleAcknowledge(alarm.id)}
                      className="px-2 py-1 rounded-xs bg-[#111] hover:bg-[#222] text-rose-400 hover:text-white border border-rose-900/60 text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Ack
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-[#888] mt-1 flex justify-between">
                  <span>Row #{alarm.rowIndex}</span>
                  <span>{alarm.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Footer */}
        <div className="p-2.5 bg-[#080808] border-t border-[#222] flex items-center justify-between">
          <span className="text-[10px] text-[#888]">{unacknowledgedCount} Unacknowledged</span>
          {unacknowledgedCount > 0 && (
            <button
              onClick={handleAckAll}
              className="px-2.5 py-1 rounded-xs bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase cursor-pointer"
            >
              Ack All
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. FULL PAGE ALERT OVERLAY / DASHBOARD
  if (position === 'full_page') {
    return (
      <div className="p-6 rounded-sm bg-[#0E0606] border-2 border-[#EF4444] shadow-[0_0_40px_rgba(239,68,68,0.25)] space-y-6 font-mono text-xs">
        {/* Full Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-950 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xs bg-rose-600 text-white shadow-lg animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black text-white uppercase tracking-wider">
                  CRITICAL TEMPERATURE ALARM DASHBOARD
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-rose-950 text-rose-400 font-bold text-xs border border-rose-800">
                  {alarms.length} INCIDENTS
                </span>
              </div>
              <p className="text-[#AAA] text-xs font-sans mt-0.5">
                Immediate operator action required: High or low temperature boundary threshold violations detected.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleAudioMute}
              className="px-3 py-2 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#333] flex items-center space-x-1.5 cursor-pointer uppercase"
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
              <span>{isSoundMuted ? 'Muted' : 'Audio Alarm Active'}</span>
            </button>

            {config.requireAcknowledgement && unacknowledgedCount > 0 && (
              <button
                onClick={handleAckAll}
                className="px-4 py-2 rounded-xs bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Acknowledge All ({unacknowledgedCount})
              </button>
            )}

            <button
              onClick={handleExportAlarmCSV}
              className="px-3 py-2 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#333] flex items-center space-x-1.5 cursor-pointer uppercase"
            >
              <Download className="w-4 h-4" />
              <span>Export Alarm CSV</span>
            </button>
          </div>
        </div>

        {/* Incident Summary Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xs bg-[#160A0A] border border-rose-900/60">
            <div className="text-[#888] uppercase text-[10px]">Total Excursions</div>
            <div className="text-2xl font-black text-rose-400 mt-1">{alarms.length}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">Violations logged</div>
          </div>

          <div className="p-4 rounded-xs bg-[#160A0A] border border-rose-900/60">
            <div className="text-[#888] uppercase text-[10px]">High Temp Excursions</div>
            <div className="text-2xl font-black text-[#EF4444] mt-1">{aboveAlarmsCount}</div>
            <div className="text-[10px] text-[#888] mt-0.5">&gt; {config.aboveThreshold}{unit}</div>
          </div>

          <div className="p-4 rounded-xs bg-[#0A1216] border border-cyan-900/60">
            <div className="text-[#888] uppercase text-[10px]">Low Temp Excursions</div>
            <div className="text-2xl font-black text-[#06B6D4] mt-1">{belowAlarmsCount}</div>
            <div className="text-[10px] text-[#888] mt-0.5">&lt; {config.belowThreshold}{unit}</div>
          </div>

          <div className="p-4 rounded-xs bg-[#111] border border-[#333]">
            <div className="text-[#888] uppercase text-[10px]">Pending Acknowledgment</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{unacknowledgedCount}</div>
            <div className="text-[10px] text-[#888] mt-0.5">Operator signature pending</div>
          </div>
        </div>

        {/* Alarm Table */}
        <div className="overflow-x-auto rounded-xs border border-[#333]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#111] text-[#888] uppercase border-b border-[#333]">
              <tr>
                <th className="p-3">Sequence</th>
                <th className="p-3">Equipment / Sensor</th>
                <th className="p-3">Actual Temp</th>
                <th className="p-3">Threshold Limit</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Operator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredAlarms.map((alarm, idx) => {
                const isAck = acknowledgedIds.has(alarm.id) || alarm.isAcknowledged;
                return (
                  <tr key={`${alarm.id || 'alm_row'}_${idx}`} className="hover:bg-[#150A0A] transition-colors">
                    <td className="p-3 text-[#F27D26] font-bold">#{alarm.rowIndex}</td>
                    <td className="p-3 text-white font-bold">{alarm.equipment}</td>
                    <td className="p-3 font-extrabold text-sm" style={{ color: alarm.color }}>
                      {alarm.actualTemperature} {unit}
                    </td>
                    <td className="p-3 text-[#AAA]">
                      {alarm.thresholdType === 'ABOVE' ? `> ${alarm.configuredThreshold} ${unit}` : `< ${alarm.configuredThreshold} ${unit}`}
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase"
                        style={{ backgroundColor: alarm.color, color: '#000' }}
                      >
                        {alarm.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 text-[#888]">{alarm.timestamp}</td>
                    <td className="p-3">
                      {isAck ? (
                        <span className="text-[#00FF41] flex items-center space-x-1 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledged</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(alarm.id)}
                          className="px-3 py-1 rounded-xs bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-[10px] cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. BELOW GRAPH (DEFAULT INDUSTRIAL POSITION)
  return (
    <div
      id="temperature-alarm-panel-below-graph"
      className="p-5 rounded-sm bg-[#0A0A0A] border border-[#222] border-t-2 border-t-[#EF4444] space-y-4 font-mono text-xs shadow-2xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xs bg-rose-950 text-rose-400 border border-rose-900/60">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                Active Temperature Boundary Alarms
              </h3>
              <span className="px-2 py-0.2 rounded-xs bg-rose-950 text-rose-300 font-extrabold text-[11px]">
                {alarms.length} Alarms
              </span>
              {unacknowledgedCount > 0 && (
                <span className="px-2 py-0.2 rounded-xs bg-amber-950 text-amber-300 font-semibold text-[10px]">
                  {unacknowledgedCount} Pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#888] mt-0.5">
              Live telemetry points exceeding configured high ({config.aboveThreshold}{unit}) or low ({config.belowThreshold}{unit}) threshold boundaries.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center space-x-1 bg-[#111] p-1 rounded-xs border border-[#333]">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                selectedFilter === 'ALL' ? 'bg-[#F27D26] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
            >
              All ({alarms.length})
            </button>
            <button
              onClick={() => setSelectedFilter('ABOVE')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                selectedFilter === 'ABOVE' ? 'bg-[#EF4444] text-white font-bold' : 'text-[#888] hover:text-white'
              }`}
            >
              Above ({aboveAlarmsCount})
            </button>
            <button
              onClick={() => setSelectedFilter('BELOW')}
              className={`px-2 py-1 rounded-xs cursor-pointer ${
                selectedFilter === 'BELOW' ? 'bg-[#06B6D4] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
            >
              Below ({belowAlarmsCount})
            </button>
            {unacknowledgedCount > 0 && (
              <button
                onClick={() => setSelectedFilter('UNACKNOWLEDGED')}
                className={`px-2 py-1 rounded-xs cursor-pointer ${
                  selectedFilter === 'UNACKNOWLEDGED' ? 'bg-amber-400 text-black font-bold' : 'text-[#888] hover:text-white'
                }`}
              >
                Unack ({unacknowledgedCount})
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleAudioMute}
            className={`p-2 rounded-xs border cursor-pointer ${
              isSoundMuted
                ? 'bg-[#111] text-[#777] border-[#333]'
                : 'bg-rose-950/60 text-rose-400 border-rose-900'
            }`}
            title={isSoundMuted ? 'Unmute Audio Alarm' : 'Mute Audio Alarm'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Acknowledge All */}
          {config.requireAcknowledgement && unacknowledgedCount > 0 && (
            <button
              onClick={handleAckAll}
              className="px-3 py-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#333] font-bold uppercase cursor-pointer"
            >
              Ack All
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportAlarmCSV}
            className="px-3 py-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-[#F27D26] border border-[#333] flex items-center space-x-1.5 cursor-pointer uppercase"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Alarm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
        {filteredAlarms.map((alarm, idx) => {
          const isAck = acknowledgedIds.has(alarm.id) || alarm.isAcknowledged;
          const isAbove = alarm.thresholdType === 'ABOVE';

          return (
            <div
              key={`${alarm.id || 'alm_card'}_${idx}`}
              className={`p-3 rounded-xs border transition-all ${
                isAbove
                  ? 'bg-[#120606] border-rose-950 hover:border-rose-700'
                  : 'bg-[#060D12] border-cyan-950 hover:border-cyan-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {isAbove ? (
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="font-bold text-white uppercase">{alarm.equipment}</span>
                </div>

                <span
                  className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold uppercase"
                  style={{ backgroundColor: alarm.color, color: '#000' }}
                >
                  {alarm.status}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <div className="text-lg font-black" style={{ color: alarm.color }}>
                    {alarm.actualTemperature} {unit}
                  </div>
                  <div className="text-[10px] text-[#888]">
                    Limit: {alarm.configuredThreshold} {unit}
                  </div>
                </div>

                {isAck ? (
                  <span className="text-[#00FF41] text-[10px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ack'd</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(alarm.id)}
                    className="px-2.5 py-1 rounded-xs bg-[#111] hover:bg-[#222] text-rose-400 hover:text-white border border-rose-900/60 text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#777] mt-2 pt-2 border-t border-[#222]/60">
                <span>Row #{alarm.rowIndex}</span>
                <span className="truncate ml-2">{alarm.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
