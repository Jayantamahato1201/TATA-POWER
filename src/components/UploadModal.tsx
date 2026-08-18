import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  ArrowRight,
  Database,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../context/DataContext';

export const UploadModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, uploadDataset, isUploading, seedSampleDataset, previewFile } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [category, setCategory] = useState('Thermal Generation Operations');
  const [description, setDescription] = useState('');
  const [dateColumn, setDateColumn] = useState('');
  const [equipmentColumn, setEquipmentColumn] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    fileName: string;
    fileSize: number;
    fileType: string;
    totalRows: number;
    columns: Array<{ name: string; displayName: string; dataType: string; sampleValues: any[]; isTimestamp?: boolean; isEquipment?: boolean }>;
    sampleRows: Record<string, any>[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadError(null);
    const autoName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
    setDatasetName(autoName);

    // Call server preview
    setIsPreviewLoading(true);
    try {
      const data = await previewFile(selectedFile);
      setPreviewData(data);

      // Auto detect date & equipment columns
      const detectedDate = data.columns?.find((c: any) => c.isTimestamp || c.dataType === 'datetime')?.name || '';
      const detectedEquip = data.columns?.find((c: any) => c.isEquipment)?.name || '';
      setDateColumn(detectedDate);
      setEquipmentColumn(detectedEquip);
    } catch (err: any) {
      console.error('Preview error:', err);
      setUploadError(err.message || 'Failed to inspect file structure.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a CSV or Excel file (.csv, .xlsx, .xls).');
      return;
    }

    setUploadError(null);
    const result = await uploadDataset(file, datasetName);
    if (result.success) {
      setIsUploadModalOpen(false);
      setFile(null);
      setPreviewData(null);
      setDatasetName('');
      setDescription('');
    } else {
      setUploadError(result.error || 'Failed to parse or ingest dataset. Please check file format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#0284C7] mb-1 font-bold">
              <Upload className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest">PERSISTENT TELEMETRY INGESTION</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 uppercase font-sans tracking-tight flex items-center gap-2">
              <span>Ingest Plant Telemetry Dataset</span>
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Permanently stores operational records in database with automated schema & threshold verification
            </p>
          </div>
          <button
            onClick={() => {
              setIsUploadModalOpen(false);
              setFile(null);
              setPreviewData(null);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center space-x-2 font-mono shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{uploadError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer shadow-xs ${
              isDragOver
                ? 'border-[#0284C7] bg-[#0284C7]/5'
                : file
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            {file ? (
              <div className="space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900 font-mono">{file.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {(file.size / 1024).toFixed(1)} KB | Format: {file.name.split('.').pop()?.toUpperCase()} | Click to choose a different file
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-9 h-9 text-[#0284C7] mx-auto" />
                <div className="text-sm font-semibold text-slate-800 uppercase font-mono">
                  Drag & drop CSV or Excel file here
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Supports CSV, XLSX, XLS with automatic timestamp and equipment mapping
                </div>
              </div>
            )}
          </div>

          {/* Loading Preview Indicator */}
          {isPreviewLoading && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-xs text-slate-600 flex items-center justify-center space-x-2 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
              <span>Inspecting schema & validating telemetry records...</span>
            </div>
          )}

          {/* Dataset Configuration Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="block text-slate-700 uppercase font-semibold">Dataset Name / Identifier</label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. Jojobera Units 1-4 Synchronous Operational Log"
                required
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] shadow-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 uppercase font-semibold">Operational Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] shadow-xs cursor-pointer"
              >
                <option value="Thermal Generation Operations">Thermal Generation Operations</option>
                <option value="Turbine & Generator Telemetry">Turbine & Generator Telemetry</option>
                <option value="Boiler & Steam Systems">Boiler & Steam Systems</option>
                <option value="Environmental & Emissions">Environmental & Emissions</option>
                <option value="Electrical Transmission & Grid">Electrical Transmission & Grid</option>
                <option value="Equipment Vibration & Bearings">Equipment Vibration & Bearings</option>
              </select>
            </div>
          </div>

          {/* Schema & Column Detection Summary */}
          {previewData && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs shadow-xs">
              <div className="flex items-center justify-between text-slate-600 border-b border-slate-200 pb-2">
                <span className="text-[#0284C7] uppercase font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Schema Analysis
                </span>
                <span>
                  <strong className="text-slate-900">{previewData.totalRows}</strong> records detected |{' '}
                  <strong className="text-slate-900">{previewData.columns.length}</strong> fields
                </span>
              </div>

              {/* Detected Column Badges */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-600 uppercase font-semibold">Detected Telemetry Channels:</div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {previewData.columns.map((col) => (
                    <span
                      key={col.name}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800 flex items-center space-x-1 shadow-xs"
                    >
                      <span className="font-semibold">{col.name}</span>
                      <span
                        className={`text-[9px] px-1 rounded-md uppercase font-bold ${
                          col.dataType === 'numeric'
                            ? 'bg-blue-100 text-blue-800'
                            : col.dataType === 'datetime'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {col.dataType}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Rows Preview */}
              {previewData.sampleRows && previewData.sampleRows.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] text-slate-600 uppercase font-semibold">Raw Data Preview (First 3 Rows):</div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-32 bg-white">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                          {Object.keys(previewData.sampleRows[0]).slice(0, 6).map((k) => (
                            <th key={k} className="p-1.5 font-mono whitespace-nowrap font-semibold">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sampleRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 text-slate-800 hover:bg-slate-50">
                            {Object.keys(previewData.sampleRows[0]).slice(0, 6).map((k) => (
                              <td key={k} className="p-1.5 font-mono whitespace-nowrap text-slate-700">
                                {String(row[k] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={async () => {
                await seedSampleDataset();
                setIsUploadModalOpen(false);
              }}
              disabled={isUploading}
              className="text-xs text-[#0284C7] hover:text-[#0369A1] font-mono font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Or Load Jojobera Verified Sample Telemetry</span>
            </button>

            <div className="flex space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setFile(null);
                  setPreviewData(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-mono font-bold uppercase cursor-pointer border border-slate-300 shadow-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="px-5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs uppercase font-mono tracking-wider cursor-pointer disabled:opacity-40 shadow-sm flex items-center gap-1.5 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ingesting & Persisting...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Confirm & Ingest Dataset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
