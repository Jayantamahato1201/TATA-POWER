import React, { useState } from 'react';
import {
  Database,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
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
      name: editMetaName,
      category: editMetaCategory,
      description: editMetaDesc,
    });
    if (success) {
      setNotification({ type: 'success', message: 'Dataset metadata updated.' });
      setEditingMetaDataset(null);
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to update metadata.' });
    }
  };

  const handleToggleArchive = async (dataset: Dataset) => {
    const nextArchived = !dataset.isArchived;
    const success = await updateDatasetMeta(dataset.id, {
      isArchived: nextArchived,
      status: nextArchived ? 'ARCHIVED' : 'ACTIVE',
    });
    if (success) {
      setNotification({
        type: 'success',
        message: `Dataset ${nextArchived ? 'archived' : 'restored'} successfully.`,
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
          className={`p-3 rounded-xs border text-xs font-mono flex items-center space-x-2 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xs bg-[#0E0E0E] border border-[#222] border-t-2 border-t-[#F27D26] space-y-1">
          <div className="text-[11px] font-mono text-[#888] uppercase flex items-center justify-between">
            <span>Total Datasets</span>
            <Database className="w-4 h-4 text-[#F27D26]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalDatasets}</div>
          <div className="text-[10px] font-mono text-[#666]">Stored persistently in database</div>
        </div>

        <div className="p-4 rounded-xs bg-[#0E0E0E] border border-[#222] border-t-2 border-t-[#00FF41] space-y-1">
          <div className="text-[11px] font-mono text-[#888] uppercase flex items-center justify-between">
            <span>Total Telemetry Records</span>
            <Layers className="w-4 h-4 text-[#00FF41]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalRecords.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-[#666]">Active telemetry data points</div>
        </div>

        <div className="p-4 rounded-xs bg-[#0E0E0E] border border-[#222] border-t-2 border-t-blue-500 space-y-1">
          <div className="text-[11px] font-mono text-[#888] uppercase flex items-center justify-between">
            <span>Detected Metrics</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalDetectedMetrics}</div>
          <div className="text-[10px] font-mono text-[#666]">Monitored sensor channels</div>
        </div>

        <div className="p-4 rounded-xs bg-[#0E0E0E] border border-[#222] border-t-2 border-t-purple-500 space-y-1">
          <div className="text-[11px] font-mono text-[#888] uppercase flex items-center justify-between">
            <span>Active Target Dataset</span>
            <Eye className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold font-mono text-white truncate">
            {datasets.find((d) => d.id === selectedDatasetId)?.name || 'Default (Auto-Selected)'}
          </div>
          <div className="text-[10px] font-mono text-[#666]">Global analytics synchronization</div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-4 rounded-xs bg-[#0E0E0E] border border-[#222] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets by name, file, user, category..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xs bg-[#161616] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-xs bg-[#161616] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center space-x-1.5 text-[#AAA] cursor-pointer px-2 py-1 bg-[#161616] rounded-xs border border-[#333]">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-[#F27D26]"
              />
              <span className="text-[11px]">Show Archived</span>
            </label>

            <button
              onClick={refreshData}
              className="p-1.5 rounded-xs bg-[#161616] border border-[#333] text-[#AAA] hover:text-white cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => seedSampleDataset()}
              className="px-3 py-1.5 rounded-xs bg-[#161616] border border-[#333] hover:border-[#F27D26]/40 text-[#AAA] hover:text-white flex items-center space-x-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider"
              title="Load Jojobera Units 1-4 Sample Telemetry"
            >
              <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Seed Sample</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold flex items-center space-x-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider shadow-[0_0_12px_rgba(242,125,38,0.25)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Dataset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-xs border border-[#222] bg-[#0E0E0E]">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#141414] text-[#888] border-b border-[#222]">
              <th className="p-3 font-semibold uppercase">Dataset Name</th>
              <th className="p-3 font-semibold uppercase">Source File</th>
              <th className="p-3 font-semibold uppercase">Category</th>
              <th className="p-3 font-semibold uppercase">Total Records</th>
              <th className="p-3 font-semibold uppercase">Detected Metrics</th>
              <th className="p-3 font-semibold uppercase">Uploaded By</th>
              <th className="p-3 font-semibold uppercase">Status</th>
              <th className="p-3 font-semibold uppercase text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {filteredDatasets.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#777]">
                  No datasets found. Click <strong className="text-[#F27D26]">"Ingest Dataset"</strong> or{' '}
                  <strong className="text-[#F27D26]">"Seed Sample"</strong> to populate.
                </td>
              </tr>
            ) : (
              filteredDatasets.map((ds) => {
                const isSelected = ds.id === selectedDatasetId;
                const numericCols = ds.columns?.filter((c) => c.dataType === 'numeric' && !c.isIdentifier) || [];

                return (
                  <tr
                    key={ds.id}
                    className={`hover:bg-[#141414] transition-colors ${
                      isSelected ? 'bg-[#F27D26]/5 border-l-2 border-l-[#F27D26]' : ''
                    }`}
                  >
                    {/* Dataset Name */}
                    <td className="p-3">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <span>{ds.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded-xs bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] text-[9px] uppercase font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {ds.description && (
                        <div className="text-[11px] text-[#777] line-clamp-1 mt-0.5">{ds.description}</div>
                      )}
                    </td>

                    {/* Source File & Type */}
                    <td className="p-3 text-[#AAA] whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                        <span className="text-white truncate max-w-[140px]">{ds.fileName || 'Data Stream'}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded-xs bg-[#1F1F1F] border border-[#333] uppercase text-[#888]">
                          {ds.fileType || 'CSV'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#666]">
                        {ds.fileSize ? `${(ds.fileSize / 1024).toFixed(1)} KB` : 'Direct Upload'}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-3 text-[#CCC] whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-xs bg-[#181818] border border-[#333] text-[11px]">
                        {ds.category || 'Plant Telemetry'}
                      </span>
                    </td>

                    {/* Records */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-white font-bold">{ds.totalRows?.toLocaleString() || 0}</div>
                      <div className="text-[10px] text-[#00FF41]">{ds.validRows?.toLocaleString() || 0} valid</div>
                    </td>

                    {/* Metrics Channels */}
                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-bold">{numericCols.length}</span>
                        <span className="text-[#666] text-[11px]">channels</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 max-w-[160px]">
                        {numericCols.slice(0, 3).map((col) => (
                          <span
                            key={col.name}
                            className="text-[9px] px-1 py-0.2 rounded-xs bg-[#1A1A1A] text-[#888] truncate max-w-[70px]"
                            title={col.displayName || col.name}
                          >
                            {col.displayName || col.name}
                          </span>
                        ))}
                        {numericCols.length > 3 && (
                          <span className="text-[9px] text-[#666]">+{numericCols.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Uploaded By */}
                    <td className="p-3 text-[#AAA] whitespace-nowrap">
                      <div className="text-white font-medium">{ds.uploadedBy || 'Operator'}</div>
                      <div className="text-[10px] text-[#666]">
                        {new Date(ds.uploadedAt).toLocaleDateString()}{' '}
                        {new Date(ds.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      {ds.isArchived ? (
                        <span className="px-2 py-0.5 rounded-xs bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] uppercase font-bold">
                          Archived
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-xs bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px] uppercase font-bold">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right pr-4 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Make Active */}
                        <button
                          onClick={() => setSelectedDatasetId(ds.id)}
                          className={`p-1.5 rounded-xs border cursor-pointer ${
                            isSelected
                              ? 'bg-[#F27D26] text-black border-[#F27D26]'
                              : 'bg-[#181818] border-[#333] text-[#AAA] hover:text-white hover:border-[#F27D26]'
                          }`}
                          title={isSelected ? 'Active Dataset' : 'Set as Active Dataset'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Record Editor Modal */}
                        <button
                          onClick={() => setRecordEditorDataset(ds)}
                          className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white hover:border-blue-500 cursor-pointer"
                          title="Manage & Edit Telemetry Records (Data Table)"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Update / Append Modal */}
                        <button
                          onClick={() => setUpdateModalDataset(ds)}
                          className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white hover:border-[#00FF41] cursor-pointer"
                          title="Append Data or Replace File"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#00FF41]" />
                        </button>

                        {/* Edit Metadata */}
                        <button
                          onClick={() => handleStartEditMeta(ds)}
                          className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white cursor-pointer"
                          title="Edit Dataset Metadata"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Download CSV */}
                        <button
                          onClick={() => downloadDatasetCSV(ds.id)}
                          className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white hover:border-amber-500 cursor-pointer"
                          title="Download Dataset as CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive Toggle */}
                        <button
                          onClick={() => handleToggleArchive(ds)}
                          className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white cursor-pointer"
                          title={ds.isArchived ? 'Restore Dataset' : 'Archive Dataset'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Dataset */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingDataset(ds)}
                            className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-rose-400 hover:border-rose-800 cursor-pointer"
                            title="Permanently Delete Dataset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-sm bg-[#0C0C0C] border border-[#262626] border-t-2 border-t-[#F27D26] shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-start border-b border-[#222] pb-3">
              <h3 className="text-base font-bold text-white uppercase">Edit Dataset Metadata</h3>
              <button
                onClick={() => setEditingMetaDataset(null)}
                className="p-1 rounded-xs text-[#888] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[#AAA] uppercase">Dataset Name</label>
                <input
                  type="text"
                  value={editMetaName}
                  onChange={(e) => setEditMetaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xs bg-[#161616] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#AAA] uppercase">Operational Category</label>
                <input
                  type="text"
                  value={editMetaCategory}
                  onChange={(e) => setEditMetaCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xs bg-[#161616] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#AAA] uppercase">Description</label>
                <textarea
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xs bg-[#161616] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#222]">
              <button
                onClick={() => setEditingMetaDataset(null)}
                className="px-3.5 py-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#888] uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMeta}
                className="px-4 py-1.5 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold uppercase cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDataset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-sm bg-[#0C0C0C] border border-[#262626] border-t-2 border-t-rose-600 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold uppercase">Permanent Dataset Deletion</h3>
            </div>

            <p className="text-[#CCC] leading-relaxed">
              Are you sure you want to permanently delete dataset{' '}
              <strong className="text-white">"{deletingDataset.name}"</strong>?
            </p>
            <p className="text-[#888]">
              This will permanently delete all{' '}
              <strong className="text-rose-400">{deletingDataset.totalRows} telemetry records</strong> and associated
              alarms from the persistent database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#222]">
              <button
                onClick={() => setDeletingDataset(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#888] hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xs bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase cursor-pointer flex items-center space-x-1"
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
