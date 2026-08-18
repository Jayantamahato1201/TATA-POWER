import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Camera,
  Layers,
  Sparkles,
  Zap,
  Shield,
  Activity,
  Maximize2,
} from 'lucide-react';
import { TemperatureAnalyticsPayload, TemperatureDataPoint } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ThreeDLayeredInfographicProps {
  analytics: TemperatureAnalyticsPayload;
  onSelectPoint?: (point: TemperatureDataPoint | null) => void;
  height?: number | string;
}

export const ThreeDLayeredInfographic: React.FC<ThreeDLayeredInfographicProps> = ({
  analytics,
  onSelectPoint,
  height = 560,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const interactiveObjectsRef = useRef<{ mesh: THREE.Mesh; point: TemperatureDataPoint }[]>([]);

  const [hoveredPoint, setHoveredPoint] = useState<TemperatureDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTierFilter, setActiveTierFilter] = useState<'ALL' | 'ABOVE' | 'NORMAL' | 'BELOW'>('ALL');

  const { points, config, summary, unit } = analytics;

  // Initialize Three.js Layered Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const heightPx = typeof height === 'number' ? height : container.clientHeight || 560;

    const bgColor = isDark ? 0x06080d : 0xf1f5f9;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 1000);
    camera.position.set(38, 28, 42);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep isometric perspective
    controls.minDistance = 15;
    controls.maxDistance = 140;
    controls.target.set(0, 5, 0);
    controlsRef.current = controls;

    // Futuristic Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.7 : 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.4 : 1.5);
    mainLight.position.set(30, 50, 30);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Red light for upper tier
    const topTierLight = new THREE.PointLight(0xef4444, 2.0, 35);
    topTierLight.position.set(0, 16, 0);
    scene.add(topTierLight);

    // Emerald light for middle tier
    const midTierLight = new THREE.PointLight(0x00ff41, 1.8, 35);
    midTierLight.position.set(0, 9, 0);
    scene.add(midTierLight);

    // Cyan light for lower tier
    const bottomTierLight = new THREE.PointLight(0x06b6d4, 1.8, 35);
    bottomTierLight.position.set(0, 2, 0);
    scene.add(bottomTierLight);

    buildLayeredInfographic();

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = interactiveObjectsRef.current.map((o) => o.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = interactiveObjectsRef.current.find((o) => o.mesh === intersects[0].object);
        if (hit) {
          setHoveredPoint(hit.point);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredPoint(null);
      container.style.cursor = 'default';
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = interactiveObjectsRef.current.map((o) => o.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = interactiveObjectsRef.current.find((o) => o.mesh === intersects[0].object);
        if (hit && onSelectPoint) {
          onSelectPoint(hit.point);
        }
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handlePointerClick);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 0.8;
        controlsRef.current.update();
      }

      // Gentle floating animation on decorative tier rings
      const decorativeRings = scene.getObjectByName('decorativeRings');
      if (decorativeRings) {
        decorativeRings.rotation.y = elapsedTime * 0.15;
      }

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handlePointerClick);
      renderer.dispose();
    };
  }, [height, isDark]);

  // Build the 3 Layered Platforms & Extruded Nodes
  const buildLayeredInfographic = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const oldInfographic = scene.getObjectByName('infographicGroup');
    if (oldInfographic) scene.remove(oldInfographic);

    interactiveObjectsRef.current = [];

    const infographicGroup = new THREE.Group();
    infographicGroup.name = 'infographicGroup';

    // 3 Distinct Glass Platforms
    // Upper Tier: ABOVE TEMPERATURE (Y = 12)
    // Middle Tier: NORMAL TEMPERATURE (Y = 6)
    // Lower Tier: BELOW TEMPERATURE (Y = 0.5)
    const tiers = [
      {
        id: 'ABOVE',
        name: config.aboveLabel || 'ABOVE TEMPERATURE',
        color: new THREE.Color(config.aboveColor || '#EF4444'),
        hex: config.aboveColor || '#EF4444',
        y: 12,
        radius: 14,
        ruleText: `> ${config.aboveThreshold}${unit}`,
        count: summary.aboveCount,
        percent: summary.abovePercent,
        visible: activeTierFilter === 'ALL' || activeTierFilter === 'ABOVE',
      },
      {
        id: 'NORMAL',
        name: config.normalLabel || 'NORMAL TEMPERATURE',
        color: new THREE.Color(config.normalColor || '#00FF41'),
        hex: config.normalColor || '#00FF41',
        y: 6,
        radius: 17,
        ruleText: `[${config.normalMin} - ${config.normalMax}${unit}]`,
        count: summary.normalCount,
        percent: summary.normalPercent,
        visible: activeTierFilter === 'ALL' || activeTierFilter === 'NORMAL',
      },
      {
        id: 'BELOW',
        name: config.belowLabel || 'BELOW TEMPERATURE',
        color: new THREE.Color(config.belowColor || '#06B6D4'),
        hex: config.belowColor || '#06B6D4',
        y: 0.8,
        radius: 15,
        ruleText: `< ${config.belowThreshold}${unit}`,
        count: summary.belowCount,
        percent: summary.belowPercent,
        visible: activeTierFilter === 'ALL' || activeTierFilter === 'BELOW',
      },
    ];

    // Decorative Rotating Rings Group
    const decorativeRings = new THREE.Group();
    decorativeRings.name = 'decorativeRings';
    infographicGroup.add(decorativeRings);

    // Build each Layer Platform
    tiers.forEach((tier) => {
      if (!tier.visible) return;

      // 1. Futuristic Curved Glass Platform (Extruded Chamfered Cylinder)
      const platformGeo = new THREE.CylinderGeometry(tier.radius, tier.radius + 0.5, 0.4, 48);
      const platformMat = new THREE.MeshPhysicalMaterial({
        color: tier.color,
        transmission: 0.6,
        opacity: 0.85,
        transparent: true,
        roughness: 0.15,
        metalness: 0.2,
        ior: 1.5,
        thickness: 0.5,
      });
      const platformMesh = new THREE.Mesh(platformGeo, platformMat);
      platformMesh.position.y = tier.y;
      platformMesh.receiveShadow = true;
      infographicGroup.add(platformMesh);

      // 2. Outer Neon Perimeter Ring
      const ringGeo = new THREE.TorusGeometry(tier.radius + 0.6, 0.08, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: tier.color });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = tier.y + 0.2;
      infographicGroup.add(ringMesh);

      // 3. Segmented Decorative Circular Ticks
      const tickCount = 24;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        const tickGeo = new THREE.BoxGeometry(0.1, 0.04, 0.6);
        const tickMat = new THREE.MeshBasicMaterial({
          color: tier.color,
          transparent: true,
          opacity: 0.4,
        });
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.set(
          Math.cos(angle) * (tier.radius + 1.1),
          tier.y + 0.2,
          Math.sin(angle) * (tier.radius + 1.1)
        );
        tick.rotation.y = -angle;
        decorativeRings.add(tick);
      }
    });

    // 4. Central Holographic Core Pillar
    const coreGeo = new THREE.CylinderGeometry(1.2, 1.5, 14, 32);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.7,
    });
    const corePillar = new THREE.Mesh(coreGeo, coreMat);
    corePillar.position.y = 6.5;
    infographicGroup.add(corePillar);

    // Laser Light Beam inside Core
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, 16, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf27d26,
      transparent: true,
      opacity: 0.8,
    });
    const laserBeam = new THREE.Mesh(beamGeo, beamMat);
    laserBeam.position.y = 6.5;
    infographicGroup.add(laserBeam);

    // 5. Place Exact Data Nodes onto their Classified Tier
    const tierPoints = {
      ABOVE: points.filter((p) => p.status === 'ABOVE'),
      NORMAL: points.filter((p) => p.status === 'NORMAL'),
      BELOW: points.filter((p) => p.status === 'BELOW'),
    };

    tiers.forEach((tier) => {
      if (!tier.visible) return;

      const tierPts = tierPoints[tier.id as keyof typeof tierPoints] || [];
      const totalInTier = tierPts.length;

      tierPts.forEach((pt, idx) => {
        // Distribute points in concentric rings on the tier platform
        const angle = (idx / Math.max(totalInTier, 1)) * Math.PI * 2 + (idx % 3) * 0.4;
        const ringDist = 3.5 + ((idx % 4) / 4) * (tier.radius - 5.5);

        const xPos = Math.cos(angle) * ringDist;
        const zPos = Math.sin(angle) * ringDist;
        const yPos = tier.y + 0.3;

        // Smooth Extruded Hexagonal Pillar Node
        const nodeHeight = Math.min(2.5, Math.max(0.4, (pt.temperature / (summary.maxTemp || 100)) * 2.2));
        const pillarGeo = new THREE.CylinderGeometry(0.32, 0.38, nodeHeight, 6);
        const pillarMat = new THREE.MeshStandardMaterial({
          color: tier.color,
          emissive: tier.color,
          emissiveIntensity: pt.status === 'ABOVE' ? 0.5 : 0.2,
          roughness: 0.2,
          metalness: 0.7,
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(xPos, yPos + nodeHeight / 2, zPos);
        pillar.castShadow = true;
        infographicGroup.add(pillar);

        // Top Floating Crystal Sphere
        const orbGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(xPos, yPos + nodeHeight + 0.15, zPos);
        infographicGroup.add(orb);

        // Vertical Laser Link connecting tier to base
        const laserLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(xPos, 0, zPos),
          new THREE.Vector3(xPos, yPos, zPos),
        ]);
        const laserLineMat = new THREE.LineBasicMaterial({
          color: tier.color,
          transparent: true,
          opacity: 0.15,
        });
        const laserLine = new THREE.Line(laserLineGeo, laserLineMat);
        infographicGroup.add(laserLine);

        interactiveObjectsRef.current.push({ mesh: pillar, point: pt });
      });
    });

    scene.add(infographicGroup);
  }, [points, config, summary, unit, activeTierFilter]);

  useEffect(() => {
    buildLayeredInfographic();
  }, [buildLayeredInfographic]);

  // Snapshot PNG
  const handleCaptureSnapshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `tatapower_3d_layered_infographic_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="relative w-full rounded-sm bg-[#06080D] border border-[#222] shadow-2xl overflow-hidden select-none">
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full relative focus:outline-none cursor-grab active:cursor-grabbing"
      />

      {/* Floating Header */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        <div className="pointer-events-auto flex items-center space-x-2 bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-xs border border-[#333] shadow-lg">
          <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Layered Isometric Thermal Hierarchy
          </span>
          <span className="text-[10px] font-mono text-[#AAA] border-l border-[#333] pl-2">
            3-Tier Volumetric Glass Model
          </span>
        </div>

        {/* Tier Selector & Actions */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#0A0A0A]/90 backdrop-blur-md p-1 rounded-xs border border-[#333] shadow-lg font-mono text-xs">
          <button
            onClick={() => setActiveTierFilter('ALL')}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              activeTierFilter === 'ALL' ? 'bg-[#F27D26] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
          >
            All Tiers
          </button>

          <button
            onClick={() => setActiveTierFilter('ABOVE')}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              activeTierFilter === 'ABOVE' ? 'bg-[#EF4444] text-white font-bold' : 'text-[#888] hover:text-white'
            }`}
          >
            Above Tier ({summary.aboveCount})
          </button>

          <button
            onClick={() => setActiveTierFilter('NORMAL')}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              activeTierFilter === 'NORMAL' ? 'bg-[#00FF41] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
          >
            Normal Tier ({summary.normalCount})
          </button>

          <button
            onClick={() => setActiveTierFilter('BELOW')}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              activeTierFilter === 'BELOW' ? 'bg-[#06B6D4] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
          >
            Below Tier ({summary.belowCount})
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xs cursor-pointer ${
              autoRotate ? 'bg-[#00FF41] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
            title="Auto-Rotate"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCaptureSnapshot}
            className="p-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-[#F27D26] border border-[#333] cursor-pointer"
            title="Download Snapshot (PNG)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Tier Elevation Labels */}
      <div className="absolute bottom-3 left-3 flex flex-col space-y-1.5 bg-[#0A0A0A]/90 backdrop-blur-md p-3 rounded-xs border border-[#333] shadow-lg font-mono text-xs pointer-events-auto z-20">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#EF4444]" />
            <span className="text-white font-bold text-[11px]">{config.aboveLabel || 'ABOVE TIER'}</span>
          </div>
          <span className="text-rose-400 font-bold">{summary.aboveCount} records ({summary.abovePercent}%)</span>
        </div>

        <div className="flex items-center justify-between space-x-4 border-t border-[#222] pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#00FF41]" />
            <span className="text-white font-bold text-[11px]">{config.normalLabel || 'NORMAL TIER'}</span>
          </div>
          <span className="text-[#00FF41] font-bold">{summary.normalCount} records ({summary.normalPercent}%)</span>
        </div>

        <div className="flex items-center justify-between space-x-4 border-t border-[#222] pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#06B6D4]" />
            <span className="text-white font-bold text-[11px]">{config.belowLabel || 'BELOW TIER'}</span>
          </div>
          <span className="text-cyan-400 font-bold">{summary.belowCount} records ({summary.belowPercent}%)</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="bg-[#0A0A0A]/95 backdrop-blur-md border border-[#F27D26] rounded-xs p-3 shadow-2xl min-w-[220px] text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#222] pb-1">
              <span className="font-bold text-white uppercase">{hoveredPoint.equipment}</span>
              <span
                className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold uppercase text-black"
                style={{ backgroundColor: hoveredPoint.color }}
              >
                {hoveredPoint.statusLabel}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[#888]">Temperature:</span>
              <span className="text-base font-extrabold text-white font-mono">
                {hoveredPoint.temperature} {unit}
              </span>
            </div>

            <div className="text-[10px] text-[#888] flex justify-between">
              <span>Timestamp:</span>
              <span className="text-[#CCC]">{hoveredPoint.timestamp}</span>
            </div>

            <div className="text-[10px] text-[#888] flex justify-between">
              <span>Sequence:</span>
              <span className="text-[#F27D26]">Record #{hoveredPoint.rowIndex + 1}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
