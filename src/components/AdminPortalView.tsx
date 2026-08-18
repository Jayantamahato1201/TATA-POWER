import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Sliders,
  Database,
  Plus,
  Trash2,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Move,
  Volume2,
  VolumeX,
  Volume1,
  Bell,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Radio,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole, DashboardWidget } from '../types';
import { DEFAULT_ALARM_AUDIO_SETTINGS, getAudioContext } from '../utils/audioAlertEngine';
import { AdminMetricManagementPanel } from './AdminPortal/AdminMetricManagementPanel';
import { AdminThresholdAlarmsPanel } from './AdminPortal/AdminThresholdAlarmsPanel';
import { DataAuthenticityPanel } from './AdminPortal/DataAuthenticityPanel';
import { DatasetManagementPanel } from './AdminPortal/DatasetManagementPanel';

export const AdminPortalView: React.FC = () => {
  const { user: currentUser, token, isAdmin } = useAuth();
  const {
    dashboardLayout,
    updateDashboardLayout,
    audioSettings,
    updateAudioSettings,
    testAudioAlert,
    isAudioMuted,
    toggleAudioMute,
    alarmSummary,
  } = useData();

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'datasets' | 'metrics' | 'thresholds' | 'users' | 'audit' | 'settings'>('thresholds');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [audioTestingState, setAudioTestingState] = useState<'CRITICAL' | 'WARNING' | null>(null);
  const [audioSavedBanner, setAudioSavedBanner] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'OPERATOR' as UserRole,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Update AudioContext status indicator
  useEffect(() => {
    const ctx = getAudioContext();
    if (ctx) {
      setAudioContextState(ctx.state);
      const onStateChange = () => setAudioContextState(ctx.state);
      ctx.addEventListener('statechange', onStateChange);
      return () => ctx.removeEventListener('statechange', onStateChange);
    }
  }, []);

  const handleTestSound = (severity: 'CRITICAL' | 'WARNING') => {
    setAudioTestingState(severity);
    testAudioAlert(severity);
    setTimeout(() => {
      setAudioTestingState(null);
    }, severity === 'CRITICAL' ? 800 : 500);
  };

  const handleAudioSettingToggle = (field: 'masterEnabled' | 'criticalAudioEnabled' | 'warningAudioEnabled', value: boolean) => {
    updateAudioSettings({ [field]: value });
    setAudioSavedBanner(true);
    setTimeout(() => setAudioSavedBanner(false), 2500);
  };

  const handleVolumeChange = (volume: number) => {
    updateAudioSettings({ volume });
  };

  const handleResetAudioDefaults = () => {
    if (confirm('Reset all audio alert settings to verified industrial defaults?')) {
      updateAudioSettings(DEFAULT_ALARM_AUDIO_SETTINGS);
      setAudioSavedBanner(true);
      setTimeout(() => setAudioSavedBanner(false), 2500);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/users/logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setIsCreatingUser(false);
        setNewUser({ username: '', password: '', name: '', role: 'OPERATOR' });
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this staff user?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    if (!dashboardLayout) return;
    const updated = {
      ...dashboardLayout,
      widgets: dashboardLayout.widgets.map((w) =>
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      ),
    };
    updateDashboardLayout(updated);
  };

  return (
    <div id="admin-portal-page" className="py-6 space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-[#111] border-l-2 border-l-[#F27D26] border-y border-r border-[#222] text-[#F27D26] text-xs font-mono mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest font-semibold">OPERATIONAL SECURITY & CONFIGURATION</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
            {isAdmin ? 'Admin Portal & RBAC Control' : 'Staff Operations Portal'}
          </h2>
          <p className="text-sm text-[#AAA] mt-1 font-light">
            Access management, customizable layout configurations, and system audit monitoring.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              onClick={() => {
                window.open('/api/export/backup/json', '_blank');
              }}
              className="px-3.5 py-2 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#AAA] hover:text-white border border-[#333] text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export System Backup</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsCreatingUser(true)}
              className="px-4 py-2 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold text-xs uppercase font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-[0_0_15px_rgba(242,125,38,0.3)]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Staff Account</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center border-b border-[#222] pb-2 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          id="admin-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#F27D26]" />
          <span>Dashboard</span>
        </button>

        <button
          id="admin-tab-datasets"
          onClick={() => setActiveTab('datasets')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'datasets'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-[#F27D26]" />
          <span>Datasets</span>
        </button>

        <button
          id="admin-tab-metrics"
          onClick={() => setActiveTab('metrics')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'metrics'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-[#F27D26]" />
          <span>Metrics</span>
        </button>

        <button
          id="admin-tab-thresholds"
          onClick={() => setActiveTab('thresholds')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'thresholds'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4 text-[#F27D26]" />
          <span>Thresholds & Alarms</span>
        </button>

        {isAdmin && (
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'users'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-[#888] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users ({users.length})</span>
          </button>
        )}

        <button
          id="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'audit'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Activity Logs</span>
        </button>

        <button
          id="admin-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'settings'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          {audioSettings.masterEnabled ? (
            <Volume2 className="w-4 h-4 text-[#00FF41]" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-400" />
          )}
          <span>Settings</span>
          <span
            className={`px-1.5 py-0.2 text-[9px] font-mono rounded-xs font-bold ${
              audioSettings.masterEnabled
                ? 'bg-[#00FF41]/15 text-[#00FF41] border border-[#00FF41]/30'
                : 'bg-rose-950/40 text-rose-400 border border-rose-800'
            }`}
          >
            {audioSettings.masterEnabled ? 'ACTIVE' : 'MUTED'}
          </span>
        </button>
      </div>

      {/* SUCCESS / SAVED BANNER */}
      {audioSavedBanner && (
        <div className="p-3 rounded-xs bg-[#00FF41]/10 border border-[#00FF41]/40 text-[#00FF41] flex items-center space-x-2 text-xs font-mono animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Audio Alert configuration saved & synchronized with browser audio synthesizer.</span>
        </div>
      )}

      {/* TAB: THRESHOLDS & ALARMS */}
      {activeTab === 'thresholds' && (
        <AdminThresholdAlarmsPanel />
      )}

      {/* TAB: DATASET MANAGEMENT */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          <DatasetManagementPanel />
          <DataAuthenticityPanel />
        </div>
      )}

      {/* TAB: METRIC & GRAPH MANAGEMENT */}
      {activeTab === 'metrics' && (
        <AdminMetricManagementPanel />
      )}

      {/* TAB: SETTINGS & AUDIO ALERTS */}
      {activeTab === 'settings' && (
        <div id="admin-audio-settings-panel" className="space-y-6">
          {/* Main Master Toggle Banner */}
          <div className="p-5 rounded-sm bg-[#0A0A0A] border border-[#222] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-2 rounded-xs ${
                    audioSettings.masterEnabled
                      ? 'bg-[#00FF41]/15 text-[#00FF41] border border-[#00FF41]/30'
                      : 'bg-rose-950/40 text-rose-400 border border-rose-800'
                  }`}
                >
                  {audioSettings.masterEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                    Browser Audio Alarm Engine
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs font-mono">
                    <span className="text-[#888]">Master Acoustic Status:</span>
                    <span
                      className={`font-bold ${
                        audioSettings.masterEnabled ? 'text-[#00FF41]' : 'text-rose-400'
                      }`}
                    >
                      {audioSettings.masterEnabled ? 'ENABLED (ARMED)' : 'MUTED (DISABLED)'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#888] font-light max-w-2xl pt-1">
                Enables or disables native Web Audio synthesizer alarms in this browser for Critical breaches and Warning deviations.
              </p>
            </div>

            {/* Master Toggle Button */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                id="btn-toggle-master-audio"
                onClick={() => handleAudioSettingToggle('masterEnabled', !audioSettings.masterEnabled)}
                className={`px-5 py-2.5 rounded-xs font-bold text-xs uppercase font-mono tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg ${
                  audioSettings.masterEnabled
                    ? 'bg-[#00FF41] hover:bg-[#00e63a] text-black shadow-[0_0_15px_rgba(0,255,65,0.25)]'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]'
                }`}
              >
                {audioSettings.masterEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Master Audio: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Master Audio: OFF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Granular Alarm Severity Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Setting 1: Critical Alarms Audio */}
            <div
              id="card-setting-critical-audio"
              className={`p-5 rounded-sm bg-[#0A0A0A] border transition-all space-y-4 ${
                audioSettings.criticalAudioEnabled && audioSettings.masterEnabled
                  ? 'border-rose-800/80 border-l-4 border-l-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
                  : 'border-[#222] opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xs bg-rose-950/60 border border-rose-800 text-rose-400">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase">
                      Critical Alarms Audio
                    </h4>
                    <span className="text-[11px] font-mono text-rose-400 font-semibold">
                      Severity: CRITICAL / HIGH EMERGENCY
                    </span>
                  </div>
                </div>

                <button
                  id="btn-toggle-critical-audio"
                  onClick={() =>
                    handleAudioSettingToggle(
                      'criticalAudioEnabled',
                      !audioSettings.criticalAudioEnabled
                    )
                  }
                  className={`px-3 py-1.5 rounded-xs text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                    audioSettings.criticalAudioEnabled
                      ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                      : 'bg-[#111] text-[#777] border-[#333]'
                  }`}
                >
                  {audioSettings.criticalAudioEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <p className="text-xs text-[#999] leading-relaxed font-light">
                Generates a high-urgency pulsating dual-tone siren when critical boiler, turbine, or plant telemetry breaches critical safety limits (e.g., &gt; 35°C or emergency threshold rules).
              </p>

              <div className="pt-2 border-t border-[#222] flex items-center justify-between">
                <div className="text-[11px] font-mono text-[#777]">
                  Active Criticals: <span className="text-rose-400 font-bold">{alarmSummary.critical}</span>
                </div>

                <button
                  id="btn-test-critical-sound"
                  onClick={() => handleTestSound('CRITICAL')}
                  className={`px-3.5 py-1.5 rounded-xs bg-[#111] hover:bg-rose-950/40 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase transition-all ${
                    audioTestingState === 'CRITICAL' ? 'ring-2 ring-rose-500 bg-rose-950' : ''
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${audioTestingState === 'CRITICAL' ? 'animate-spin' : ''}`} />
                  <span>{audioTestingState === 'CRITICAL' ? 'Playing Siren...' : 'Test Critical Sound'}</span>
                </button>
              </div>
            </div>

            {/* Setting 2: Warning Alarms Audio */}
            <div
              id="card-setting-warning-audio"
              className={`p-5 rounded-sm bg-[#0A0A0A] border transition-all space-y-4 ${
                audioSettings.warningAudioEnabled && audioSettings.masterEnabled
                  ? 'border-amber-700/80 border-l-4 border-l-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'border-[#222] opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xs bg-amber-950/60 border border-amber-800 text-amber-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase">
                      Warning Alarms Audio
                    </h4>
                    <span className="text-[11px] font-mono text-amber-400 font-semibold">
                      Severity: WARNING / ADVISORY
                    </span>
                  </div>
                </div>

                <button
                  id="btn-toggle-warning-audio"
                  onClick={() =>
                    handleAudioSettingToggle(
                      'warningAudioEnabled',
                      !audioSettings.warningAudioEnabled
                    )
                  }
                  className={`px-3 py-1.5 rounded-xs text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                    audioSettings.warningAudioEnabled
                      ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-[#111] text-[#777] border-[#333]'
                  }`}
                >
                  {audioSettings.warningAudioEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <p className="text-xs text-[#999] leading-relaxed font-light">
                Generates a moderate harmonic dual-chime for advisory warnings and early operational temperature/pressure deviations before reaching critical limits.
              </p>

              <div className="pt-2 border-t border-[#222] flex items-center justify-between">
                <div className="text-[11px] font-mono text-[#777]">
                  Active Warnings: <span className="text-amber-400 font-bold">{alarmSummary.warning}</span>
                </div>

                <button
                  id="btn-test-warning-sound"
                  onClick={() => handleTestSound('WARNING')}
                  className={`px-3.5 py-1.5 rounded-xs bg-[#111] hover:bg-amber-950/40 text-amber-300 hover:text-white border border-amber-800/60 text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase transition-all ${
                    audioTestingState === 'WARNING' ? 'ring-2 ring-amber-500 bg-amber-950' : ''
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${audioTestingState === 'WARNING' ? 'animate-spin' : ''}`} />
                  <span>{audioTestingState === 'WARNING' ? 'Playing Chime...' : 'Test Warning Sound'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audio Tuning & Playback Configuration Card */}
          <div className="p-6 rounded-sm bg-[#0A0A0A] border border-[#222] shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  Acoustic Synthesis & Playback Tuning
                </h4>
                <p className="text-xs text-[#888] font-light mt-0.5">
                  Adjust volume levels, acoustic sound profiles, and re-trigger intervals
                </p>
              </div>

              <button
                onClick={handleResetAudioDefaults}
                className="px-3 py-1.5 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#888] hover:text-white border border-[#333] text-xs font-mono flex items-center space-x-1.5 cursor-pointer"
                title="Reset to Factory Defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-mono">
              {/* Control 1: Master Volume */}
              <div className="space-y-3 p-4 rounded-xs bg-[#111] border border-[#222]">
                <div className="flex justify-between items-center">
                  <span className="text-[#AAA] uppercase flex items-center space-x-1.5">
                    <Volume1 className="w-4 h-4 text-[#F27D26]" />
                    <span>Alarm Volume</span>
                  </span>
                  <span className="text-white font-bold px-2 py-0.5 rounded-xs bg-[#1a1a1a] border border-[#333]">
                    {Math.round(audioSettings.volume * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
                />

                <div className="flex justify-between text-[10px] text-[#666]">
                  <button
                    onClick={() => handleVolumeChange(0.25)}
                    className="hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    25% Low
                  </button>
                  <button
                    onClick={() => handleVolumeChange(0.5)}
                    className="hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    50% Med
                  </button>
                  <button
                    onClick={() => handleVolumeChange(0.75)}
                    className="hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    75% Std
                  </button>
                  <button
                    onClick={() => handleVolumeChange(1.0)}
                    className="hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    100% Max
                  </button>
                </div>
              </div>

              {/* Control 2: Sound Profile Selection */}
              <div className="space-y-3 p-4 rounded-xs bg-[#111] border border-[#222]">
                <span className="text-[#AAA] uppercase flex items-center space-x-1.5">
                  <Radio className="w-4 h-4 text-[#F27D26]" />
                  <span>Acoustic Profile</span>
                </span>

                <select
                  value={audioSettings.soundType}
                  onChange={(e) =>
                    updateAudioSettings({
                      soundType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xs bg-[#181818] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
                >
                  <option value="industrial_siren">Industrial Pulsating Siren (Heavy Plant)</option>
                  <option value="urgent_beep">Rapid High-Pitch Dual Beep (Control Room)</option>
                  <option value="chime">Harmonic Multi-Tone Chimes (Executive)</option>
                </select>

                <p className="text-[10px] text-[#777]">
                  Pure Web Audio API waveform generation without external audio dependencies.
                </p>
              </div>

              {/* Control 3: Trigger Behavior & Periodic Reminder */}
              <div className="space-y-3 p-4 rounded-xs bg-[#111] border border-[#222]">
                <span className="text-[#AAA] uppercase flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-[#F27D26]" />
                  <span>Alert Repeat Mode</span>
                </span>

                <select
                  value={audioSettings.playbackMode}
                  onChange={(e) =>
                    updateAudioSettings({
                      playbackMode: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xs bg-[#181818] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
                >
                  <option value="on_event">On-Event Only (Chimes upon new breach)</option>
                  <option value="continuous">Periodic Reminder (Repeats every 15s)</option>
                </select>

                <div className="flex items-center justify-between text-[10px] text-[#777]">
                  <span>Audio Engine: {audioContextState.toUpperCase()}</span>
                  <button
                    onClick={() => {
                      const ctx = getAudioContext();
                      if (ctx && ctx.state === 'suspended') ctx.resume();
                      handleTestSound('WARNING');
                    }}
                    className="text-[#F27D26] hover:underline cursor-pointer"
                  >
                    Unlock Audio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
          {/* Create User Modal */}
          {isCreatingUser && (
            <form
              onSubmit={handleCreateUser}
              className="p-6 rounded-sm bg-[#0A0A0A] border border-[#F27D26]/50 shadow-2xl space-y-4 animate-in fade-in"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#222]">
                <h3 className="text-base font-bold text-white uppercase font-mono">Create Staff / Operator Account</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="text-[#888] hover:text-white text-xs cursor-pointer font-mono uppercase"
                >
                  ✕ Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[#AAA] mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block text-[#AAA] mb-1 uppercase">Username / ID</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="e.g. vsharma"
                    className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block text-[#AAA] mb-1 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block text-[#AAA] mb-1 uppercase">System Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN (Full Security & Controls)</option>
                    <option value="ENGINEER">ENGINEER (Rules & Custom Charts)</option>
                    <option value="OPERATOR">OPERATOR (Acknowledge & Telemetry Ingestion)</option>
                    <option value="VIEWER">VIEWER (Read-Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 rounded-xs bg-[#111] text-[#888] text-xs font-mono uppercase cursor-pointer border border-[#333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold text-xs uppercase font-mono tracking-wider cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-sm border border-[#222] bg-[#0A0A0A] shadow-xl">
            <table className="w-full text-left text-xs font-mono min-w-[600px]">
              <thead className="bg-[#111] text-[#888] border-b border-[#222] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#111] transition-colors">
                    <td className="p-4 font-bold text-white font-sans">{u.name}</td>
                    <td className="p-4 text-[#F27D26]">@{u.username}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-xs text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : u.role === 'ENGINEER'
                            ? 'bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30'
                            : 'bg-[#222] text-[#AAA]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-[#888]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-xs bg-[#111] hover:bg-rose-950/40 text-[#888] hover:text-rose-400 border border-[#333] cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: DASHBOARD CONFIGURATION & PLANT SPECIFICATIONS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Plant Specs */}
          <div className="p-6 rounded-sm bg-[#0A0A0A] border border-[#222] shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white uppercase font-mono">Tata Power Jojobera Parameters</h3>
              <p className="text-xs text-[#888] mt-1 font-light">Verified operational baseline ratings</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xs bg-[#111] border border-[#222] border-l-2 border-l-[#F27D26]">
                <span className="text-[#888] uppercase">Plant Generating Capacity:</span>
                <div className="text-lg font-bold text-white mt-1">427.5 MW</div>
              </div>
              <div className="p-4 rounded-xs bg-[#111] border border-[#222] border-l-2 border-l-[#00FF41]">
                <span className="text-[#888] uppercase">DE-NOx Technology:</span>
                <div className="text-lg font-bold text-[#00FF41] mt-1">Selective Catalytic Reduction</div>
              </div>
              <div className="p-4 rounded-xs bg-[#111] border border-[#222] border-l-2 border-l-sky-500">
                <span className="text-[#888] uppercase">Operating Since:</span>
                <div className="text-lg font-bold text-sky-400 mt-1">1997</div>
              </div>
              <div className="p-4 rounded-xs bg-[#111] border border-[#222] border-l-2 border-l-amber-500">
                <span className="text-[#888] uppercase">Grid Substation Rating:</span>
                <div className="text-lg font-bold text-amber-400 mt-1">220 kV Bus</div>
              </div>
              <div className="p-4 rounded-xs bg-[#111] border border-[#222] border-l-2 border-l-[#AAA] sm:col-span-2">
                <span className="text-[#888] uppercase">Location:</span>
                <div className="text-sm font-bold text-white mt-1">Jojobera, PO-Rahargora, Jamshedpur – 831016</div>
              </div>
            </div>
          </div>

          {/* Widget Layout Customizer */}
          <div className="p-6 rounded-sm bg-[#0A0A0A] border border-[#222] shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#222]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono">Dynamic Dashboard Layout Configuration</h3>
                <p className="text-xs text-[#888] mt-0.5 font-light">Toggle visibility and position of dashboard widgets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardLayout?.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`p-4 rounded-xs border transition-all ${
                    widget.isVisible
                      ? 'bg-[#0A0A0A] border-[#333] border-l-2 border-l-[#F27D26]'
                      : 'bg-[#0A0A0A]/60 border-[#222] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">{widget.title}</h4>
                      <span className="text-[10px] font-mono text-[#F27D26] uppercase tracking-wider">
                        Type: {widget.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`p-1.5 rounded-xs border text-xs cursor-pointer ${
                        widget.isVisible
                          ? 'bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41]'
                          : 'bg-[#111] border-[#333] text-[#888]'
                      }`}
                    >
                      {widget.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#222] flex justify-between text-xs font-mono text-[#888]">
                    <span>Width: {widget.w} col</span>
                    <span>Height: {widget.h} rows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
