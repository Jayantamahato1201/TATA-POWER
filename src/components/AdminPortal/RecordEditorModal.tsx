import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  Save,
  Download,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
} from 'lucide-react';
import { Dataset, DataRecord } from '../../types';
import { useData } from '../../context/DataContext';

interface RecordEditorModalProps {
  dataset: Dataset;
  isOpen: boolean;
  onClose: () => void;
}

export const RecordEditorModal: React.FC<RecordEditorModalProps> = ({ dataset, isOpen, onClose }) => {
  const { fetchDatasetRecords, updateRecord, deleteRecord, bulkUpdateRecords, refreshData } = useData();

  const [records, setRecords] = useState<DataRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('ALL');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Column fields to display in table
  const displayColumns = dataset.columns || [];

  const loadRecords = useCallback(async () => {
    if (!dataset?.id) {
      setRecords([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const res = await fetchDatasetRecords(dataset.id, {
        search: searchQuery,
        equipment: selectedEquipment,
        sortBy,
        sortOrder,
        limit: pageSize,
        offset,
      });
      setRecords(res?.records || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      console.error('Failed to load dataset records:', err);
      setRecords([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [dataset?.id, page, searchQuery, selectedEquipment, sortBy, sortOrder, fetchDatasetRecords]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen, loadRecords]);

  if (!isOpen) return null;

  const handleStartEdit = (record: DataRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({ ...record.data });
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (recordId: string) => {
    const success = await updateRecord(dataset.id, recordId, editFormData);
    if (success) {
      setNotification({ type: 'success', message: 'Record updated successfully.' });
      setEditingRecordId(null);
      await loadRecords();
      await refreshData();
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to update record.' });
    }
  };

  const handleDeleteSingle = async (recordId: string) => {
    if (!confirm('Are you sure you want to permanently delete this telemetry record?')) return;
    const success = await deleteRecord(dataset.id, recordId);
    if (success) {
      setNotification({ type: 'success', message: 'Record deleted.' });
      await loadRecords();
      await refreshData();
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to delete record.' });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRecordIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected telemetry records?`)) return;

    const res = await bulkUpdateRecords(dataset.id, 'delete', { recordIds: ids });
    if (res.success) {
      setNotification({ type: 'success', message: `Successfully deleted ${res.affected} records.` });
      setSelectedRecordIds(new Set());
      await loadRecords();
      await refreshData();
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: 'Failed to delete records in bulk.' });
    }
  };

  const toggleSelectRecord = (id: string) => {
    const next = new Set(selectedRecordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecordIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.size === records.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(records.map((r) => r.id)));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Unique equipment list for filter
  const equipmentOptions = Array.from(
    new Set(records.map((r) => r.equipmentId).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-6xl p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0A1124] border border-slate-200 dark:border-[#1E293B] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-6 max-h-[94vh] flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-[#1E293B] pb-3 shrink-0">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#0284C7] dark:text-[#38BDF8] mb-0.5 font-bold">
              <Database className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest">DATABASE RECORD EDITOR</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase font-sans tracking-tight flex items-center gap-2">
              <span>{dataset.name}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                {totalCount} Total Records
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 shrink-0 shadow-xs ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
        )}

        {/* Filter & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] shrink-0 font-mono text-xs shadow-xs transition-colors duration-200">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search values, equipment, timestamps..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] shadow-xs"
              />
            </div>

            {equipmentOptions.length > 0 && (
              <select
                value={selectedEquipment}
                onChange={(e) => {
                  setSelectedEquipment(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-[#0284C7] shadow-xs cursor-pointer"
              >
                <option value="ALL">All Equipment Units</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadRecords}
              className="p-2 rounded-lg bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-xs"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0284C7] dark:text-[#38BDF8]' : ''}`} />
            </button>
          </div>

          {/* Bulk Action Buttons */}
          {selectedRecordIds.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] font-semibold">
                {selectedRecordIds.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1 cursor-pointer text-xs font-mono uppercase shadow-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="table-responsive-container flex-1 w-full max-w-full overflow-auto border border-slate-200 dark:border-[#1E293B] rounded-xl bg-white dark:bg-[#0A1124] shadow-sm transition-colors duration-200">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[650px]">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-[#1E293B] z-10 font-semibold">
              <tr>
                <th className="p-2.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selectedRecordIds.size === records.length}
                    onChange={toggleSelectAll}
                    className="accent-[#0284C7] cursor-pointer"
                  />
                </th>
                <th className="p-2.5 w-12 text-slate-500 dark:text-slate-400">#</th>
                {displayColumns.slice(0, 8).map((col) => (
                  <th
                    key={col.name}
                    onClick={() => {
                      if (sortBy === col.name) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(col.name);
                        setSortOrder('asc');
                      }
                    }}
                    className="p-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-[#162032]"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.displayName || col.name}</span>
                      {sortBy === col.name && (
                        <ArrowUpDown className="w-3 h-3 text-[#0284C7] dark:text-[#38BDF8]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2.5 text-right pr-4 text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={displayColumns.length + 3} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7] dark:text-[#38BDF8]" />
                      <span>Loading records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 3} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No records found matching current query.
                  </td>
                </tr>
              ) : (
                records.map((record, rIdx) => {
                  const isEditing = editingRecordId === record.id;
                  const isSelected = selectedRecordIds.has(record.id);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/80 transition-colors ${
                        isSelected ? 'bg-[#0284C7]/5 dark:bg-[#0284C7]/10' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="accent-[#0284C7] cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-slate-400 dark:text-slate-500 font-semibold">{record.rowIndex || rIdx + 1}</td>

                      {displayColumns.slice(0, 8).map((col) => {
                        const cellVal = isEditing
                          ? editFormData[col.name] ?? record.data[col.name]
                          : record.data[col.name];

                        return (
                          <td key={col.name} className="p-2.5 whitespace-nowrap text-slate-900 dark:text-slate-100">
                            {isEditing ? (
                              <input
                                type={col.dataType === 'numeric' ? 'number' : 'text'}
                                step="any"
                                value={cellVal ?? ''}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    [col.name]:
                                      col.dataType === 'numeric'
                                        ? parseFloat(e.target.value) || e.target.value
                                        : e.target.value,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-white dark:bg-[#162032] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white w-28 text-xs focus:outline-none focus:border-[#0284C7] shadow-xs font-mono"
                              />
                            ) : (
                              <span>
                                {cellVal !== undefined && cellVal !== null ? String(cellVal) : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-2.5 text-right pr-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(record.id)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs"
                              title="Save Record"
                              aria-label="Save Record"
                            >
                              <Save className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shadow-xs"
                              title="Cancel Edit"
                              aria-label="Cancel Edit"
                            >
                              <X className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(record)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:border-[#0284C7] text-[#0284C7] dark:text-[#38BDF8] hover:bg-[#0284C7] hover:text-white cursor-pointer transition-colors shadow-xs"
                              title="Edit Record"
                              aria-label="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(record.id)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:border-rose-600 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors shadow-xs"
                              title="Delete Record"
                              aria-label="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-[#1E293B]">
          <div>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{totalCount}</strong> records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 cursor-pointer flex items-center space-x-1 font-semibold shadow-xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 text-slate-900 dark:text-white font-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 cursor-pointer flex items-center space-x-1 font-semibold shadow-xs transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
