import React, { useState } from 'react';
import {
  Database,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Calendar,
  UserCheck,
  Search,
  Archive,
  BarChart3,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { Dataset } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RecordEditorModal } from './RecordEditorModal';
import { DatasetUpdateModal } from './DatasetUpdateModal';

export const DatasetManagementPanel: React.FC = () => {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    deleteDataset,
    updateDatasetMeta,
    downloadDatasetCSV,
    setIsUploadModalOpen,
    seedSampleDataset,
    refreshData,
  } = useData();

  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [recordEditorDataset, setRecordEditorDataset] = useState<Dataset | null>(null);
  const [updateModalDataset, setUpdateModalDataset] = useState<Dataset | null>(null);

  // Metadata edit modal
  const [editingMetaDataset, setEditingMetaDataset] = useState<Dataset | null>(null);
  const [editMetaName, setEditMetaName] = useState('');
  const [editMetaCategory, setEditMetaCategory] = useState('');
  const [editMetaDesc, setEditMetaDesc] = useState('');

  // Delete confirmation modal
  const [deletingDataset, setDeletingDataset] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate high-level summary KPIs
  const totalDatasets = datasets.length;
  const totalRecords = datasets.reduce((acc, d) => acc + (d.totalRows || 0), 0);
  const totalDetectedMetrics = Array.from(
    new Set(
      datasets.flatMap(
        (d) => d.columns?.filter((c) => c.dataType === 'numeric' && !c.isIdentifier).map((c) => c.name) || []
      )
    )
  ).length;

  const categories = Array.from(new Set(datasets.map((d) => d.category || 'General Telemetry')));

  // Filter datasets
  const filteredDatasets = datasets.filter((d) => {
    if (!showArchived && d.isArchived) return false;
    if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchName = d.name.toLowerCase().includes(q);
      const matchFile = d.fileName?.toLowerCase().includes(q);
      const matchUser = d.uploadedBy?.toLowerCase().includes(q);
      const matchCat = d.category?.toLowerCase().includes(q);
      if (!matchName && !matchFile && !matchUser && !matchCat) return false;
    }
    return true;
  });

  const handleStartEditMeta = (dataset: Dataset) => {
    setEditingMetaDataset(dataset);
    setEditMetaName(dataset.name);
    setEditMetaCategory(dataset.category || 'Thermal Generation Operations');
    setEditMetaDesc(dataset.description || '');
  };

  const handleSaveMeta = async () => {
    if (!editingMetaDataset) return;
    const success = await updateDatasetMeta(editingMetaDataset.id, {
      name: editMetaName.trim() || editingMetaDataset.name,
      category: editMetaCategory.trim() || editingMetaDataset.category,
      description: editMetaDesc.trim(),
    });
    if (success) {
      setNotification({ type: 'success', message: 'Dataset metadata updated successfully.' });
      setEditingMetaDataset(null);
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to update dataset metadata.' });
    }
  };

  const handleToggleArchive = async (dataset: Dataset) => {
    const newArchivedState = !dataset.isArchived;
    const success = await updateDatasetMeta(dataset.id, {
      isArchived: newArchivedState,
    });
    if (success) {
      setNotification({
        type: 'success',
        message: `Dataset "${dataset.name}" ${newArchivedState ? 'archived' : 'restored'}.`,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDataset) return;
    setIsDeleting(true);
    const success = await deleteDataset(deletingDataset.id);
    setIsDeleting(false);
    if (success) {
      setNotification({
        type: 'success',
        message: `Dataset "${deletingDataset.name}" permanently deleted.`,
      });
      setDeletingDataset(null);
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to delete dataset.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 animate-in fade-in shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#0284C7] space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-slate-600 uppercase font-semibold flex items-center justify-between">
            <span>Total Datasets</span>
            <Database className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalDatasets}</div>
          <div className="text-[10px] font-mono text-slate-500">Stored persistently in database</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 border-l-4 border-l-emerald-500 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-slate-600 uppercase font-semibold flex items-center justify-between">
            <span>Total Telemetry Records</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalRecords.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-slate-500">Active telemetry data points</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 border-l-4 border-l-sky-500 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-slate-600 uppercase font-semibold flex items-center justify-between">
            <span>Detected Metrics</span>
            <BarChart3 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalDetectedMetrics}</div>
          <div className="text-[10px] font-mono text-slate-500">Monitored sensor channels</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 border-l-4 border-l-indigo-500 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-slate-600 uppercase font-semibold flex items-center justify-between">
            <span>Active Target Dataset</span>
            <Eye className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            {datasets.find((d) => d.id === selectedDatasetId)?.name || 'Default (Auto-Selected)'}
          </div>
          <div className="text-[10px] font-mono text-slate-500">Global analytics synchronization</div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets by name, file, user, category..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 shadow-xs"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#0284C7] cursor-pointer shadow-xs font-semibold"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center space-x-1.5 text-slate-700 cursor-pointer px-2.5 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-300 font-semibold shadow-xs">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-[#0284C7]"
              />
              <span className="text-[11px]">Show Archived</span>
            </label>

            <button
              onClick={refreshData}
              className="p-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200 cursor-pointer transition-colors shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => seedSampleDataset()}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-400 text-slate-800 flex items-center space-x-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider transition-colors shadow-xs font-bold"
              title="Load Jojobera Units 1-4 Sample Telemetry"
            >
              <Zap className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Seed Sample</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold flex items-center space-x-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Dataset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="table-responsive-container rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <th className="p-3 uppercase">Dataset Name</th>
              <th className="p-3 uppercase">Source File</th>
              <th className="p-3 uppercase">Category</th>
              <th className="p-3 uppercase">Total Records</th>
              <th className="p-3 uppercase">Detected Metrics</th>
              <th className="p-3 uppercase">Uploaded By</th>
              <th className="p-3 uppercase">Status</th>
              <th className="p-3 uppercase text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDatasets.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No datasets found. Click <strong className="text-[#0284C7]">"Ingest Dataset"</strong> or{' '}
                  <strong className="text-[#0284C7]">"Seed Sample"</strong> to populate.
                </td>
              </tr>
            ) : (
              filteredDatasets.map((ds) => {
                const isSelected = ds.id === selectedDatasetId;
                const numericCols = ds.columns?.filter((c) => c.dataType === 'numeric' && !c.isIdentifier) || [];

                return (
                  <tr
                    key={ds.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-[#0284C7]/5 border-l-4 border-l-[#0284C7]' : ''
                    }`}
                  >
                    {/* Dataset Name */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5 font-sans">
                        <span>{ds.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-[#0284C7] text-white text-[9px] uppercase font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {ds.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ds.description}</div>
                      )}
                    </td>

                    {/* Source File & Type */}
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                        <span className="text-slate-900 font-medium truncate max-w-[140px]">{ds.fileName || 'Data Stream'}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 border border-slate-300 uppercase text-slate-700 font-bold">
                          {ds.fileType || 'CSV'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {ds.fileSize ? `${(ds.fileSize / 1024).toFixed(1)} KB` : 'Direct Upload'}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[11px] text-slate-800 font-medium">
                        {ds.category || 'Plant Telemetry'}
                      </span>
                    </td>

                    {/* Records */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-slate-900 font-bold">{ds.totalRows?.toLocaleString() || 0}</div>
                      <div className="text-[10px] text-emerald-700 font-medium">{ds.validRows?.toLocaleString() || 0} valid</div>
                    </td>

                    {/* Metrics Channels */}
                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-900 font-bold">{numericCols.length}</span>
                        <span className="text-slate-500 text-[11px]">channels</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 max-w-[160px]">
                        {numericCols.slice(0, 3).map((col) => (
                          <span
                            key={col.name}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 truncate max-w-[70px]"
                            title={col.displayName || col.name}
                          >
                            {col.displayName || col.name}
                          </span>
                        ))}
                        {numericCols.length > 3 && (
                          <span className="text-[9px] text-slate-500 font-semibold">+{numericCols.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Uploaded By */}
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      <div className="text-slate-900 font-semibold">{ds.uploadedBy || 'Operator'}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(ds.uploadedAt).toLocaleDateString()}{' '}
                        {new Date(ds.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      {ds.isArchived ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 text-[10px] uppercase font-bold">
                          Archived
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] uppercase font-bold">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right pr-4 whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        {/* Make Active */}
                        <button
                          type="button"
                          onClick={() => setSelectedDatasetId(ds.id)}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border cursor-pointer transition-colors shadow-xs ${
                            isSelected
                              ? 'bg-[#0284C7] text-white border-[#0284C7]'
                              : 'bg-slate-100 border-slate-300 text-[#0284C7] hover:text-white hover:bg-[#0284C7] hover:border-[#0284C7]'
                          }`}
                          title={isSelected ? 'Active Dataset (Currently Loaded)' : 'Set as Active Target Dataset'}
                          aria-label="Set as Active Dataset"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Record Editor Modal */}
                        <button
                          type="button"
                          onClick={() => setRecordEditorDataset(ds)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-sky-700 hover:text-white hover:bg-[#0284C7] hover:border-[#0284C7] cursor-pointer transition-colors shadow-xs"
                          title="Manage & Edit Telemetry Records (Data Table)"
                          aria-label="Manage Telemetry Records"
                        >
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Update / Append Modal */}
                        <button
                          type="button"
                          onClick={() => setUpdateModalDataset(ds)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-emerald-700 hover:text-white hover:bg-emerald-600 hover:border-emerald-600 cursor-pointer transition-colors shadow-xs"
                          title="Append Records or Replace Dataset File"
                          aria-label="Append Records or Replace File"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Edit Metadata */}
                        <button
                          type="button"
                          onClick={() => handleStartEditMeta(ds)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-indigo-700 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 cursor-pointer transition-colors shadow-xs"
                          title="Edit Dataset Metadata & Categories"
                          aria-label="Edit Dataset Metadata"
                        >
                          <Pencil className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Download CSV */}
                        <button
                          type="button"
                          onClick={() => downloadDatasetCSV(ds.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-amber-700 hover:text-white hover:bg-amber-600 hover:border-amber-600 cursor-pointer transition-colors shadow-xs"
                          title="Download Dataset as CSV"
                          aria-label="Download Dataset CSV"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Archive Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(ds)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-purple-700 hover:text-white hover:bg-purple-600 hover:border-purple-600 cursor-pointer transition-colors shadow-xs"
                          title={ds.isArchived ? 'Restore Dataset' : 'Archive Dataset'}
                          aria-label={ds.isArchived ? 'Restore Dataset' : 'Archive Dataset'}
                        >
                          <Archive className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {/* Delete Dataset */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeletingDataset(ds)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-rose-600 hover:text-white hover:bg-rose-600 hover:border-rose-600 cursor-pointer transition-colors shadow-xs"
                            title="Permanently Delete Dataset"
                            aria-label="Permanently Delete Dataset"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Editor Modal */}
      {recordEditorDataset && (
        <RecordEditorModal
          dataset={recordEditorDataset}
          isOpen={Boolean(recordEditorDataset)}
          onClose={() => setRecordEditorDataset(null)}
        />
      )}

      {/* Dataset Update Modal */}
      {updateModalDataset && (
        <DatasetUpdateModal
          dataset={updateModalDataset}
          isOpen={Boolean(updateModalDataset)}
          onClose={() => setUpdateModalDataset(null)}
        />
      )}

      {/* Metadata Edit Modal */}
      {editingMetaDataset && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 uppercase font-sans">Edit Dataset Metadata</h3>
              <button
                onClick={() => setEditingMetaDataset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-slate-700 uppercase font-semibold">Dataset Name</label>
                <input
                  type="text"
                  value={editMetaName}
                  onChange={(e) => setEditMetaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 uppercase font-semibold">Operational Category</label>
                <input
                  type="text"
                  value={editMetaCategory}
                  onChange={(e) => setEditMetaCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 uppercase font-semibold">Description</label>
                <textarea
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 shadow-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingMetaDataset(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 uppercase font-bold cursor-pointer transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMeta}
                className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold uppercase cursor-pointer shadow-sm transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDataset && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold uppercase font-sans">Permanent Dataset Deletion</h3>
            </div>

            <p className="text-slate-700 leading-relaxed font-sans">
              Are you sure you want to permanently delete dataset{' '}
              <strong className="text-slate-900 font-bold">"{deletingDataset.name}"</strong>?
            </p>
            <p className="text-slate-600 font-sans">
              This will permanently delete all{' '}
              <strong className="text-rose-600 font-bold">{deletingDataset.totalRows} telemetry records</strong> and associated
              alarms from the persistent database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setDeletingDataset(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 uppercase font-bold cursor-pointer transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase cursor-pointer flex items-center space-x-1 shadow-sm transition-all"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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
