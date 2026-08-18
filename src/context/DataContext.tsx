import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Dataset,
  AlarmRule,
  AlarmEvent,
  ChartConfig,
  DashboardLayout,
  DashboardWidget,
  SmartInsight,
  AlarmAudioSettings,
} from '../types';
import {
  getStoredAudioSettings,
  saveStoredAudioSettings,
  subscribeToAudioSettings,
  testAlarmSound,
  evaluateAndTriggerAlarmAudio,
} from '../utils/audioAlertEngine';
import { useAuth } from './AuthContext';
import { safeParseResponse } from '../utils/apiUtils';

export interface OverviewData {
  hasData: boolean;
  totalDatasets: number;
  currentDataset?: Dataset;
  totalRecords: number;
  activeEquipmentCount: number;
  equipmentCount?: number;
  equipmentList: string[];
  activeAlarmsCount: number;
  criticalAlarmsCount: number;
  metrics: Record<string, { min?: number; max?: number; avg?: number; unit?: string; count: number }>;
  latestTimestamp: string | null;
  detectedMetrics?: any[];
  metricsDetectedCount?: number;
}

interface FilterState {
  equipment: string;
  startDate?: string;
  endDate?: string;
}

export interface DataContextType {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string | null) => void;
  currentDataset: Dataset | null;
  overview: OverviewData | null;
  insights: SmartInsight[];
  charts: ChartConfig[];
  alarmRules: AlarmRule[];
  alarmEvents: AlarmEvent[];
  alarmSummary: { total: number; active: number; critical: number; warning: number; resolved: number; cleared?: number };
  layout: DashboardLayout | null;
  dashboardLayout: DashboardLayout | null;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isLoading: boolean;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;
  exportCleanCSV?: (datasetId?: string) => void;
  activeDatasetMetrics?: any[];
  processedData?: any[];
  refreshAlarms: () => Promise<void>;
  uploadDataset: (file: File, name?: string) => Promise<{ success: boolean; error?: string }>;
  seedSampleDataset: () => Promise<void>;
  acknowledgeAlarm: (id: string) => Promise<void>;
  resolveAlarm: (id: string, notes?: string) => Promise<void>;
  clearAlarm: (id: string) => Promise<void>;
  clearAlarmsBatch: (ids: string[]) => Promise<{ success: boolean; clearedCount: number }>;
  clearAllAlarms: (filter?: { datasetId?: string; level?: string; equipmentId?: string }) => Promise<{ success: boolean; clearedCount: number }>;
  saveAlarmRule: (rule: Partial<AlarmRule>) => Promise<boolean>;
  deleteAlarmRule: (id: string) => Promise<boolean>;
  reEvaluateAlarms: () => Promise<void>;
  saveChartConfig: (chart: Partial<ChartConfig>) => Promise<boolean>;
  deleteChartConfig: (id: string) => Promise<boolean>;
  updateLayout: (widgets: DashboardWidget[]) => Promise<boolean>;
  updateDashboardLayout: (layout: DashboardLayout) => Promise<boolean>;
  deleteDataset: (id: string) => Promise<boolean>;
  clearAllDatasets: () => Promise<boolean>;
  replaceDataset: (datasetId: string, file: File) => Promise<{ success: boolean; error?: string }>;
  appendDataset: (datasetId: string, file: File, duplicateStrategy?: 'skip' | 'overwrite') => Promise<{ success: boolean; error?: string; added?: number; duplicatesSkipped?: number }>;
  updateDatasetMeta: (datasetId: string, updates: Partial<Dataset>) => Promise<boolean>;
  fetchDatasetRecords: (datasetId: string, params?: { search?: string; equipment?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string; limit?: number; offset?: number }) => Promise<{ records: any[]; total: number }>;
  addRecord: (datasetId: string, data: Record<string, any>) => Promise<boolean>;
  updateRecord: (datasetId: string, recordId: string, data: Record<string, any>) => Promise<boolean>;
  deleteRecord: (datasetId: string, recordId: string) => Promise<boolean>;
  bulkUpdateRecords: (datasetId: string, action: 'delete' | 'update', payload: any) => Promise<{ success: boolean; affected: number }>;
  previewFile: (file: File) => Promise<any>;
  downloadDatasetCSV: (datasetId: string) => void;
  exportDatasetCSV: (datasetId: string) => void;
  exportAlarmsCSV: (status?: string) => void;
  exportTemperatureCSV: (filters?: { equipment?: string; status?: string; startDate?: string; endDate?: string }) => void;
  // Alarm System Master Status
  alarmSettings: { systemEnabled: boolean };
  toggleAlarmSystem: (enabled?: boolean) => Promise<boolean>;
  // User Audio Alert Settings
  audioSettings: AlarmAudioSettings;
  updateAudioSettings: (newSettings: Partial<AlarmAudioSettings>) => void;
  testAudioAlert: (severity: 'CRITICAL' | 'WARNING') => boolean;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  lastUpdated: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>([]);
  const [alarmEvents, setAlarmEvents] = useState<AlarmEvent[]>([]);
  const [alarmSummary, setAlarmSummary] = useState({ total: 0, active: 0, critical: 0, warning: 0, resolved: 0 });
  const [alarmSettings, setAlarmSettings] = useState<{ systemEnabled: boolean }>({ systemEnabled: true });
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [filters, setFilters] = useState<FilterState>({ equipment: 'ALL' });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Audio Settings State
  const [audioSettings, setAudioSettings] = useState<AlarmAudioSettings>(() => getStoredAudioSettings());

  // Listen to audio settings change from other components/windows
  useEffect(() => {
    const unsubscribe = subscribeToAudioSettings((updated) => {
      setAudioSettings(updated);
    });
    return unsubscribe;
  }, []);

  // Update audio settings handler
  const updateAudioSettings = useCallback((newSettings: Partial<AlarmAudioSettings>) => {
    setAudioSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveStoredAudioSettings(merged);
      return merged;
    });
  }, []);

  const isAudioMuted = !audioSettings.masterEnabled;
  const toggleAudioMute = useCallback(() => {
    updateAudioSettings({ masterEnabled: !audioSettings.masterEnabled });
  }, [audioSettings.masterEnabled, updateAudioSettings]);

  const testAudioAlert = useCallback((severity: 'CRITICAL' | 'WARNING') => {
    return testAlarmSound(severity);
  }, []);

  // Automatic Audio Alert Trigger on telemetry alarms evaluation
  useEffect(() => {
    if (alarmSummary.critical > 0 || alarmSummary.warning > 0) {
      evaluateAndTriggerAlarmAudio(alarmSummary.critical, alarmSummary.warning);
    }
  }, [alarmSummary.critical, alarmSummary.warning, audioSettings.masterEnabled, audioSettings.criticalAudioEnabled, audioSettings.warningAudioEnabled]);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDatasets = useCallback(async () => {
    try {
      const res = await fetch('/api/datasets', { headers: authHeaders });
      const data = await safeParseResponse<{ datasets?: Dataset[] }>(res, { datasets: [] });
      const rawDatasets: Dataset[] = data.datasets || [];
      const seen = new Set<string>();
      const deduped: Dataset[] = [];
      for (const d of rawDatasets) {
        if (!d.id || seen.has(d.id)) continue;
        seen.add(d.id);
        deduped.push(d);
      }
      setDatasets(deduped);
      if (deduped.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(deduped[0].id);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    }
  }, [token, selectedDatasetId]);

  const fetchOverview = useCallback(async () => {
    try {
      const url = selectedDatasetId
        ? `/api/analytics/overview?datasetId=${selectedDatasetId}`
        : '/api/analytics/overview';
      const res = await fetch(url, { headers: authHeaders });
      const data = await safeParseResponse<OverviewData>(res, {
        hasData: false,
        totalDatasets: 0,
        totalRecords: 0,
        activeEquipmentCount: 0,
        equipmentList: [],
        activeAlarmsCount: 0,
        criticalAlarmsCount: 0,
        metrics: {},
        latestTimestamp: null,
      });
      setOverview(data);
    } catch (err) {
      console.error('Error fetching overview:', err);
    }
  }, [token, selectedDatasetId]);

  const fetchInsights = useCallback(async () => {
    try {
      const url = selectedDatasetId
        ? `/api/analytics/insights?datasetId=${selectedDatasetId}`
        : '/api/analytics/insights';
      const res = await fetch(url, { headers: authHeaders });
      const data = await safeParseResponse<{ insights?: SmartInsight[] }>(res, { insights: [] });
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  }, [token, selectedDatasetId]);

  const fetchCharts = useCallback(async () => {
    try {
      const url = selectedDatasetId
        ? `/api/analytics/charts?datasetId=${selectedDatasetId}`
        : '/api/analytics/charts';
      const res = await fetch(url, { headers: authHeaders });
      const data = await safeParseResponse<{ charts?: ChartConfig[] }>(res, { charts: [] });
      setCharts(data.charts || []);
    } catch (err) {
      console.error('Error fetching charts:', err);
    }
  }, [token, selectedDatasetId]);

  const fetchAlarms = useCallback(async () => {
    try {
      const [rulesRes, eventsRes, statusRes] = await Promise.all([
        fetch('/api/alarms/rules', { headers: authHeaders }),
        fetch('/api/alarms/events', { headers: authHeaders }),
        fetch('/api/alarms/system-status', { headers: authHeaders }),
      ]);
      const rulesData = await safeParseResponse<{ rules?: AlarmRule[] }>(rulesRes, { rules: [] });
      const eventsData = await safeParseResponse<{ events?: AlarmEvent[]; summary?: any }>(eventsRes, { events: [] });

      const rawRules: AlarmRule[] = rulesData.rules || [];
      const seenRules = new Set<string>();
      const dedupedRules: AlarmRule[] = [];
      for (const r of rawRules) {
        if (!r.id || seenRules.has(r.id)) continue;
        seenRules.add(r.id);
        dedupedRules.push(r);
      }
      setAlarmRules(dedupedRules);

      const rawEvents: AlarmEvent[] = eventsData.events || [];
      const seenEvents = new Set<string>();
      const dedupedEvents: AlarmEvent[] = [];
      for (const e of rawEvents) {
        if (!e.id || seenEvents.has(e.id)) continue;
        seenEvents.add(e.id);
        dedupedEvents.push(e);
      }
      setAlarmEvents(dedupedEvents);

      if (eventsData.summary) {
        setAlarmSummary(eventsData.summary);
      }
      if (statusRes.ok) {
        const statusData = await safeParseResponse<{ systemEnabled?: boolean }>(statusRes, { systemEnabled: true });
        setAlarmSettings({ systemEnabled: statusData.systemEnabled !== false });
      }
    } catch (err) {
      console.error('Error fetching alarms:', err);
    }
  }, [token]);

  const toggleAlarmSystem = async (enabled?: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/alarms/system-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
      });
      if (res.ok) {
        const data = await safeParseResponse<{ systemEnabled: boolean }>(res, { systemEnabled: true });
        setAlarmSettings({ systemEnabled: data.systemEnabled });
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle alarm system:', err);
    }
    return false;
  };

  const fetchLayout = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/layout', { headers: authHeaders });
      const data = await safeParseResponse<{ layout?: DashboardLayout }>(res, { layout: undefined });
      setLayout(data.layout || null);
    } catch (err) {
      console.error('Error fetching layout:', err);
    }
  }, [token]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDatasets(),
      fetchOverview(),
      fetchInsights(),
      fetchCharts(),
      fetchAlarms(),
      fetchLayout(),
    ]);
    setLastUpdated(Date.now());
    setIsLoading(false);
  }, [fetchDatasets, fetchOverview, fetchInsights, fetchCharts, fetchAlarms, fetchLayout]);

  useEffect(() => {
    refreshData();
  }, [selectedDatasetId]);

  const uploadDataset = async (file: File, name?: string): Promise<{ success: boolean; error?: string }> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name) {
        formData.append('name', name);
      }

      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const data = await safeParseResponse<{ dataset?: any; error?: string }>(res, {});
      if (res.ok) {
        if (data.dataset?.id) {
          setSelectedDatasetId(data.dataset.id);
        }
        await refreshData();
        return { success: true };
      }
      return {
        success: false,
        error: data.error || `Failed to parse or ingest dataset (Status ${res.status}). Please check file format.`,
      };
    } catch (err: any) {
      console.error('Failed to upload dataset:', err);
      return {
        success: false,
        error: err.message || 'Network error during dataset upload.',
      };
    } finally {
      setIsUploading(false);
    }
  };

  const seedSampleDataset = async () => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/datasets/seed-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      const data = await safeParseResponse<{ dataset?: any }>(res, {});
      if (res.ok && data.dataset?.id) {
        setSelectedDatasetId(data.dataset.id);
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to seed sample telemetry:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const acknowledgeAlarm = async (id: string) => {
    try {
      const res = await fetch(`/api/alarms/events/${id}/acknowledge`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAlarms();
      }
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  };

  const resolveAlarm = async (id: string, notes?: string) => {
    try {
      const res = await fetch(`/api/alarms/events/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ resolutionNotes: notes }),
      });
      if (res.ok) {
        await fetchAlarms();
      }
    } catch (err) {
      console.error('Failed to resolve alarm:', err);
    }
  };

  const clearAlarm = async (id: string) => {
    try {
      const res = await fetch(`/api/alarms/events/${id}/clear`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAlarms();
      }
    } catch (err) {
      console.error('Failed to clear alarm:', err);
    }
  };

  const clearAlarmsBatch = async (ids: string[]): Promise<{ success: boolean; clearedCount: number }> => {
    try {
      const res = await fetch('/api/alarms/events/clear-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await safeParseResponse<{ clearedCount?: number }>(res, {});
        await fetchAlarms();
        return { success: true, clearedCount: data.clearedCount || 0 };
      }
    } catch (err) {
      console.error('Failed to batch clear alarms:', err);
    }
    return { success: false, clearedCount: 0 };
  };

  const clearAllAlarms = async (filter?: { datasetId?: string; level?: string; equipmentId?: string }): Promise<{ success: boolean; clearedCount: number }> => {
    try {
      const res = await fetch('/api/alarms/events/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(filter || {}),
      });
      if (res.ok) {
        const data = await safeParseResponse<{ clearedCount?: number }>(res, {});
        await fetchAlarms();
        return { success: true, clearedCount: data.clearedCount || 0 };
      }
    } catch (err) {
      console.error('Failed to clear all alarms:', err);
    }
    return { success: false, clearedCount: 0 };
  };

  const saveAlarmRule = async (rule: Partial<AlarmRule>): Promise<boolean> => {
    try {
      const method = rule.id ? 'PUT' : 'POST';
      const url = rule.id ? `/api/alarms/rules/${rule.id}` : '/api/alarms/rules';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(rule),
      });
      if (res.ok) {
        await fetchAlarms();
        await fetchOverview();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save alarm rule:', err);
      return false;
    }
  };

  const deleteAlarmRule = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/alarms/rules/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAlarms();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete alarm rule:', err);
      return false;
    }
  };

  const reEvaluateAlarms = async () => {
    try {
      const res = await fetch('/api/alarms/re-evaluate', {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAlarms();
        await fetchOverview();
      }
    } catch (err) {
      console.error('Failed to re-evaluate alarms:', err);
    }
  };

  const saveChartConfig = async (chart: Partial<ChartConfig>): Promise<boolean> => {
    try {
      const method = chart.id ? 'PUT' : 'POST';
      const url = chart.id ? `/api/analytics/charts/${chart.id}` : '/api/analytics/charts';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...chart,
          datasetId: chart.datasetId || selectedDatasetId || currentDataset?.id,
        }),
      });
      if (res.ok) {
        await fetchCharts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save chart config:', err);
      return false;
    }
  };

  const deleteChartConfig = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/analytics/charts/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchCharts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete chart config:', err);
      return false;
    }
  };

  const updateLayout = async (widgets: DashboardWidget[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/dashboard/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ widgets }),
      });
      if (res.ok) {
        const data = await safeParseResponse<{ layout?: DashboardLayout }>(res, {});
        if (data.layout) setLayout(data.layout);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update layout:', err);
      return false;
    }
  };

  const updateDashboardLayout = async (layoutObj: DashboardLayout): Promise<boolean> => {
    return updateLayout(layoutObj.widgets);
  };

  const replaceDataset = async (datasetId: string, file: File): Promise<{ success: boolean; error?: string }> => {
    if (!datasetId) return { success: false, error: 'No dataset ID specified.' };
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/replace`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await safeParseResponse<{ error?: string }>(res, {});
      if (res.ok) {
        await refreshData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to replace dataset.' };
    } catch (err: any) {
      console.error('Failed to replace dataset:', err);
      return { success: false, error: err.message || 'Network error during dataset replacement.' };
    } finally {
      setIsUploading(false);
    }
  };

  const appendDataset = async (
    datasetId: string,
    file: File,
    duplicateStrategy: 'skip' | 'overwrite' = 'skip'
  ): Promise<{ success: boolean; error?: string; added?: number; duplicatesSkipped?: number }> => {
    if (!datasetId) return { success: false, error: 'No dataset ID specified.' };
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicateStrategy', duplicateStrategy);
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/append`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await safeParseResponse<{ added?: number; duplicatesSkipped?: number; error?: string }>(res, {});
      if (res.ok) {
        await refreshData();
        return {
          success: true,
          added: data.added,
          duplicatesSkipped: data.duplicatesSkipped,
        };
      }
      return { success: false, error: data.error || 'Failed to append dataset.' };
    } catch (err: any) {
      console.error('Failed to append dataset:', err);
      return { success: false, error: err.message || 'Network error during dataset append.' };
    } finally {
      setIsUploading(false);
    }
  };

  const updateDatasetMeta = async (datasetId: string, updates: Partial<Dataset>): Promise<boolean> => {
    if (!datasetId) return false;
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update dataset metadata:', err);
      return false;
    }
  };

  const fetchDatasetRecords = async (
    datasetId: string,
    params?: {
      search?: string;
      equipment?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ records: any[]; total: number }> => {
    if (!datasetId || datasetId === 'undefined' || datasetId === 'null') {
      return { records: [], total: 0 };
    }
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.equipment && params.equipment !== 'ALL') searchParams.append('equipment', params.equipment);
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
      if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));
      if (params?.offset !== undefined) searchParams.append('offset', String(params.offset));

      const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/records${queryStr}`, {
        headers: authHeaders,
      });
      const data = await safeParseResponse<{ records?: any[]; pagination?: { total?: number } }>(res, { records: [], pagination: { total: 0 } });
      return {
        records: data.records || [],
        total: data.pagination?.total || (data.records ? data.records.length : 0),
      };
    } catch (err) {
      console.error('Failed to fetch dataset records:', err);
      return { records: [], total: 0 };
    }
  };

  const addRecord = async (
    datasetId: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    if (!datasetId) return false;
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add record:', err);
      return false;
    }
  };

  const updateRecord = async (
    datasetId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    if (!datasetId || !recordId) return false;
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/records/${encodeURIComponent(recordId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update record:', err);
      return false;
    }
  };

  const deleteRecord = async (datasetId: string, recordId: string): Promise<boolean> => {
    if (!datasetId || !recordId) return false;
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/records/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete record:', err);
      return false;
    }
  };

  const bulkUpdateRecords = async (
    datasetId: string,
    action: 'delete' | 'update',
    payload: any
  ): Promise<{ success: boolean; affected: number }> => {
    if (!datasetId) return { success: false, affected: 0 };
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/records/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        const data = await safeParseResponse<{ affected?: number }>(res, {});
        await refreshData();
        return { success: true, affected: data.affected || 0 };
      }
      return { success: false, affected: 0 };
    } catch (err) {
      console.error('Failed to execute bulk update:', err);
      return { success: false, affected: 0 };
    }
  };

  const previewFile = async (file: File): Promise<any> => {
    // 1. First attempt server-side preview API
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/datasets/preview', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.columns && Array.isArray(data.columns)) {
          return data;
        }
      }
    } catch (serverErr) {
      console.warn('[DataContext] Server preview request failed, applying client-side fallback parser:', serverErr);
    }

    // 2. High-reliability client-side parsing fallback using PapaParse / SheetJS
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let rows: Record<string, any>[] = [];

      if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, any>>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: 'greedy',
          transformHeader: (h: string) => h.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, ''),
        });
        rows = (parsed.data || []).filter(
          (r) => r && typeof r === 'object' && Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '')
        );
      } else {
        // Excel (.xlsx, .xls)
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          rows = json.filter(
            (r) => r && typeof r === 'object' && Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '')
          );
        }
      }

      if (!rows || rows.length === 0) {
        throw new Error(`File "${file.name}" is empty or has no recognizable data rows.`);
      }

      const colNames = Object.keys(rows[0] || {});
      const columns = colNames.map((col) => {
        const lower = col.toLowerCase();
        const isTimestamp = lower.includes('time') || lower.includes('date') || lower.includes('timestamp') || lower === 'ts';
        const isEquipment = lower.includes('equip') || lower.includes('unit') || lower.includes('gen') || lower.includes('machine') || lower.includes('asset');
        const sampleVals = rows.slice(0, 5).map((r) => r[col]).filter((v) => v !== undefined && v !== null);
        const numCount = sampleVals.filter((v) => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')).length;
        const isNumeric = numCount >= Math.max(1, sampleVals.length * 0.7);

        return {
          name: col,
          displayName: col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          dataType: isTimestamp ? 'datetime' : isNumeric ? 'numeric' : 'string',
          sampleValues: sampleVals,
          isTimestamp,
          isEquipment,
        };
      });

      const dateCol = columns.find((c) => c.isTimestamp)?.name;
      const equipCol = columns.find((c) => c.isEquipment)?.name;

      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: ext,
        totalRows: rows.length,
        columns,
        suggestedDateColumn: dateCol,
        suggestedEquipmentColumn: equipCol,
        sampleRows: rows.slice(0, 10),
      };
    } catch (parseErr: any) {
      console.error('[DataContext] Client-side fallback preview failed:', parseErr);
      throw new Error(parseErr.message || 'Unable to parse file structure. Please ensure it is a valid CSV or Excel file.');
    }
  };

  const downloadDatasetCSV = (datasetId: string) => {
    window.open(`/api/datasets/${datasetId}/download`, '_blank');
  };

  const deleteDataset = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        if (selectedDatasetId === id) {
          setSelectedDatasetId(null);
        }
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      return false;
    }
  };

  const clearAllDatasets = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/datasets/clear-all', {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        setSelectedDatasetId(null);
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to clear all datasets:', err);
      return false;
    }
  };

  const exportDatasetCSV = (datasetId: string) => {
    const params = new URLSearchParams();
    if (filters.equipment && filters.equipment !== 'ALL') {
      params.append('equipment', filters.equipment);
    }
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    window.open(`/api/export/dataset/${datasetId}/csv${queryString}`, '_blank');
  };

  const exportAlarmsCSV = (status?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    window.open(`/api/export/alarms/csv${queryString}`, '_blank');
  };

  const exportTemperatureCSV = (overrideFilters?: { equipment?: string; status?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (selectedDatasetId) params.append('datasetId', selectedDatasetId);
    const effFilters = overrideFilters || filters;
    if (effFilters.equipment && effFilters.equipment !== 'ALL') params.append('equipment', effFilters.equipment);
    if ((effFilters as any).status && (effFilters as any).status !== 'ALL') params.append('status', (effFilters as any).status);
    if (effFilters.startDate) params.append('startDate', effFilters.startDate);
    if (effFilters.endDate) params.append('endDate', effFilters.endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    window.open(`/api/export/temperature/csv${queryString}`, '_blank');
  };

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;

  return (
    <DataContext.Provider
      value={{
        datasets,
        selectedDatasetId,
        setSelectedDatasetId,
        currentDataset,
        overview,
        insights,
        charts,
        alarmRules,
        alarmEvents,
        alarmSummary,
        layout,
        dashboardLayout: layout,
        filters,
        setFilters,
        isLoading,
        isUploading,
        setIsUploading,
        isUploadModalOpen,
        setIsUploadModalOpen,
        refreshData,
        refreshAlarms: fetchAlarms,
        uploadDataset,
        replaceDataset,
        appendDataset,
        updateDatasetMeta,
        fetchDatasetRecords,
        addRecord,
        updateRecord,
        deleteRecord,
        bulkUpdateRecords,
        previewFile,
        downloadDatasetCSV,
        seedSampleDataset,
        acknowledgeAlarm,
        resolveAlarm,
        clearAlarm,
        clearAlarmsBatch,
        clearAllAlarms,
        saveAlarmRule,
        deleteAlarmRule,
        reEvaluateAlarms,
        saveChartConfig,
        deleteChartConfig,
        updateLayout,
        updateDashboardLayout,
        deleteDataset,
        clearAllDatasets,
        exportDatasetCSV,
        exportAlarmsCSV,
        exportTemperatureCSV,
        alarmSettings,
        toggleAlarmSystem,
        audioSettings,
        updateAudioSettings,
        testAudioAlert,
        isAudioMuted,
        toggleAudioMute,
        lastUpdated,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
