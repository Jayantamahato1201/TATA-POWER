import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  BarChart2,
  Bell,
  Database,
  Sliders,
  Upload,
  UserCheck,
  LogIn,
  LogOut,
  Menu,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { TataPowerLogo } from './TataPowerLogo';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onReplayIntro?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, isAuthenticated, isAdmin, isStaff, logout, setIsLoginModalOpen } = useAuth();
  const {
    alarmSummary,
    alarmEvents = [],
    setIsUploadModalOpen,
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    audioSettings,
    toggleAudioMute,
    alarmSettings,
  } = useData();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const alertsRef = useRef<HTMLDivElement | null>(null);
  const datasetRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsDropdownOpen(false);
      }
      if (datasetRef.current && !datasetRef.current.contains(e.target as Node)) {
        setDatasetDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  // 5 primary clean navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: alarmSettings?.systemEnabled !== false ? alarmSummary.active : 0,
    },
    { id: 'data-management', label: 'Data Management', icon: FileSpreadsheet },
    { id: 'admin', label: 'Admin', icon: Sliders },
  ];

  const recentAlerts = alarmEvents.slice(0, 5);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1E293B] bg-[#070D18]/95 backdrop-blur-md transition-all">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-10 h-16 sm:h-18 flex items-center justify-between gap-4">
        {/* Left: Official Tata Power Brand Identity */}
        <div
          id="navbar-tata-power-brand"
          className="flex items-center cursor-pointer select-none py-1 group shrink-0"
          onClick={() => setCurrentTab('dashboard')}
        >
          <TataPowerLogo
            variant="full"
            subtitleText="Jamshedpur Operations Intelligence"
            className="transition-transform duration-200 group-hover:scale-[1.01]"
          />
        </div>

        {/* Center: Simplified 5-Item Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => {
                  if (item.id === 'admin' && !isStaff && !isAuthenticated) {
                    setIsLoginModalOpen(true);
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                className={`relative px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#0284C7]/15 text-[#38BDF8] border border-[#0284C7]/40 shadow-sm font-semibold'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#0F172A] border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#38BDF8]' : 'text-[#64748B]'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                      alarmSummary.critical > 0
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions & User Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Active Dataset Selector Dropdown */}
          {datasets.length > 0 && (
            <div className="relative hidden md:block" ref={datasetRef}>
              <button
                id="btn-nav-dataset-selector"
                onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                className="px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] text-xs font-mono flex items-center space-x-2 cursor-pointer max-w-[180px] sm:max-w-[210px] transition-colors"
                title="Active Telemetry Dataset"
              >
                <Database className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span className="truncate text-left font-medium">
                  {activeDataset?.name || 'Select Dataset'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#64748B] shrink-0" />
              </button>

              {datasetDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg bg-[#0F172A] border border-[#1E293B] shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in">
                  <div className="px-2.5 py-1.5 text-[11px] text-[#64748B] uppercase tracking-wider border-b border-[#1E293B] flex justify-between items-center font-mono">
                    <span>Active Telemetry Dataset</span>
                    <span className="text-[#38BDF8]">{datasets.length} Total</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                    {datasets.map((ds) => {
                      const isCurr = ds.id === selectedDatasetId;
                      return (
                        <button
                          key={ds.id}
                          onClick={() => {
                            setSelectedDatasetId(ds.id);
                            setDatasetDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex flex-col cursor-pointer ${
                            isCurr
                              ? 'bg-[#0284C7]/20 border border-[#0284C7]/50 text-white'
                              : 'hover:bg-[#1E293B] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate">{ds.name}</span>
                            {isCurr && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-[#0284C7] text-white rounded font-mono uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono flex items-center space-x-2 mt-0.5">
                            <span>{ds.totalRows.toLocaleString()} records</span>
                            <span>•</span>
                            <span>{ds.category || 'Telemetry'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-[#1E293B] flex justify-between items-center px-1">
                    <button
                      onClick={() => {
                        setDatasetDropdownOpen(false);
                        setIsUploadModalOpen(true);
                      }}
                      className="text-[11px] text-[#38BDF8] hover:text-white flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Upload className="w-3 h-3" />
                      <span>+ Ingest Data</span>
                    </button>
                    <button
                      onClick={() => {
                        setDatasetDropdownOpen(false);
                        setCurrentTab('data-management');
                      }}
                      className="text-[11px] text-[#94A3B8] hover:text-white cursor-pointer font-medium"
                    >
                      Manage All &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Bell with Active Alert Count */}
          <div className="relative" ref={alertsRef}>
            <button
              id="btn-nav-alerts-dropdown"
              onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              className={`relative p-2 rounded-md transition-colors cursor-pointer border ${
                alarmSummary.active > 0
                  ? 'bg-[#0F172A] border-amber-500/30 text-amber-400 hover:bg-[#1E293B]'
                  : 'bg-[#0F172A] border-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
              title="Operational Alerts"
              aria-label="View Operational Alerts"
            >
              <Bell className="w-4 h-4" />
              {alarmSettings?.systemEnabled !== false && alarmSummary.active > 0 && (
                <span
                  className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold font-mono text-white ${
                    alarmSummary.critical > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                  }`}
                >
                  {alarmSummary.active > 99 ? '99+' : alarmSummary.active}
                </span>
              )}
            </button>

            {/* Alerts Dropdown Drawer */}
            {alertsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[#0F172A] border border-[#1E293B] shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-white text-sm">Operational Alerts</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8]">
                    {alarmSummary.active} Active
                  </span>
                </div>

                {alarmSettings?.systemEnabled === false ? (
                  <div className="py-6 text-center text-[#64748B] space-y-1">
                    <p className="font-medium text-amber-400">Alarm System is OFF</p>
                    <p className="text-[11px]">Notifications are temporarily disabled by administrator.</p>
                  </div>
                ) : recentAlerts.length === 0 ? (
                  <div className="py-6 text-center text-[#64748B] space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="font-medium text-white">All Systems Normal</p>
                    <p className="text-[11px]">No active threshold breaches or warnings detected.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto py-1">
                    {recentAlerts.map((alert, idx) => (
                      <div
                        key={`${alert.id || 'alt'}_${idx}`}
                        onClick={() => {
                          setAlertsDropdownOpen(false);
                          setCurrentTab('alerts');
                        }}
                        className={`p-2 rounded-md border cursor-pointer transition-colors ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-950/30 border-rose-900/50 hover:bg-rose-900/40 text-rose-200'
                            : 'bg-amber-950/30 border-amber-900/50 hover:bg-amber-900/40 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center space-x-1.5">
                            <AlertTriangle
                              className={`w-3.5 h-3.5 ${
                                alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            />
                            <span>{alert.metricName}</span>
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40">
                            {alert.severity}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#94A3B8] font-mono mt-1 flex items-center justify-between">
                          <span>
                            Value: <strong className="text-white">{alert.value} {alert.unit}</strong>
                          </span>
                          <span>{alert.equipment || 'Plant'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-[#1E293B]">
                  <button
                    onClick={() => {
                      setAlertsDropdownOpen(false);
                      setCurrentTab('alerts');
                    }}
                    className="w-full py-1.5 text-center text-xs font-semibold text-[#38BDF8] hover:text-white bg-[#0284C7]/10 hover:bg-[#0284C7]/20 border border-[#0284C7]/30 rounded-md transition-colors cursor-pointer"
                  >
                    Open Alert Center &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Upload Data Action Button */}
          <button
            id="btn-nav-upload-data"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Upload Data</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* User Profile & Role Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              id="btn-nav-user-profile"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] text-xs flex items-center space-x-2 cursor-pointer transition-colors"
              title="User Profile & Settings"
            >
              <div className="w-5 h-5 rounded-full bg-[#0284C7]/30 text-[#38BDF8] flex items-center justify-center font-bold text-[10px]">
                {isAuthenticated && user?.name ? user.name[0].toUpperCase() : 'G'}
              </div>
              <span className="hidden md:inline font-medium truncate max-w-[90px]">
                {isAuthenticated ? user?.name : 'Guest'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B] hidden sm:inline" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#0F172A] border border-[#1E293B] shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in">
                <div className="px-2.5 py-2 border-b border-[#1E293B]">
                  <div className="font-semibold text-white truncate">
                    {isAuthenticated ? user?.name : 'Guest Viewer'}
                  </div>
                  <div className="text-[11px] text-[#64748B] font-mono truncate">
                    {isAuthenticated ? user?.email : 'guest@tatapower.com'}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                        isAdmin
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isStaff
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-slate-800 text-[#94A3B8]'
                      }`}
                    >
                      {user?.role || 'VIEWER'}
                    </span>
                  </div>
                </div>

                {/* Audio Alert Mute Toggle */}
                <button
                  onClick={toggleAudioMute}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#1E293B] text-[#94A3B8] hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    {audioSettings.muted ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Audio Alert Chimes</span>
                  </span>
                  <span className="font-mono text-[10px]">
                    {audioSettings.muted ? 'MUTED' : 'ACTIVE'}
                  </span>
                </button>

                {isStaff && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#1E293B] text-[#94A3B8] hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Admin Portal</span>
                  </button>
                )}

                <div className="pt-1 border-t border-[#1E293B]">
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#1E293B] text-[#38BDF8] hover:text-white flex items-center space-x-2 cursor-pointer font-medium"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Staff / Admin Login</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#1E293B] bg-[#070D18] px-4 py-3 space-y-1 font-sans">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'admin' && !isStaff && !isAuthenticated) {
                    setIsLoginModalOpen(true);
                  } else {
                    setCurrentTab(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm cursor-pointer ${
                  isActive
                    ? 'bg-[#0284C7]/20 text-[#38BDF8] font-semibold border border-[#0284C7]/40'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#0F172A]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-600 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
