import { AlarmAudioSettings } from '../types';

export const DEFAULT_ALARM_AUDIO_SETTINGS: AlarmAudioSettings = {
  masterEnabled: false,
  criticalAudioEnabled: false,
  warningAudioEnabled: false,
  volume: 0.75,
  playbackMode: 'on_event',
  repeatIntervalSec: 15,
  soundType: 'industrial_siren',
  enableDesktopNotifications: false,
};

const STORAGE_KEY = 'tata_power_alarm_audio_settings_v1';
const SETTINGS_EVENT = 'tata_power_alarm_audio_settings_changed';

let sharedAudioContext: AudioContext | null = null;
let lastCriticalPlayedAt = 0;
let lastWarningPlayedAt = 0;
let lastCriticalCount = 0;
let lastWarningCount = 0;
let isInitialBaselineEstablished = false;

/**
 * Initializes and retrieves or resumes the global Web Audio API context.
 */
export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (err) {
    console.warn('AudioContext initialization failed:', err);
    return null;
  }
}

/**
 * Explicitly unlocks and resumes the browser Web Audio API context on user interaction.
 */
export async function unlockAudioContext(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  } catch (e) {
    console.warn('Could not resume AudioContext:', e);
    return false;
  }
}

/**
 * Checks the current state of browser Web Audio API context.
 */
export function getAudioContextState(): 'running' | 'suspended' | 'closed' | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!sharedAudioContext) {
    return 'suspended';
  }
  return sharedAudioContext.state;
}

// User-interaction unlocker for modern browser autoplay security policies
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    unlockAudioContext();
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Reads user alarm audio settings from browser LocalStorage with safe defaults.
 */
export function getStoredAudioSettings(): AlarmAudioSettings {
  if (typeof window === 'undefined') return DEFAULT_ALARM_AUDIO_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM_AUDIO_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      masterEnabled: parsed.masterEnabled !== undefined ? Boolean(parsed.masterEnabled) : DEFAULT_ALARM_AUDIO_SETTINGS.masterEnabled,
      criticalAudioEnabled: parsed.criticalAudioEnabled !== undefined ? Boolean(parsed.criticalAudioEnabled) : DEFAULT_ALARM_AUDIO_SETTINGS.criticalAudioEnabled,
      warningAudioEnabled: parsed.warningAudioEnabled !== undefined ? Boolean(parsed.warningAudioEnabled) : DEFAULT_ALARM_AUDIO_SETTINGS.warningAudioEnabled,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_ALARM_AUDIO_SETTINGS.volume,
      playbackMode: parsed.playbackMode === 'continuous' ? 'continuous' : 'on_event',
      repeatIntervalSec: typeof parsed.repeatIntervalSec === 'number' ? parsed.repeatIntervalSec : DEFAULT_ALARM_AUDIO_SETTINGS.repeatIntervalSec,
      soundType: ['industrial_siren', 'urgent_beep', 'chime'].includes(parsed.soundType) ? parsed.soundType : DEFAULT_ALARM_AUDIO_SETTINGS.soundType,
      enableDesktopNotifications: Boolean(parsed.enableDesktopNotifications),
    };
  } catch (e) {
    console.error('Error reading stored alarm audio settings:', e);
    return DEFAULT_ALARM_AUDIO_SETTINGS;
  }
}

/**
 * Saves alarm audio settings to browser LocalStorage and broadcasts to listeners.
 */
export function saveStoredAudioSettings(settings: AlarmAudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  } catch (e) {
    console.error('Error saving alarm audio settings:', e);
  }
}

/**
 * Subscribes to audio settings changes across components.
 */
export function subscribeToAudioSettings(callback: (settings: AlarmAudioSettings) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AlarmAudioSettings>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getStoredAudioSettings());
    }
  };
  window.addEventListener(SETTINGS_EVENT, handler);
  return () => window.removeEventListener(SETTINGS_EVENT, handler);
}

/**
 * Plays the synthesized Critical Alarm sound with high urgency acoustics.
 */
export function playCriticalAlarmSound(volumeOverride?: number, soundTypeOverride?: string): boolean {
  const settings = getStoredAudioSettings();
  const volume = volumeOverride !== undefined ? volumeOverride : settings.volume;
  const soundType = soundTypeOverride || settings.soundType;

  if (volume <= 0) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.4, now);
    masterGain.connect(ctx.destination);

    if (soundType === 'urgent_beep') {
      // 3 Rapid alternating high-pitch bursts
      const burstTimes = [0, 0.15, 0.3, 0.45];
      burstTimes.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 1046.5 : 880, now + t); // C6 / A5

        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(1, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + t + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now + t);
        osc.stop(now + t + 0.13);
      });
    } else if (soundType === 'chime') {
      // Urgent tri-tone chord chime
      const freqs = [880, 1108.73, 1318.51]; // A5 Major Chord
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35 / (idx + 1), now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.75);
      });
    } else {
      // Default: 'industrial_siren' - Dual oscillating frequency sweep with pulsing tremolo
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      // Sweep frequency up & down in rapid cycle
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.linearRampToValueAtTime(1320, now + 0.22);
      osc1.frequency.linearRampToValueAtTime(740, now + 0.44);
      osc1.frequency.linearRampToValueAtTime(1200, now + 0.65);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.linearRampToValueAtTime(660, now + 0.22);
      osc2.frequency.linearRampToValueAtTime(370, now + 0.44);
      osc2.frequency.linearRampToValueAtTime(600, now + 0.65);

      // Tremolo modulation
      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.72);

      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.75);
      osc2.stop(now + 0.75);
    }
    return true;
  } catch (err) {
    console.warn('Failed to play critical alarm sound:', err);
    return false;
  }
}

/**
 * Plays the synthesized Warning Alarm sound with softer harmonic acoustics.
 */
export function playWarningAlarmSound(volumeOverride?: number, soundTypeOverride?: string): boolean {
  const settings = getStoredAudioSettings();
  const volume = volumeOverride !== undefined ? volumeOverride : settings.volume;
  const soundType = soundTypeOverride || settings.soundType;

  if (volume <= 0) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.35, now);
    masterGain.connect(ctx.destination);

    // Warm two-tone advisory chime: 587.33Hz (D5) -> 440Hz (A4)
    const tones = [
      { freq: 587.33, start: 0, dur: 0.22 },
      { freq: 440.0, start: 0.18, dur: 0.38 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = soundType === 'urgent_beep' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gain.gain.setValueAtTime(0, now + tone.start);
      gain.gain.linearRampToValueAtTime(0.7, now + tone.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.005, now + tone.start + tone.dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.05);
    });

    return true;
  } catch (err) {
    console.warn('Failed to play warning alarm sound:', err);
    return false;
  }
}

/**
 * Directly tests the sound in the browser with visual/auditory feedback.
 */
export function testAlarmSound(severity: 'CRITICAL' | 'WARNING'): boolean {
  unlockAudioContext();
  const settings = getStoredAudioSettings();
  if (severity === 'CRITICAL') {
    return playCriticalAlarmSound(settings.volume, settings.soundType);
  } else {
    return playWarningAlarmSound(settings.volume, settings.soundType);
  }
}

/**
 * Orchestrates evaluation of active alarm numbers against user audio settings.
 */
export function evaluateAndTriggerAlarmAudio(
  criticalCount: number,
  warningCount: number,
  forcePlay = false
): void {
  const settings = getStoredAudioSettings();

  // If this is the initial load, establish baseline count silently without playing sound
  if (!isInitialBaselineEstablished && !forcePlay) {
    isInitialBaselineEstablished = true;
    lastCriticalCount = criticalCount;
    lastWarningCount = warningCount;
    return;
  }

  if (!settings.masterEnabled) {
    lastCriticalCount = criticalCount;
    lastWarningCount = warningCount;
    return;
  }

  const now = Date.now();
  const intervalMs = (settings.repeatIntervalSec || 15) * 1000;

  // 1. Critical Alarms Check
  if (settings.criticalAudioEnabled && criticalCount > 0) {
    const isNewCritical = criticalCount > lastCriticalCount;
    const timeSinceLast = now - lastCriticalPlayedAt;

    if (forcePlay || isNewCritical || (settings.playbackMode === 'continuous' && timeSinceLast >= intervalMs)) {
      playCriticalAlarmSound();
      lastCriticalPlayedAt = now;
    }
  }

  // 2. Warning Alarms Check (only if no critical sound was just triggered)
  if (
    settings.warningAudioEnabled &&
    warningCount > 0 &&
    (!settings.criticalAudioEnabled || criticalCount === 0)
  ) {
    const isNewWarning = warningCount > lastWarningCount;
    const timeSinceLast = now - lastWarningPlayedAt;

    if (forcePlay || isNewWarning || (settings.playbackMode === 'continuous' && timeSinceLast >= intervalMs)) {
      playWarningAlarmSound();
      lastWarningPlayedAt = now;
    }
  }

  lastCriticalCount = criticalCount;
  lastWarningCount = warningCount;
}
