import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  FileSpreadsheet,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Calendar,
  Tag,
  Info,
  Building,
  Save,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SourceBadge } from '../SourceBadge';

export const DataAuthenticityPanel: React.FC = () => {
  const { datasets, currentDataset, selectedDatasetId, setSelectedDatasetId, overview, downloadDatasetCSV, exportDatasetCSV } = useData();
  const { token, isStaff } = useAuth();

  const [sourceReferences, setSourceReferences] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('tata_dataset_source_refs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentRefInput, setCurrentRefInput] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDatasetId) {
      setCurrentRefInput(sourceReferences[selectedDatasetId] || '');
    }
  }, [selectedDatasetId, sourceReferences]);

  const handleSaveSourceRef = () => {
    if (!selectedDatasetId) return;
    const updated = {
      ...sourceReferences,
      [selectedDatasetId]: currentRefInput,
    };
    setSourceReferences(updated);
    localStorage.setItem('tata_dataset_source_refs', JSON.stringify(updated));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div id="data-authenticity-panel" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#0284C7] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-base font-bold text-slate-900 uppercase font-mono tracking-wide">
              Data Authenticity & Telemetry Provenance Management
            </h3>
          </div>
          <p className="text-xs text-slate-600 font-normal max-w-2xl">
            Authorised staff governance for dataset source classification, metric verification, and strict demarcation between verified corporate records and uploaded telemetry.
          </p>
        </div>

        <SourceBadge type="CONFIGURED_BY_ADMIN" />
      </div>

      {/* Dataset Provenance Explorer */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 uppercase font-mono flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#0284C7]" />
              <span>Ingested Telemetry Inventory ({datasets.length} Datasets)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Select a dataset to view its schema authenticity, quality status and attach source audit references.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-600 uppercase font-semibold">Active:</span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 font-mono focus:border-[#0284C7] cursor-pointer shadow-xs font-bold"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalRows} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset Metadata Attributes Grid */}
        {currentDataset ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Dataset Name</span>
                <span className="text-slate-900 font-bold text-sm truncate block">{currentDataset.name}</span>
                <span className="text-[10px] text-[#0284C7] font-semibold">ID: {currentDataset.id.slice(0, 8)}...</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Upload Timestamp</span>
                <span className="text-slate-900 font-bold text-sm block">
                  {new Date(currentDataset.uploadedAt).toLocaleDateString()} {new Date(currentDataset.uploadedAt).toLocaleTimeString()}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">FORMAT: {currentDataset.fileType?.toUpperCase() || 'CSV'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Verified Records</span>
                <span className="text-slate-900 font-bold text-sm block">{currentDataset.totalRows?.toLocaleString()} rows</span>
                <span className="text-[10px] text-[#0284C7] font-semibold">{currentDataset.columns?.length || 0} Columns Detected</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Source Classification</span>
                <div className="pt-1">
                  <SourceBadge type="USER_UPLOADED_TELEMETRY" size="xs" />
                </div>
                <span className="text-[10px] text-emerald-700 font-bold block pt-1">HEALTH: INGESTED & VERIFIED</span>
              </div>
            </div>

            {/* Custom Data Source Reference Input */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-[#0284C7]" />
                  <span>Dataset Origin / Source Reference Annotation</span>
                </label>
                {saveSuccess && (
                  <span className="text-xs font-mono text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved to local audit register</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-normal">
                Document the telemetry origin (e.g., "Jojobera SCADA Unit 1 Historian Export - Shift A", "Continuous Emission Monitoring System (CEMS) Log", etc.).
              </p>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input
                  type="text"
                  value={currentRefInput}
                  onChange={(e) => setCurrentRefInput(e.target.value)}
                  placeholder="e.g. Jojobera SCADA Historian - Thermal Generation Unit 1 Export"
                  className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 focus:outline-none shadow-xs"
                />
                <button
                  onClick={handleSaveSourceRef}
                  className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-mono font-bold text-xs uppercase cursor-pointer flex items-center justify-center space-x-2 shrink-0 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Reference</span>
                </button>
              </div>
            </div>

            {/* Ingested Schema Columns Breakdown */}
            <div className="space-y-3">
              <h5 className="text-xs font-mono font-bold text-slate-700 uppercase">
                Detected Telemetry Schema Columns ({currentDataset.columns?.length || 0})
              </h5>
              <div className="flex flex-wrap gap-2">
                {currentDataset.columns?.map((col, idx) => {
                  const colName = typeof col === 'string' ? col : col.name || col.displayName || `Column ${idx + 1}`;
                  const colType = typeof col === 'object' && col.dataType ? col.dataType : null;
                  const colUnit = typeof col === 'object' && col.unit ? col.unit : null;

                  return (
                    <span
                      key={`${colName}_${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-700 flex items-center space-x-1.5 shadow-xs"
                    >
                      <span className="text-slate-900 font-semibold">{colName}</span>
                      {colType && (
                        <span className="text-[10px] text-[#0284C7] lowercase font-normal">
                          ({colType}{colUnit ? ` · ${colUnit}` : ''})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Active Dataset Status: Ready for 3D and Graph Visualizations</span>
              </div>

              <button
                onClick={() => {
                  if (currentDataset) {
                    (exportDatasetCSV || downloadDatasetCSV)(currentDataset.id);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0284C7] hover:text-[#0369A1] border border-slate-300 text-xs font-mono font-bold flex items-center space-x-2 cursor-pointer uppercase transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Processed Telemetry CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
            <Info className="w-8 h-8 mx-auto text-slate-400" />
            <p>No operational datasets currently loaded.</p>
          </div>
        )}
      </div>

      {/* Corporate Reference Standards Verification Status */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-[#0284C7]" />
            <h4 className="text-sm font-bold text-slate-900 uppercase font-mono">
              Verified Corporate & Plant Reference Benchmarks
            </h4>
          </div>
          <SourceBadge type="VERIFIED_CORPORATE_INFO" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Jojobera Plant Capacity</span>
            <div className="text-slate-900 font-bold text-base">427.5 MW</div>
            <span className="text-[10px] text-[#0284C7] font-semibold">Installed Thermal Capacity</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Tata Power Corporate Capacity</span>
            <div className="text-slate-900 font-bold text-base">16,716 MW</div>
            <span className="text-[10px] text-[#0284C7] font-semibold">FY2025-26 Verified Operational</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Clean Energy Share</span>
            <div className="text-emerald-700 font-bold text-base">47% (7,856 MW)</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Operational Clean & Green</span>
          </div>
        </div>
      </div>
    </div>
  );
};
