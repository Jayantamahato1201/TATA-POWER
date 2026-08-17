import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  RotateCcw,
  Shield,
  Layers,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
} from 'lucide-react';
import { TemperatureThresholdConfig, Dataset } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface TemperatureConfigPanelProps {
  currentConfig: TemperatureThresholdConfig;
  currentDataset: Dataset | null;
  onSave: (updated: Partial<TemperatureThresholdConfig>) => Promise<boolean>;
  onClose?: () => void;
}

export const TemperatureConfigPanel: React.FC<TemperatureConfigPanelProps> = ({
  currentConfig,
  currentDataset,
  onSave,
  onClose,
}) => {
  const { isStaff, isAdmin } = useAuth();
  const [formData, setFormData] = useState<TemperatureThresholdConfig>({ ...currentConfig });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormData({ ...currentConfig });
  }, [currentConfig]);

  const availableColumns = currentDataset?.columns || [];
  const numericColumns = availableColumns.filter((c) => c.type === 'number');

  const handleResetDefaults = () => {
    setFormData({
      ...formData,
      belowThreshold: 20,
      normalMin: 20,
      normalMax: 30,
      aboveThreshold: 30,
      belowLabel: 'BELOW TEMPERATURE',
      normalLabel: 'NORMAL TEMPERATURE',
      aboveLabel: 'ABOVE TEMPERATURE',
      belowColor: '#06B6D4',
      normalColor: '#00FF41',
      aboveColor: '#EF4444',
      belowOpacity: 0.85,
      normalOpacity: 0.85,
      aboveOpacity: 0.9,
      unit: '°C',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onClose) onClose();
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#333] rounded-sm p-6 shadow-2xl space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xs bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              3D Temperature Analytics Configuration
            </h3>
            <p className="text-[#888] text-[11px] font-sans">
              Configure data source columns, strict 3-category classification thresholds, and visual properties.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#888] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Column Mapping */}
        <div className="space-y-3">
          <h4 className="text-white uppercase font-bold text-xs tracking-wider flex items-center space-x-1.5 text-[#F27D26]">
            <span>1. Telemetry Dimension Mapping</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric Column */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Temperature Column (Z-Axis)</label>
              <select
                value={formData.metricColumn}
                onChange={(e) => setFormData({ ...formData, metricColumn: e.target.value })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                {availableColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Timestamp Column */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Timestamp Column (X-Axis)</label>
              <select
                value={formData.timestampColumn || ''}
                onChange={(e) => setFormData({ ...formData, timestampColumn: e.target.value })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                <option value="">Auto-Detect / Row Sequence</option>
                {availableColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Column */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Equipment Column (Y-Axis)</label>
              <select
                value={formData.equipmentColumn || ''}
                onChange={(e) => setFormData({ ...formData, equipmentColumn: e.target.value })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                <option value="">Auto-Detect Equipment Field</option>
                {availableColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Strict 3-Category Classification Thresholds */}
        <div className="space-y-3 pt-4 border-t border-[#222]">
          <h4 className="text-white uppercase font-bold text-xs tracking-wider flex items-center space-x-1.5 text-[#F27D26]">
            <span>2. Strict 3-Category Thermal Thresholds</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BELOW TEMPERATURE */}
            <div className="p-4 rounded-xs bg-[#111] border border-cyan-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Below Temperature</span>
                <span className="text-[10px] text-[#888]">Condition: &lt; Below Limit</span>
              </div>

              <div>
                <label className="block text-[#888] mb-1">Threshold Cutoff (&lt; value)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.belowThreshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, belowThreshold: val, normalMin: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white font-bold"
                  />
                  <span className="text-[#888]">{formData.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-[#888] mb-1">Status Label</label>
                <input
                  type="text"
                  value={formData.belowLabel}
                  onChange={(e) => setFormData({ ...formData, belowLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-[#888]">Color:</label>
                <input
                  type="color"
                  value={formData.belowColor}
                  onChange={(e) => setFormData({ ...formData, belowColor: e.target.value })}
                  className="w-8 h-6 rounded-xs bg-transparent border-0 cursor-pointer"
                />
                <span className="text-[#CCC]">{formData.belowColor}</span>
              </div>
            </div>

            {/* NORMAL TEMPERATURE */}
            <div className="p-4 rounded-xs bg-[#111] border border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#00FF41] uppercase">Normal Temperature</span>
                <span className="text-[10px] text-[#888]">Range: [Min - Max]</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#888] mb-1">Range Min</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.normalMin}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, normalMin: val, belowThreshold: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#888] mb-1">Range Max</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.normalMax}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, normalMax: val, aboveThreshold: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#888] mb-1">Status Label</label>
                <input
                  type="text"
                  value={formData.normalLabel}
                  onChange={(e) => setFormData({ ...formData, normalLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-[#888]">Color:</label>
                <input
                  type="color"
                  value={formData.normalColor}
                  onChange={(e) => setFormData({ ...formData, normalColor: e.target.value })}
                  className="w-8 h-6 rounded-xs bg-transparent border-0 cursor-pointer"
                />
                <span className="text-[#CCC]">{formData.normalColor}</span>
              </div>
            </div>

            {/* ABOVE TEMPERATURE */}
            <div className="p-4 rounded-xs bg-[#111] border border-rose-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 uppercase">Above Temperature</span>
                <span className="text-[10px] text-[#888]">Condition: &gt; Above Limit</span>
              </div>

              <div>
                <label className="block text-[#888] mb-1">Threshold Cutoff (&gt; value)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.aboveThreshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, aboveThreshold: val, normalMax: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white font-bold"
                  />
                  <span className="text-[#888]">{formData.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-[#888] mb-1">Status Label</label>
                <input
                  type="text"
                  value={formData.aboveLabel}
                  onChange={(e) => setFormData({ ...formData, aboveLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xs bg-[#0A0A0A] border border-[#333] text-white text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-[#888]">Color:</label>
                <input
                  type="color"
                  value={formData.aboveColor}
                  onChange={(e) => setFormData({ ...formData, aboveColor: e.target.value })}
                  className="w-8 h-6 rounded-xs bg-transparent border-0 cursor-pointer"
                />
                <span className="text-[#CCC]">{formData.aboveColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Alarm System & Notification Controls */}
        <div className="space-y-3 pt-4 border-t border-[#222]">
          <h4 className="text-white uppercase font-bold text-xs tracking-wider flex items-center space-x-1.5 text-[#F27D26]">
            <span>3. Dynamic Alarm System & Display Position</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Alarm Display Position */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Alarm Display Position</label>
              <select
                value={formData.alarmDisplayPosition || 'below_graph'}
                onChange={(e) => setFormData({ ...formData, alarmDisplayPosition: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white cursor-pointer font-bold"
              >
                <option value="below_graph">Below 3D Graph (Standard)</option>
                <option value="full_page">Full Page Alert Dashboard</option>
                <option value="floating_panel">Floating HUD Alert (Bottom-Right)</option>
                <option value="top_notification">Top Notification Broadcast</option>
              </select>
            </div>

            {/* Above Alarm Severity */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Above Alarm Severity</label>
              <select
                value={formData.aboveAlarmSeverity || 'CRITICAL'}
                onChange={(e) => setFormData({ ...formData, aboveAlarmSeverity: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-rose-400 font-bold cursor-pointer"
              >
                <option value="CRITICAL">CRITICAL (Red Emergency)</option>
                <option value="HIGH">HIGH (Urgent Priority)</option>
                <option value="WARNING">WARNING (Standard Alert)</option>
              </select>
            </div>

            {/* Below Alarm Severity */}
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Below Alarm Severity</label>
              <select
                value={formData.belowAlarmSeverity || 'WARNING'}
                onChange={(e) => setFormData({ ...formData, belowAlarmSeverity: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-cyan-400 font-bold cursor-pointer"
              >
                <option value="WARNING">WARNING (Low Temperature Alert)</option>
                <option value="HIGH">HIGH (Severe Low Temperature)</option>
                <option value="CRITICAL">CRITICAL (System Freezing Risk)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={formData.enableMonitoring !== false}
                  onChange={(e) => setFormData({ ...formData, enableMonitoring: e.target.checked })}
                  className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
                />
                <span>Enable Real-time Alarm Evaluation</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={formData.showAlarmsOnDashboard !== false}
                  onChange={(e) => setFormData({ ...formData, showAlarmsOnDashboard: e.target.checked })}
                  className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
                />
                <span>Show Alarms on Dashboard</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={formData.playAlarmSound || false}
                onChange={(e) => setFormData({ ...formData, playAlarmSound: e.target.checked })}
                className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
              />
              <span>Audio Alarm Chime / Synthesizer</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={formData.requireAcknowledgement !== false}
                onChange={(e) => setFormData({ ...formData, requireAcknowledgement: e.target.checked })}
                className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
              />
              <span>Require Operator Acknowledgement</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={formData.enableAutoResolve || false}
                onChange={(e) => setFormData({ ...formData, enableAutoResolve: e.target.checked })}
                className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
              />
              <span>Auto-Resolve when Restored</span>
            </label>
          </div>
        </div>

        {/* Section 4: Visual & Unit Settings */}
        <div className="space-y-3 pt-4 border-t border-[#222]">
          <h4 className="text-white uppercase font-bold text-xs tracking-wider flex items-center space-x-1.5 text-[#F27D26]">
            <span>4. Unit & 3D WebGL Rendering Parameters</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Unit Suffix</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. °C, K, °F"
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white"
              />
            </div>

            <div>
              <label className="block text-[#AAA] mb-1 uppercase">Default View Mode</label>
              <select
                value={formData.defaultViewMode}
                onChange={(e) => setFormData({ ...formData, defaultViewMode: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xs bg-[#111] border border-[#333] text-white cursor-pointer"
              >
                <option value="surface">Mathematical 3D Surface</option>
                <option value="infographic">Layered Isometric Infographic</option>
                <option value="split">Dual Split Screen</option>
              </select>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <label className="flex items-center space-x-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={formData.wireframe}
                  onChange={(e) => setFormData({ ...formData, wireframe: e.target.checked })}
                  className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
                />
                <span>Wireframe Default</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={formData.showGrid3D}
                  onChange={(e) => setFormData({ ...formData, showGrid3D: e.target.checked })}
                  className="rounded-xs text-[#F27D26] focus:ring-0 cursor-pointer"
                />
                <span>Show 3D Grid</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-[#222]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#888] hover:text-white border border-[#333] flex items-center space-x-1.5 cursor-pointer uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-3">
            {saveSuccess && (
              <span className="text-[#00FF41] flex items-center space-x-1 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration Saved</span>
              </span>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xs bg-[#111] hover:bg-[#1a1a1a] text-[#AAA] border border-[#333] cursor-pointer uppercase"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xs bg-[#F27D26] hover:bg-[#ff8e38] text-black font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-[0_0_15px_rgba(242,125,38,0.3)] disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Saving...' : 'Apply & Broadcast Configuration'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
