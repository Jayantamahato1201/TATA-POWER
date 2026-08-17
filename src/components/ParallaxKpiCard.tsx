import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface ParallaxKpiCardProps {
  id?: string;
  className?: string;
  borderColor?: string; // e.g. '#205CA5', '#00FF41', '#38bdf8', '#fbbf24', '#f43f5e'
  accentColor?: string; // e.g. 'blue', 'amber', 'rose', 'sky', 'emerald'
  children: React.ReactNode;
  onClick?: () => void;
}

export const ParallaxKpiCard: React.FC<ParallaxKpiCardProps> = ({
  id,
  className = '',
  borderColor = '#205CA5',
  accentColor = 'blue',
  children,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for normalized cursor position (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for fluid industrial movement
  const springConfig = { damping: 22, stiffness: 260, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D rotation transforms (subtle, professional angle limit ~8.5 degrees)
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [8.5, -8.5]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-8.5, 8.5]);

  // Dynamic holographic glare / specular lighting tracking
  const glareX = useTransform(smoothMouseX, [-0.5, 0.5], ['10%', '90%']);
  const glareY = useTransform(smoothMouseY, [-0.5, 0.5], ['10%', '90%']);

  // Dynamic subtle box-shadow shift based on tilt
  const shadowX = useTransform(smoothMouseX, [-0.5, 0.5], [12, -12]);
  const shadowY = useTransform(smoothMouseY, [-0.5, 0.5], [16, -16]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const xPct = clientX / width - 0.5;
    const yPct = clientY / height - 0.5;

    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative select-none h-full"
    >
      <motion.div
        ref={cardRef}
        id={id}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isHovered ? 1.025 : 1,
          translateZ: isHovered ? 12 : 0,
        }}
        transition={{
          scale: { duration: 0.25, ease: 'easeOut' },
          translateZ: { duration: 0.25, ease: 'easeOut' },
        }}
        className={`relative rounded-sm bg-[#0A0A0A] border border-[#222] transition-colors duration-200 overflow-hidden ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Border accent bar with 3D depth */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] z-20"
          style={{
            backgroundColor: borderColor,
            boxShadow: isHovered ? `0 0 12px ${borderColor}80` : 'none',
          }}
        />

        {/* Dynamic Specular Holographic Glare Layer */}
        <motion.div
          className="pointer-events-none absolute -inset-px z-10 opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.7 : 0,
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) =>
                `radial-gradient(circle 180px at ${gx} ${gy}, ${borderColor}25 0%, rgba(255,255,255,0.04) 35%, transparent 70%)`
            ),
          }}
        />

        {/* Subtle Cyber-Physical Scanline / Circuit grid watermark on hover */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[size:100%_4px]"
          style={{ opacity: isHovered ? 0.4 : 0 }}
        />

        {/* Card Content with 3D Depth Float */}
        <div
          className="relative z-10 p-5 h-full flex flex-col justify-between"
          style={{
            transform: 'translateZ(20px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};
