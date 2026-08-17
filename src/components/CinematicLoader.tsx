import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Cpu, ShieldCheck } from 'lucide-react';
import { TataLogoImage } from './TataPowerLogo';

interface CinematicLoaderProps {
  onComplete: () => void;
}

export const CinematicLoader: React.FC<CinematicLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'grid' | 'title' | 'line' | 'subtitle' | 'plant' | 'ready'>('grid');

  useEffect(() => {
    // Progress counter animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 600);
          return 100;
        }
        const increment = Math.floor(Math.random() * 4) + 2;
        return Math.min(prev + increment, 100);
      });
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (progress > 10 && stage === 'grid') setStage('title');
    if (progress > 35 && stage === 'title') setStage('line');
    if (progress > 55 && stage === 'line') setStage('subtitle');
    if (progress > 80 && stage === 'subtitle') setStage('plant');
    if (progress >= 100) setStage('ready');
  }, [progress, stage]);

  return (
    <motion.div
      id="cinematic-loader-container"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070D18] text-[#E0E0E0] overflow-hidden select-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Layer 1: Deep Tata Blue Atmospheric Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-[#205CA5]/30 via-[#070D18]/90 to-[#070D18] pointer-events-none" />

      {/* Layer 2: Subtle Digital Energy Grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B_1px,transparent_1px),linear-gradient(to_bottom,#1E293B_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-70 animate-pulse"
      />

      {/* Layer 3: Dynamic Floating Energy Nodes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#38BDF8]/60 blur-[1px]"
            style={{
              width: `${(i % 3) + 2}px`,
              height: `${(i % 3) + 2}px`,
              top: `${(i * 17) % 100}%`,
              left: `${(i * 23) % 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.5, 0.8],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5) * 0.4,
            }}
          />
        ))}
      </div>

      {/* Layer 4: Abstract Digital Power Plant Wireframe Geometry */}
      <AnimatePresence>
        {progress > 70 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 0.25, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="w-[600px] h-[600px] border border-[#205CA5]/50 rounded-full flex items-center justify-center animate-[spin_60s_linear_infinite]">
              <div className="w-[450px] h-[450px] border border-dashed border-[#38BDF8]/30 rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite_reverse]">
                <div className="w-[300px] h-[300px] border border-[#1E293B] rounded-full" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Center Identity Sequence */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        {/* Top Logo Image */}
        <motion.div
          className="mb-6 flex items-center justify-center"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="p-4 rounded-md bg-white border-2 border-[#205CA5] shadow-[0_0_40px_rgba(32,92,165,0.5)] flex items-center justify-center">
            <TataLogoImage className="h-16 sm:h-20 w-auto" />
          </div>
        </motion.div>

        {/* Brand Text: TATA POWER */}
        <div className="relative overflow-hidden py-2 px-6">
          <motion.h1
            id="cinematic-loader-title"
            className="text-4xl sm:text-6xl font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_30px_rgba(32,92,165,0.4)]"
            initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.95 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            TATA POWER
          </motion.h1>

          {/* Glowing Animated Energy Line passing through the text */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_12px_#38BDF8]"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Subtitle: JAMSHEDPUR INTELLIGENT OPERATIONS */}
        <motion.div
          className="mt-3 flex items-center space-x-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <span className="text-xs sm:text-sm font-semibold tracking-[0.35em] text-[#38BDF8] uppercase font-mono">
            Jamshedpur Intelligent Operations
          </span>
        </motion.div>

        {/* Telemetry Engine Status Indicator */}
        <motion.p
          className="text-xs text-[#94A3B8] mt-2 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.8 }}
        >
          Enterprise Telemetry Engine & Analytics Synchronizer
        </motion.p>

        {/* Loading Progress Bar & Percentage */}
        <div className="w-72 sm:w-96 mt-10 flex flex-col items-center">
          <div className="w-full flex justify-between items-center text-xs font-mono text-[#38BDF8] mb-2">
            <span className="flex items-center space-x-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#205CA5] animate-ping" />
              <span className="uppercase tracking-wider">INITIALIZING TELEMETRY ENGINE</span>
            </span>
            <span className="font-bold text-sm text-white">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-[#0F172A] rounded-xs overflow-hidden p-0.5 border border-[#1E293B]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#205CA5] via-[#38BDF8] to-[#00FF41] rounded-xs shadow-[0_0_10px_#205CA5]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          {/* Subsystem Handshake Ticker */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-[11px] text-[#94A3B8] font-mono">
            <span className={`flex items-center space-x-1 ${progress > 25 ? 'text-[#00FF41]' : 'text-[#475569]'}`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>3D CORE</span>
            </span>
            <span className={`flex items-center space-x-1 ${progress > 55 ? 'text-[#00FF41]' : 'text-[#475569]'}`}>
              <Activity className="w-3.5 h-3.5" />
              <span>ALARM ENGINE</span>
            </span>
            <span className={`flex items-center space-x-1 ${progress > 85 ? 'text-[#00FF41]' : 'text-[#475569]'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC SECURE</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Skip Control */}
      <button
        id="btn-skip-cinematic-loader"
        onClick={onComplete}
        className="absolute bottom-6 text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors uppercase tracking-widest font-mono cursor-pointer border-b border-transparent hover:border-[#38BDF8]"
      >
        [ Skip Intro Sequence ]
      </button>
    </motion.div>
  );
};

