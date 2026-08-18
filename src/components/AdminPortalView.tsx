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
  Activity,
  RefreshCw,
  Clock,
  UserCheck,
  FileText,
  Search,
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
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterQuery, setLogFilterQuery] = useState('');

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
    setIsLoadingLogs(true);
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
    } finally {
      setIsLoadingLogs(false);
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
        fetchAuditLogs();
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
        fetchAuditLogs();
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

  const filteredLogs = auditLogs.filter((log) => {
    if (!logFilterQuery) return true;
    const query = logFilterQuery.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(query)) ||
      (log.userName && log.userName.toLowerCase().includes(query)) ||
      (log.username && log.username.toLowerCase().includes(query)) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(query))
    );
  });

  return (
    <div id="admin-portal-page" className="py-6 space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] rounded-xl p-6 shadow-sm transition-colors duration-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0284C7]/10 dark:bg-[#0284C7]/20 border border-[#0284C7]/25 dark:border-[#0284C7]/40 text-[#0284C7] dark:text-[#38BDF8] text-xs font-mono mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest font-semibold">OPERATIONAL SECURITY & CONFIGURATION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase font-sans">
            {isAdmin ? 'Admin Portal & RBAC Control' : 'Staff Operations Portal'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-normal">
            Access management, customizable layout configurations, and system audit monitoring for Tata Power Jojobera.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              onClick={() => {
                window.open('/api/export/backup/json', '_blank');
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#1E293B] text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
              <span>Export System Backup</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsCreatingUser(true)}
              className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs uppercase font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Staff Account</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center border-b border-slate-200 dark:border-[#1E293B] pb-2 space-x-2 sm:space-x-3 overflow-x-auto w-full max-w-full">
        <button
          id="admin-tab-thresholds"
          onClick={() => setActiveTab('thresholds')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'thresholds'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Bell className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>Thresholds & Alarms</span>
        </button>

        <button
          id="admin-tab-datasets"
          onClick={() => setActiveTab('datasets')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'datasets'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Database className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>Datasets</span>
        </button>

        <button
          id="admin-tab-metrics"
          onClick={() => setActiveTab('metrics')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'metrics'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>Metrics</span>
        </button>

        <button
          id="admin-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>Dashboard Specs</span>
        </button>

        {isAdmin && (
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'users'
                ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
                : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
            <span>Staff Users ({users.length})</span>
          </button>
        )}

        <button
          id="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'audit'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>Activity Logs ({auditLogs.length})</span>
        </button>

        <button
          id="admin-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'settings'
              ? 'border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] dark:border-[#38BDF8] font-bold'
              : 'border-transparent text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          {audioSettings.masterEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>Audio Engine</span>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold ${
              audioSettings.masterEnabled
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}
          >
            {audioSettings.masterEnabled ? 'ARMED' : 'MUTED'}
          </span>
        </button>
      </div>

      {/* SUCCESS / SAVED BANNER */}
      {audioSavedBanner && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs font-mono animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

      {/* TAB: ACTIVITY LOGS & AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div id="admin-activity-logs-panel" className="space-y-4">
          <div className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono uppercase tracking-tight flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Administrative & Security Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">
                Chronological record of staff actions, alarm threshold adjustments, and operational events.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logFilterQuery}
                  onChange={(e) => setLogFilterQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 font-mono w-48 sm:w-64"
                />
              </div>

              <button
                onClick={fetchAuditLogs}
                disabled={isLoadingLogs}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#1E293B] text-xs font-mono flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                title="Refresh Activity Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8] ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="table-responsive-container rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0A1124] shadow-sm overflow-hidden transition-colors duration-200">
              <table className="w-full text-left text-xs font-mono min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-[#1E293B] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Staff User</th>
                    <th className="p-4">Action / Event</th>
                    <th className="p-4">Details / Target</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/80 transition-colors">
                      <td className="p-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
                          <span>{log.userName || log.username || 'System Administrator'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0284C7]/10 dark:bg-[#0284C7]/20 text-[#0284C7] dark:text-[#38BDF8] border border-[#0284C7]/30">
                          {log.action || log.event || 'AUDIT_LOG'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details || log.target || 'Operation executed'}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Logged</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center mx-auto text-[#0284C7] dark:text-[#38BDF8]">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900 dark:text-white font-mono">No Activity Recorded Yet</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Administrative actions, rule changes, dataset ingestions, and operational security events will appear here automatically as they occur.
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-800 dark:text-white text-xs font-mono inline-flex items-center space-x-2 cursor-pointer transition-colors border border-slate-300 dark:border-[#1E293B] shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Check for Updates</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTINGS & AUDIO ALERTS */}
      {activeTab === 'settings' && (
        <div id="admin-audio-settings-panel" className="space-y-6">
          {/* Main Master Toggle Banner */}
          <div className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    audioSettings.masterEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {audioSettings.masterEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono uppercase tracking-tight">
                    Browser Audio Alarm Engine
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400">Master Acoustic Status:</span>
                    <span
                      className={`font-bold ${
                        audioSettings.masterEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {audioSettings.masterEnabled ? 'ENABLED (ARMED)' : 'MUTED (DISABLED)'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-normal max-w-2xl pt-1">
                Enables or disables native Web Audio synthesizer alarms in this browser for Critical breaches and Warning deviations.
              </p>
            </div>

            {/* Master Toggle Button */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                id="btn-toggle-master-audio"
                onClick={() => handleAudioSettingToggle('masterEnabled', !audioSettings.masterEnabled)}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase font-mono tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-sm ${
                  audioSettings.masterEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
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
              className={`p-6 rounded-xl bg-white dark:bg-[#0A1124] border transition-all space-y-4 shadow-sm ${
                audioSettings.criticalAudioEnabled && audioSettings.masterEnabled
                  ? 'border-rose-300 dark:border-rose-800 border-l-4 border-l-rose-500'
                  : 'border-slate-200 dark:border-[#1E293B] opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase">
                      Critical Alarms Audio
                    </h4>
                    <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                    audioSettings.criticalAudioEnabled
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  {audioSettings.criticalAudioEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Generates a high-urgency pulsating dual-tone siren when critical boiler, turbine, or plant telemetry breaches critical safety limits (e.g., &gt; 35°C or emergency threshold rules).
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Active Criticals: <span className="text-rose-600 dark:text-rose-400 font-bold">{alarmSummary.critical}</span>
                </div>

                <button
                  id="btn-test-critical-sound"
                  onClick={() => handleTestSound('CRITICAL')}
                  className={`px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase transition-all shadow-xs ${
                    audioTestingState === 'CRITICAL' ? 'ring-2 ring-rose-500 bg-rose-100 dark:bg-rose-900/60' : ''
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
              className={`p-6 rounded-xl bg-white dark:bg-[#0A1124] border transition-all space-y-4 shadow-sm ${
                audioSettings.warningAudioEnabled && audioSettings.masterEnabled
                  ? 'border-amber-300 dark:border-amber-800 border-l-4 border-l-amber-500'
                  : 'border-slate-200 dark:border-[#1E293B] opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase">
                      Warning Alarms Audio
                    </h4>
                    <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                    audioSettings.warningAudioEnabled
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  {audioSettings.warningAudioEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Generates a moderate harmonic dual-chime for advisory warnings and early operational temperature/pressure deviations before reaching critical limits.
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Active Warnings: <span className="text-amber-600 dark:text-amber-400 font-bold">{alarmSummary.warning}</span>
                </div>

                <button
                  id="btn-test-warning-sound"
                  onClick={() => handleTestSound('WARNING')}
                  className={`px-3.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-mono flex items-center space-x-1.5 cursor-pointer uppercase transition-all shadow-xs ${
                    audioTestingState === 'WARNING' ? 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/60' : ''
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${audioTestingState === 'WARNING' ? 'animate-spin' : ''}`} />
                  <span>{audioTestingState === 'WARNING' ? 'Playing Chime...' : 'Test Warning Sound'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audio Tuning & Playback Configuration Card */}
          <div className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm space-y-6 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-[#1E293B] pb-4 gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase">
                  Acoustic Synthesis & Playback Tuning
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-0.5">
                  Adjust volume levels, acoustic sound profiles, and re-trigger intervals
                </p>
              </div>

              <button
                onClick={handleResetAudioDefaults}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-[#1E293B] text-xs font-mono flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                title="Reset to Factory Defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-mono">
              {/* Control 1: Master Volume */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold uppercase flex items-center space-x-1.5">
                    <Volume1 className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                    <span>Alarm Volume</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold px-2 py-0.5 rounded bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700">
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
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
                />

                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => handleVolumeChange(0.25)}
                    className="hover:text-slate-900 dark:hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    25% Low
                  </button>
                  <button
                    onClick={() => handleVolumeChange(0.5)}
                    className="hover:text-slate-900 dark:hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    50% Med
                  </button>
                  <button
                    onClick={() => handleVolumeChange(0.75)}
                    className="hover:text-slate-900 dark:hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    75% Std
                  </button>
                  <button
                    onClick={() => handleVolumeChange(1.0)}
                    className="hover:text-slate-900 dark:hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    100% Max
                  </button>
                </div>
              </div>

              {/* Control 2: Sound Profile Selection */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B]">
                <span className="text-slate-700 dark:text-slate-300 font-semibold uppercase flex items-center space-x-1.5">
                  <Radio className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                  <span>Acoustic Profile</span>
                </span>

                <select
                  value={audioSettings.soundType}
                  onChange={(e) =>
                    updateAudioSettings({
                      soundType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0A1124] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 cursor-pointer"
                >
                  <option value="industrial_siren">Industrial Pulsating Siren (Heavy Plant)</option>
                  <option value="urgent_beep">Rapid High-Pitch Dual Beep (Control Room)</option>
                  <option value="chime">Harmonic Multi-Tone Chimes (Executive)</option>
                </select>

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pure Web Audio API waveform generation without external audio dependencies.
                </p>
              </div>

              {/* Control 3: Trigger Behavior & Periodic Reminder */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B]">
                <span className="text-slate-700 dark:text-slate-300 font-semibold uppercase flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
                  <span>Alert Repeat Mode</span>
                </span>

                <select
                  value={audioSettings.playbackMode}
                  onChange={(e) =>
                    updateAudioSettings({
                      playbackMode: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0A1124] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 cursor-pointer"
                >
                  <option value="on_event">On-Event Only (Chimes upon new breach)</option>
                  <option value="continuous">Periodic Reminder (Repeats every 15s)</option>
                </select>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Audio Engine: {audioContextState.toUpperCase()}</span>
                  <button
                    onClick={() => {
                      const ctx = getAudioContext();
                      if (ctx && ctx.state === 'suspended') ctx.resume();
                      handleTestSound('WARNING');
                    }}
                    className="text-[#0284C7] dark:text-[#38BDF8] hover:underline cursor-pointer font-semibold"
                  >
                    Unlock Audio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USER MANAGEMENT */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
          {/* Create User Modal */}
          {isCreatingUser && (
            <form
              onSubmit={handleCreateUser}
              className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-[#0284C7]/40 shadow-xl space-y-4 animate-in fade-in transition-colors duration-200"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#1E293B]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">Create Staff / Operator Account</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer font-mono uppercase font-semibold"
                >
                  ✕ Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 uppercase font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 uppercase font-semibold">Username / ID</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="e.g. vsharma"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 uppercase font-semibold">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 uppercase font-semibold">System Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 cursor-pointer"
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
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] text-xs font-mono uppercase cursor-pointer border border-slate-300 dark:border-[#1E293B] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs uppercase font-mono tracking-wider cursor-pointer shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="table-responsive-container rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0A1124] shadow-sm overflow-hidden transition-colors duration-200">
            <table className="w-full text-left text-xs font-mono min-w-[650px]">
              <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-[#1E293B] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white font-sans">{u.name}</td>
                    <td className="p-4 text-[#0284C7] dark:text-[#38BDF8] font-semibold">@{u.username}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                            : u.role === 'ENGINEER'
                            ? 'bg-[#0284C7]/10 dark:bg-[#0284C7]/20 text-[#0284C7] dark:text-[#38BDF8] border border-[#0284C7]/30'
                            : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8] border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-300 dark:border-[#1E293B] hover:border-rose-300 cursor-pointer transition-colors shadow-xs"
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
          <div className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm space-y-6 transition-colors duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">Tata Power Jojobera Parameters</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">Verified operational baseline ratings</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] border-l-4 border-l-[#0284C7]">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">Plant Generating Capacity:</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">427.5 MW</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] border-l-4 border-l-emerald-500">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">DE-NOx Technology:</span>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">Selective Catalytic Reduction</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] border-l-4 border-l-sky-500">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">Operating Since:</span>
                <div className="text-lg font-bold text-sky-700 dark:text-sky-400 mt-1">1997</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] border-l-4 border-l-amber-500">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">Grid Substation Rating:</span>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">220 kV Bus</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] border-l-4 border-l-[#0284C7] sm:col-span-2">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">Location:</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Jojobera, PO-Rahargora, Jamshedpur – 831016</div>
              </div>
            </div>
          </div>

          {/* Widget Layout Customizer */}
          <div className="p-6 rounded-xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-sm space-y-6 transition-colors duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#1E293B]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">Dynamic Dashboard Layout Configuration</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-normal">Toggle visibility and position of dashboard widgets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardLayout?.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`p-4 rounded-lg border transition-all ${
                    widget.isVisible
                      ? 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-[#1E293B] border-l-4 border-l-[#0284C7]'
                      : 'bg-slate-50/50 dark:bg-[#0F172A]/50 border-slate-200 dark:border-[#1E293B] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">{widget.title}</h4>
                      <span className="text-[10px] font-mono text-[#0284C7] dark:text-[#38BDF8] uppercase tracking-wider font-semibold">
                        Type: {widget.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors shadow-xs ${
                        widget.isVisible
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-[#1E293B] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {widget.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1E293B] flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
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
