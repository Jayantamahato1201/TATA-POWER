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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl p-6 sm:p-7 rounded-sm bg-[#0C0C0C] border border-[#262626] border-t-2 border-t-[#F27D26] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#222] pb-3">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#F27D26] mb-0.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest font-semibold">DATASET SYNCHRONIZATION</span>
            </div>
            <h3 className="text-lg font-bold text-white uppercase font-mono tracking-tight flex items-center gap-2">
              <span>Update Dataset</span>
            </h3>
            <p className="text-xs text-[#888] font-mono mt-0.5">
              Target: <strong className="text-white">{dataset.name}</strong> ({dataset.totalRows} current records)
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-xs text-[#888] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xs border text-xs font-mono flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#141414] rounded-xs border border-[#262626] font-mono text-xs">
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`py-2 px-3 rounded-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                mode === 'append'
                  ? 'bg-[#F27D26] text-black font-bold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>MODE 2: APPEND DATA</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`py-2 px-3 rounded-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                mode === 'replace'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>MODE 1: REPLACE DATASET</span>
            </button>
          </div>

          {/* Mode Descriptions */}
          <div className="p-3 bg-[#111] rounded-xs border border-[#222] text-xs font-mono text-[#AAA]">
            {mode === 'append' ? (
              <p>
                <strong className="text-white">Append Data:</strong> Adds new telemetry records to the existing dataset. Duplicate records will be automatically detected by fingerprint.
              </p>
            ) : (
              <p className="text-rose-300">
                <strong className="text-rose-200">Replace Dataset:</strong> Completely replaces all {dataset.totalRows} existing records with the new file contents while preserving alarms and dashboard bindings.
              </p>
            )}
          </div>

          {/* Duplicate Strategy for Append */}
          {mode === 'append' && (
            <div className="space-y-1 font-mono text-xs">
              <label className="block text-[#AAA] uppercase">Duplicate Detection Handling</label>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xs bg-[#141414] border border-[#333] text-white focus:outline-none focus:border-[#F27D26]"
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
            className={`p-6 rounded-xs border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              isDragOver
                ? 'border-[#F27D26] bg-[#F27D26]/10'
                : file
                ? 'border-[#00FF41]/50 bg-[#00FF41]/5'
                : 'border-[#333] bg-[#141414] hover:border-[#F27D26]/40'
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
                <CheckCircle2 className="w-8 h-8 text-[#00FF41] mx-auto" />
                <div className="text-sm font-bold text-white font-mono">{file.name}</div>
                <div className="text-xs text-[#888] font-mono">
                  {(file.size / 1024).toFixed(1)} KB | Click to select another file
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-[#F27D26] mx-auto" />
                <div className="text-sm font-semibold text-white uppercase font-mono">
                  Select or drop new telemetry file
                </div>
                <div className="text-xs text-[#888] font-mono">CSV, XLSX, XLS</div>
              </div>
            )}
          </div>

          {/* Preview Details */}
          {isPreviewLoading && (
            <div className="p-3 rounded-xs bg-[#141414] border border-[#222] text-center font-mono text-xs text-[#AAA] flex items-center justify-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
              <span>Analyzing records in uploaded file...</span>
            </div>
          )}

          {previewData && (
            <div className="p-3 rounded-xs bg-[#141414] border border-[#222] font-mono text-xs space-y-1">
              <div className="text-[#F27D26] font-semibold uppercase">Inspection Summary:</div>
              <div className="text-[#CCC]">
                <strong>{previewData.totalRows}</strong> candidate rows detected across{' '}
                <strong>{previewData.columns.length}</strong> columns.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#222]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xs bg-[#181818] border border-[#333] text-[#888] hover:text-white text-xs font-mono uppercase cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className={`px-5 py-2 rounded-xs font-bold text-xs uppercase font-mono tracking-wider cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ${
                mode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#F27D26] hover:bg-[#ff8e38] text-black shadow-[0_0_15px_rgba(242,125,38,0.3)]'
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
