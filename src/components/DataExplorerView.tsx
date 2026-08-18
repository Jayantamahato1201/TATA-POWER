import React, { useState, useRef } from 'react';
import {
  Upload,
  Database,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Layers,
  Sparkles,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Dataset } from '../types';

export const DataExplorerView: React.FC<{ onOpenUpload: () => void }> = ({ onOpenUpload }) => {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    currentDataset,
    uploadDataset,
    replaceDataset,
    appendDataset,
    deleteDataset,
    exportDatasetCSV,
    seedSampleDataset,
    fetchDatasetRecords,
  } = useData();

  const { isStaff, isAdmin } = useAuth();

  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Replace / Append modal states
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'replace' | 'append';
    datasetId: string;
    datasetName: string;
  } | null>(null);
  const actionFileInputRef = useRef<HTMLInputElement | null>(null);

  // Record Table Preview States
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Active dataset columns and fallback detection
  const columns = React.useMemo(() => {
    if (currentDataset?.columns && currentDataset.columns.length > 0) {
      return currentDataset.columns;
    }
    if (previewRecords.length > 0) {
      const firstRow = previewRecords[0]?.data || previewRecords[0] || {};
      return Object.keys(firstRow).map((key) => ({
        name: key,
        displayName: key,
        dataType: typeof firstRow[key] === 'number' ? 'numeric' : 'text',
      }));
    }
    return [];
  }, [currentDataset?.columns, previewRecords]);

  // Load records from backend API
  React.useEffect(() => {
    let isCancelled = false;

    if (!selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
      return;
    }

    if (!selectedDatasetId) {
      setPreviewRecords([]);
      setTotalRecords(0);
      return;
    }

    const loadRecords = async () => {
      setIsLoadingRecords(true);
      try {
        const offset = (currentPage - 1) * pageSize;
        const res = await fetchDatasetRecords(selectedDatasetId, {
          search: searchQuery.trim() || undefined,
          sortBy: sortColumn || undefined,
          sortOrder: sortAsc ? 'asc' : 'desc',
          limit: pageSize,
          offset,
        });

        if (!isCancelled) {
          setPreviewRecords(res.records || []);
          setTotalRecords(res.total || 0);
        }
      } catch (err) {
        console.error('Failed to fetch dataset records:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingRecords(false);
        }
      }
    };

    loadRecords();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedDatasetId,
    currentPage,
    pageSize,
    searchQuery,
    sortColumn,
    sortAsc,
    fetchDatasetRecords,
    datasets,
    setSelectedDatasetId,
  ]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
      e.target.value = '';
    }
  };

  const processFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setUploadError('Unsupported file type. Please upload .csv, .xlsx, or .xls files.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(20);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    const result = await uploadDataset(file);
    clearInterval(progressInterval);
    setUploadProgress(100);

    if (result.success) {
      setUploadSuccess(`Successfully ingested dataset "${file.name}" into persistent database.`);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 800);
    } else {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError(result.error || 'Failed to ingest file.');
    }
  };

  // Replace or Append dataset action
  const handleActionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeActionModal) return;
    const file = files[0];

    setIsUploading(true);
    if (activeActionModal.type === 'replace') {
      const res = await replaceDataset(activeActionModal.datasetId, file);
      if (res.success) {
        setUploadSuccess(`Dataset "${activeActionModal.datasetName}" replaced successfully.`);
      } else {
        setUploadError(res.error || 'Failed to replace dataset.');
      }
    } else {
      const res = await appendDataset(activeActionModal.datasetId, file);
      if (res.success) {
        setUploadSuccess(`Appended ${res.added || 0} new records to "${activeActionModal.datasetName}".`);
      } else {
        setUploadError(res.error || 'Failed to append dataset records.');
      }
    }
    setIsUploading(false);
    setActiveActionModal(null);
    e.target.value = '';
  };

  const handleHeaderSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(colName);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  return (
    <div id="data-management-container" className="w-full space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Data Management & Records Repository
            </h1>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Persistent storage, ingestion, and operational record browsing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={seedSampleDataset}
            disabled={isUploading}
            className="px-3 py-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Data</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: UPLOAD DATASET (DRAG & DROP + BROWSE) */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileUp className="w-4 h-4 text-[#38BDF8]" />
            <span>Upload New Telemetry Dataset</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Upload CSV or Excel files (.csv, .xlsx, .xls) for persistent storage and real-time visualization
          </p>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? 'border-[#0284C7] bg-[#0284C7]/10'
              : 'border-[#1E293B] hover:border-[#0284C7]/50 bg-[#070D18]/60 hover:bg-[#070D18]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />

          <div className="p-3 rounded-full bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/20">
            <Upload className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Drag and drop your CSV or Excel file here, or{' '}
              <span className="text-[#38BDF8] underline">browse file</span>
            </p>
            <p className="text-xs text-[#64748B] font-mono">
              Supported file formats: .csv, .xlsx, .xls &bull; Maximum file size: 50MB
            </p>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-2 pt-2 animate-in fade-in">
            <div className="flex justify-between text-xs font-mono text-[#94A3B8]">
              <span>Ingesting and parsing records into database...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-[#070D18] rounded-full overflow-hidden border border-[#1E293B]">
              <div
                className="h-full bg-[#0284C7] transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Messages */}
        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* BELOW UPLOAD: STORED DATASETS TABLE */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#38BDF8]" />
              <span>Stored Datasets Repository ({datasets.length})</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Click a dataset to activate it and view its record preview below
            </p>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94A3B8]">
            No datasets currently stored in database. Upload a file above to begin.
          </div>
        ) : (
          <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-xl border border-[#1E293B] bg-[#070D18]">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-[#0A1124] text-[#94A3B8] font-mono uppercase text-[11px] border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Dataset Name</th>
                  <th className="px-4 py-3 font-semibold">Upload Date</th>
                  <th className="px-4 py-3 font-semibold">Total Records</th>
                  <th className="px-4 py-3 font-semibold">Detected Columns</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 text-[#CBD5E1]">
                {datasets.map((dataset) => {
                  const isSelected = dataset.id === selectedDatasetId;
                  const colCount = dataset.columns?.length || 0;

                  return (
                    <tr
                      key={dataset.id}
                      onClick={() => setSelectedDatasetId(dataset.id)}
                      className={`hover:bg-[#141E33] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#0284C7]/10' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <Database
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-[#38BDF8]' : 'text-[#64748B]'
                            }`}
                          />
                          <span className="font-semibold text-white">{dataset.name}</span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0284C7] text-white font-mono uppercase font-bold">
                              Selected
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                        {dataset.uploadDate || 'Recent'}
                      </td>

                      {/* Total Records */}
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        {dataset.totalRows.toLocaleString()} rows
                      </td>

                      {/* Detected Columns */}
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                        {colCount} columns detected
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View */}
                          <button
                            onClick={() => setSelectedDatasetId(dataset.id)}
                            className="px-2.5 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium cursor-pointer min-h-[30px]"
                          >
                            View
                          </button>

                          {/* Download CSV */}
                          <button
                            onClick={() => exportDatasetCSV(dataset.id)}
                            className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Replace (Staff/Admin) */}
                          {(isAdmin || isStaff) && (
                            <button
                              onClick={() => {
                                setActiveActionModal({
                                  type: 'replace',
                                  datasetId: dataset.id,
                                  datasetName: dataset.name,
                                });
                                actionFileInputRef.current?.click();
                              }}
                              className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-amber-400 text-xs font-mono cursor-pointer min-h-[30px]"
                              title="Replace dataset file"
                            >
                              Replace
                            </button>
                          )}

                          {/* Append (Staff/Admin) */}
                          {(isAdmin || isStaff) && (
                            <button
                              onClick={() => {
                                setActiveActionModal({
                                  type: 'append',
                                  datasetId: dataset.id,
                                  datasetName: dataset.name,
                                });
                                actionFileInputRef.current?.click();
                              }}
                              className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-emerald-400 text-xs font-mono cursor-pointer min-h-[30px]"
                              title="Append new rows to dataset"
                            >
                              Append
                            </button>
                          )}

                          {/* Delete (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete dataset "${dataset.name}" permanently from database?`)) {
                                  deleteDataset(dataset.id);
                                }
                              }}
                              className="p-1.5 rounded bg-[#1E293B] hover:bg-rose-950 text-rose-400 cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                              title="Delete dataset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden file input for Replace/Append */}
      <input
        type="file"
        ref={actionFileInputRef}
        onChange={handleActionFileSelected}
        accept=".csv, .xlsx, .xls"
        className="hidden"
      />

      {/* RECORD PREVIEW TABLE (FOR SELECTED DATASET) */}
      {currentDataset && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
          {/* Record Table Header & Search Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-[#38BDF8]" />
                <span>Records Preview: {currentDataset.name}</span>
              </h2>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                Showing {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords.toLocaleString()}{' '}
                records
                {currentDataset.totalRows > totalRecords && !searchQuery
                  ? ` (${currentDataset.totalRows.toLocaleString()} total in repository)`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#070D18] border border-[#1E293B] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#0284C7] w-full sm:w-60 min-h-[36px]"
                />
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center space-x-1.5 bg-[#070D18] px-2.5 py-1 rounded-lg border border-[#1E293B] min-h-[36px]">
                <span className="text-[11px] text-[#94A3B8] font-mono">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value={20} className="bg-[#0F172A]">20</option>
                  <option value={50} className="bg-[#0F172A]">50</option>
                  <option value={100} className="bg-[#0F172A]">100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-responsive-container w-full max-w-full overflow-x-auto rounded-xl border border-[#1E293B] bg-[#070D18]">
            <table className="w-full text-left text-xs font-mono min-w-[500px]">
              <thead className="bg-[#0A1124] text-[#94A3B8] uppercase text-[11px] border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-[#64748B]">#</th>
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleHeaderSort(col.name)}
                      className="px-4 py-2.5 font-semibold text-[#CBD5E1] hover:text-white cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.name}</span>
                        <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/40 text-[#CBD5E1]">
                {isLoadingRecords ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-[#94A3B8]">
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <RefreshCw className="w-4 h-4 text-[#38BDF8] animate-spin" />
                        <span>Fetching records from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : previewRecords.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[#94A3B8]">
                      {searchQuery ? 'No records match the current filter.' : 'No records found in this dataset.'}
                    </td>
                  </tr>
                ) : (
                  previewRecords.map((rowItem, rowIdx) => {
                    const row = rowItem.data || rowItem;
                    const absIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                    const stableKey = rowItem.id || `row_${absIndex}`;
                    return (
                      <tr
                        key={stableKey}
                        className="hover:bg-[#141E33]/80 transition-colors"
                      >
                        <td className="px-4 py-2 text-[#64748B] text-[11px]">
                          {absIndex}
                        </td>
                        {columns.map((col) => {
                          const val = row[col.name];
                          const isNumeric = typeof val === 'number';
                          return (
                            <td
                              key={col.name}
                              className={`px-4 py-2 whitespace-nowrap ${
                                isNumeric ? 'text-[#38BDF8]' : 'text-[#E2E8F0]'
                              }`}
                            >
                              {val !== undefined && val !== null ? String(val) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-[#94A3B8]">
            <div>
              Showing page <strong className="text-white">{currentPage}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoadingRecords}
                className="p-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoadingRecords}
                className="p-1.5 rounded-lg bg-[#070D18] hover:bg-[#1E293B] border border-[#1E293B] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
