import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Upload,
  Flame,
  Zap,
  Radio,
  Droplet,
  Gauge,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Database,
  Plus,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DatasetMetricsOverview, MetricDefinition, MetricAnalyticsPayload } from '../../types';
import { MetricCardSection } from './MetricCardSection';
import { AlarmAnalyticsView } from './AlarmAnalyticsView';

interface MetricExplorerViewProps {
  onOpenUpload?: () => void;
}

export const MetricExplorerView: React.FC<MetricExplorerViewProps> = ({ onOpenUpload }) => {
  const { datasets, selectedDatasetId, setSelectedDatasetId, seedSampleDataset, isUploading, filters, setFilters } = useData();
  const { isStaff, isAdmin, token } = useAuth();

  const [overview, setOverview] = useState<DatasetMetricsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const selectedEquipment = filters.equipment || 'ALL';
  const setSelectedEquipment = (eq: string) => {
    setFilters((prev) => ({ ...prev, equipment: eq }));
  };

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch Dataset Metric Overview from Backend
  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/metrics/overview?datasetId=${selectedDatasetId || ''}&equipment=${selectedEquipment !== 'ALL' ? selectedEquipment : ''}`,
        {
          headers: authHeaders,
        }
      );
      if (res.ok) {
        const data: DatasetMetricsOverview = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to load metric analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, selectedEquipment, token]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Handle Saving Metric Configuration
  const handleUpdateMetricConfig = async (metricKey: string, updated: Partial<MetricDefinition>) => {
    try {
      const res = await fetch('/api/metrics/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          metricKey,
          config: updated,
        }),
      });
      if (res.ok) {
        // Refetch to apply changes
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to save metric config:', err);
    }
  };

  // Filter metrics
  const detectedMetrics = overview?.detectedMetrics || [];
  const filteredMetrics = detectedMetrics.filter((m) => {
    if (!m.isVisible) return false;
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Extract distinct equipment list
  const sampleMetricData = overview?.metricsData ? (Object.values(overview.metricsData)[0] as MetricAnalyticsPayload | undefined) : null;
  const equipmentOptions = sampleMetricData?.equipmentList ? ['ALL', ...sampleMetricData.equipmentList] : ['ALL'];

  // Category counts
  const categoryCounts = detectedMetrics.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Top Header & Sticky Action Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wide text-white uppercase font-sans flex items-center gap-2">
                  Unified Metric & Telemetry Analytics
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono font-bold">
                    One Metric = One Visualization
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated schema analysis generating dedicated multi-generator comparison, distribution analytics, and live threshold monitoring per metric
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Dataset Switcher */}
          <div className="flex items-center flex-wrap gap-2.5">
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 max-w-[240px]"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalRows} rows)
                </option>
              ))}
            </select>

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/70 transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload Telemetry
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar (Live Search, Category Pills, Equipment Dropdown) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search metrics (e.g. Temperature, Voltage, Power, Frequency, Pressure, Fuel)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
          </div>

          {/* Generator / Equipment Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Unit / Generator Filter:</span>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-cyan-500"
            >
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>
                  {eq === 'ALL' ? 'All Generators / Units' : eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-slate-800/80 mt-4 pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Metrics ({detectedMetrics.length})
          </button>

          {categoryCounts['temperature'] && (
            <button
              onClick={() => setSelectedCategory('temperature')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'temperature'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Temperature ({categoryCounts['temperature']})
            </button>
          )}

          {categoryCounts['voltage'] && (
            <button
              onClick={() => setSelectedCategory('voltage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'voltage'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              Voltage ({categoryCounts['voltage']})
            </button>
          )}

          {categoryCounts['power'] && (
            <button
              onClick={() => setSelectedCategory('power')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'power'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Active Power ({categoryCounts['power']})
            </button>
          )}

          {categoryCounts['frequency'] && (
            <button
              onClick={() => setSelectedCategory('frequency')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'frequency'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Frequency ({categoryCounts['frequency']})
            </button>
          )}

          {categoryCounts['fuel'] && (
            <button
              onClick={() => setSelectedCategory('fuel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'fuel'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Droplet className="w-3.5 h-3.5 text-purple-400" />
              Fuel Level ({categoryCounts['fuel']})
            </button>
          )}

          {categoryCounts['pressure'] && (
            <button
              onClick={() => setSelectedCategory('pressure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'pressure'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Pressure ({categoryCounts['pressure']})
            </button>
          )}

          {categoryCounts['duration'] && (
            <button
              onClick={() => setSelectedCategory('duration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'duration'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              Duration ({categoryCounts['duration']})
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full h-80 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse p-6"
            />
          ))}
        </div>
      )}

      {/* Dedicated Alarm Analytics (if dataset contains alarm logs) */}
      {!isLoading && overview?.alarmAnalytics && (
        <AlarmAnalyticsView analytics={overview.alarmAnalytics} />
      )}

      {/* Render Each Metric in its Dedicated Section */}
      {!isLoading && filteredMetrics.length > 0 && (
        <div className="space-y-8">
          {filteredMetrics.map((m) => {
            const metricPayload = overview?.metricsData[m.id];
            if (!metricPayload) return null;
            return (
              <MetricCardSection
                key={m.id}
                payload={metricPayload}
                onUpdateMetricConfig={handleUpdateMetricConfig}
                isAdminOrStaff={isStaff || isAdmin}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMetrics.length === 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-800/80 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-700">
            <Database className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Matching Metrics Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery
                ? `No metrics matched your search "${searchQuery}". Try searching for Temperature, Voltage, Power, Frequency, Fuel, or Duration.`
                : 'Upload a CSV, XLS, or XLSX telemetry dataset to automatically generate metric-separated 3D graphs and multi-generator comparisons.'}
            </p>
          </div>
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Telemetry File
            </button>
          )}
        </div>
      )}
    </div>
  );
};
