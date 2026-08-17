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
      setRecords(res.records);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load dataset records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dataset.id, page, searchQuery, selectedEquipment, sortBy, sortOrder, fetchDatasetRecords]);

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-6xl p-5 sm:p-6 rounded-sm bg-[#0C0C0C] border border-[#262626] border-t-2 border-t-[#F27D26] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-6 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#222] pb-3 shrink-0">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#F27D26] mb-0.5">
              <Database className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest font-semibold">DATABASE RECORD EDITOR</span>
            </div>
            <h3 className="text-lg font-bold text-white uppercase font-mono tracking-tight flex items-center gap-2">
              <span>{dataset.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-xs bg-[#1A1A1A] border border-[#333] text-[#AAA]">
                {totalCount} Total Records
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#888] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-2.5 rounded-xs border text-xs font-mono flex items-center space-x-2 shrink-0 ${
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

        {/* Filter & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xs bg-[#121212] border border-[#222] shrink-0 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search values, equipment, timestamps..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xs bg-[#181818] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {/* Equipment Filter */}
            {equipmentOptions.length > 0 && (
              <select
                value={selectedEquipment}
                onChange={(e) => {
                  setSelectedEquipment(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xs bg-[#181818] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
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
              className="p-1.5 rounded-xs bg-[#181818] border border-[#333] text-[#AAA] hover:text-white cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#F27D26]' : ''}`} />
            </button>
          </div>

          {/* Bulk Action Buttons */}
          {selectedRecordIds.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-[#AAA] font-mono text-[11px]">
                {selectedRecordIds.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xs bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700 flex items-center space-x-1 cursor-pointer text-xs font-mono uppercase"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-[#222] rounded-xs bg-[#0E0E0E]">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-[#161616] text-[#AAA] border-b border-[#2A2A2A] z-10">
              <tr>
                <th className="p-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selectedRecordIds.size === records.length}
                    onChange={toggleSelectAll}
                    className="accent-[#F27D26] cursor-pointer"
                  />
                </th>
                <th className="p-2 w-12 text-[#777]">#</th>
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
                    className="p-2 font-semibold text-white whitespace-nowrap cursor-pointer hover:bg-[#202020]"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.displayName || col.name}</span>
                      {sortBy === col.name && (
                        <ArrowUpDown className="w-3 h-3 text-[#F27D26]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2 text-right pr-4 text-[#888]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {isLoading ? (
                <tr>
                  <td colSpan={displayColumns.length + 3} className="p-8 text-center text-[#777]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#F27D26]" />
                      <span>Loading records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 3} className="p-8 text-center text-[#777]">
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
                      className={`hover:bg-[#141414] transition-colors ${
                        isSelected ? 'bg-[#F27D26]/5' : ''
                      }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="accent-[#F27D26] cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-[#666]">{record.rowIndex || rIdx + 1}</td>

                      {displayColumns.slice(0, 8).map((col) => {
                        const cellVal = isEditing
                          ? editFormData[col.name] ?? record.data[col.name]
                          : record.data[col.name];

                        return (
                          <td key={col.name} className="p-2 whitespace-nowrap text-white">
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
                                className="px-2 py-0.5 rounded-xs bg-[#202020] border border-[#444] text-white w-28 text-xs focus:outline-none focus:border-[#F27D26]"
                              />
                            ) : (
                              <span>
                                {cellVal !== undefined && cellVal !== null ? String(cellVal) : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-2 text-right pr-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleSaveEdit(record.id)}
                              className="p-1 rounded-xs bg-emerald-900/70 hover:bg-emerald-800 text-emerald-300 cursor-pointer"
                              title="Save Record"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 rounded-xs bg-[#222] hover:bg-[#333] text-[#AAA] cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleStartEdit(record)}
                              className="p-1 rounded-xs bg-[#1C1C1C] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(record.id)}
                              className="p-1 rounded-xs bg-[#1C1C1C] hover:bg-rose-950 text-[#AAA] hover:text-rose-400 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 shrink-0 font-mono text-xs text-[#888] border-t border-[#222]">
          <div>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of{' '}
            <strong className="text-white">{totalCount}</strong> records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-xs bg-[#181818] border border-[#333] text-white disabled:opacity-30 cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 text-white">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-xs bg-[#181818] border border-[#333] text-white disabled:opacity-30 cursor-pointer flex items-center space-x-1"
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
