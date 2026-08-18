import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Dataset } from '../../types';
import { useData } from '../../context/DataContext';

interface DatasetUpdateModalProps {
  dataset: Dataset;
  isOpen: boolean;
  onClose: () => void;
}

export const DatasetUpdateModal: React.FC<DatasetUpdateModalProps> = ({ dataset, isOpen, onClose }) => {
  const { replaceDataset, appendDataset, previewFile, isUploading } = useData();

  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite'>('skip');
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatusMessage(null);
    setIsPreviewLoading(true);

    try {
      const preview = await previewFile(selectedFile);
      setPreviewData(preview);
    } catch (err: any) {
      console.error('Preview error:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to inspect file structure.' });
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
      setStatusMessage({ type: 'error', message: 'Please select a CSV or Excel file.' });
      return;
    }

    setStatusMessage(null);

    if (mode === 'replace') {
      if (
        !confirm(
          `WARNING: This will replace all ${dataset.totalRows} existing records in "${dataset.name}" with records from "${file.name}". Do you want to proceed?`
        )
      ) {
        return;
      }

      const res = await replaceDataset(dataset.id, file);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          message: `Successfully replaced records in dataset "${dataset.name}".`,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          message: res.error || 'Failed to replace dataset records.',
        });
      }
    } else {
      // Append mode
      const res = await appendDataset(dataset.id, file, duplicateStrategy);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          message: `Successfully appended ${res.added ?? 0} new records (${res.duplicatesSkipped ?? 0} duplicates skipped).`,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          message: res.error || 'Failed to append dataset records.',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#0284C7] mb-0.5 font-bold">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest">DATASET SYNCHRONIZATION</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase font-sans tracking-tight flex items-center gap-2">
              <span>Update Dataset</span>
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Target: <strong className="text-slate-900">{dataset.name}</strong> ({dataset.totalRows} current records)
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 font-mono text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                mode === 'append'
                  ? 'bg-[#0284C7] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>MODE 2: APPEND DATA</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                mode === 'replace'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>MODE 1: REPLACE DATASET</span>
            </button>
          </div>

          {/* Mode Descriptions */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 shadow-xs">
            {mode === 'append' ? (
              <p>
                <strong className="text-slate-900">Append Data:</strong> Adds new telemetry records to the existing dataset. Duplicate records will be automatically detected by fingerprint.
              </p>
            ) : (
              <p className="text-rose-700">
                <strong className="text-rose-900">Replace Dataset:</strong> Completely replaces all {dataset.totalRows} existing records with the new file contents while preserving alarms and dashboard bindings.
              </p>
            )}
          </div>

          {/* Duplicate Strategy for Append */}
          {mode === 'append' && (
            <div className="space-y-1 font-mono text-xs">
              <label className="block text-slate-700 uppercase font-semibold">Duplicate Detection Handling</label>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] shadow-xs cursor-pointer"
              >
                <option value="skip">Skip Identical Duplicate Rows (Preserve Historical Original)</option>
                <option value="overwrite">Overwrite Identical Rows with New Telemetry Values</option>
              </select>
            </div>
          )}

          {/* Drag & Drop File */}
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
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
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
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900 font-mono">{file.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {(file.size / 1024).toFixed(1)} KB | Click to select another file
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-[#0284C7] mx-auto" />
                <div className="text-sm font-semibold text-slate-800 uppercase font-mono">
                  Select or drop new telemetry file
                </div>
                <div className="text-xs text-slate-500 font-mono">CSV, XLSX, XLS</div>
              </div>
            )}
          </div>

          {/* Preview Details */}
          {isPreviewLoading && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-xs text-slate-600 flex items-center justify-center space-x-2 shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0284C7]" />
              <span>Analyzing records in uploaded file...</span>
            </div>
          )}

          {previewData && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-1 shadow-xs">
              <div className="text-[#0284C7] font-bold uppercase">Inspection Summary:</div>
              <div className="text-slate-700">
                <strong className="text-slate-900">{previewData.totalRows}</strong> candidate rows detected across{' '}
                <strong className="text-slate-900">{previewData.columns.length}</strong> columns.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-mono font-bold uppercase cursor-pointer transition-colors shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className={`px-5 py-2 rounded-lg font-bold text-xs uppercase font-mono tracking-wider cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm transition-all ${
                mode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'replace' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute Replace</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Execute Append</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
