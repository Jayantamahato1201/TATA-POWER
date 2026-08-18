import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Sliders,
  Compass,
  Grid,
  Sparkles,
  Info,
} from 'lucide-react';
import { MetricAnalyticsPayload, Metric3DDataPoint } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Metric3DSurfaceGraphProps {
  payload: MetricAnalyticsPayload;
  onSelectPoint?: (point: Metric3DDataPoint | null) => void;
  height?: number | string;
  wireframeOverride?: boolean;
}

export const Metric3DSurfaceGraph: React.FC<Metric3DSurfaceGraphProps> = ({
  payload,
  onSelectPoint,
  height = 480,
  wireframeOverride,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const interactiveObjectsRef = useRef<{ mesh: THREE.Mesh; point: Metric3DDataPoint }[]>([]);

  const [hoveredPoint, setHoveredPoint] = useState<Metric3DDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showThresholdPlanes, setShowThresholdPlanes] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [wireframe, setWireframe] = useState(wireframeOverride || false);
  const [verticalScale, setVerticalScale] = useState(1.0);

  const { metric, points, xCategories, equipmentList, distribution } = payload;
  const { thresholds, colorScheme, unit } = metric;

  if (!points || points.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="p-3 bg-slate-900 text-slate-400 rounded-xl border border-slate-800 mb-3">
          <Layers className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-bold text-slate-300 font-mono">Insufficient data for visualization</p>
        <p className="text-xs text-slate-500 font-mono mt-1 max-w-sm">
          No valid numeric telemetry points recorded for {metric.name} in this selection.
        </p>
      </div>
    );
  }

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const heightPx = typeof height === 'number' ? height : container.clientHeight || 480;

    const bgColor = isDark ? 0x07090e : 0xf1f5f9;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(28, 22, 32);
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

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.85 : 1.15);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, isDark ? 1.2 : 1.4);
    dirLight1.position.set(30, 45, 25);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const primaryColorHex = parseInt((colorScheme.primary || '#38BDF8').replace('#', '0x'), 16);
    const accentLight = new THREE.DirectionalLight(primaryColorHex, 0.6);
    accentLight.position.set(-25, 20, -20);
    scene.add(accentLight);

    // Build Graph Geometry
    build3DGraph();

    // Raycaster for Hover & Click
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
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
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

  // Re-build Graph on Data or Settings Change
  const build3DGraph = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = scene.getObjectByName('metricGraphGroup');
    if (existing) {
      scene.remove(existing);
    }

    interactiveObjectsRef.current = [];

    const newGroup = new THREE.Group();
    newGroup.name = 'metricGraphGroup';

    if (!points || points.length === 0) {
      scene.add(newGroup);
      return;
    }

    // Graph Dimensions
    const gridXSize = 34; // Time sequence span
    const gridZSize = 20; // Equipment depth span
    const maxGraphHeight = 12 * verticalScale;

    const minV = distribution.stats.min;
    const maxV = Math.max(distribution.stats.max, minV + 0.1);
    const vRange = maxV - minV || 1;

    // Y mapping function (Value -> Physical 3D elevation)
    const mapValToY = (val: number) => {
      const norm = (val - minV) / vRange;
      return norm * maxGraphHeight + 0.2;
    };

    // Color mapping
    const getPointColor = (pt: Metric3DDataPoint) => {
      if (pt.status === 'HIGH') return new THREE.Color(thresholds.highColor || '#EF4444');
      if (pt.status === 'LOW') return new THREE.Color(thresholds.lowColor || '#06B6D4');
      return new THREE.Color(thresholds.normalColor || colorScheme.primary || '#00FF41');
    };

    // 1. Grid Floor
    const gridColorHex = parseInt((colorScheme.primary || '#38BDF8').replace('#', '0x'), 16);
    const gridHelper = new THREE.GridHelper(38, 20, gridColorHex, 0x1f293d);
    gridHelper.position.y = 0;
    newGroup.add(gridHelper);

    // 2. Threshold Reference Planes
    if (showThresholdPlanes && thresholds.enabled) {
      if (thresholds.high !== undefined) {
        const highY = mapValToY(thresholds.high);
        if (highY >= 0 && highY <= maxGraphHeight * 1.5) {
          const planeGeom = new THREE.PlaneGeometry(gridXSize, gridZSize);
          planeGeom.rotateX(-Math.PI / 2);
          const planeMat = new THREE.MeshBasicMaterial({
            color: parseInt((thresholds.highColor || '#EF4444').replace('#', '0x'), 16),
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            wireframe: false,
          });
          const highPlane = new THREE.Mesh(planeGeom, planeMat);
          highPlane.position.set(0, highY, 0);
          newGroup.add(highPlane);

          // Border Wire
          const wireGeom = new THREE.WireframeGeometry(planeGeom);
          const wireMat = new THREE.LineBasicMaterial({
            color: parseInt((thresholds.highColor || '#EF4444').replace('#', '0x'), 16),
            transparent: true,
            opacity: 0.5,
          });
          const wireLine = new THREE.LineSegments(wireGeom, wireMat);
          wireLine.position.set(0, highY, 0);
          newGroup.add(wireLine);
        }
      }

      if (thresholds.low !== undefined) {
        const lowY = mapValToY(thresholds.low);
        if (lowY >= 0 && lowY <= maxGraphHeight * 1.5) {
          const planeGeom = new THREE.PlaneGeometry(gridXSize, gridZSize);
          planeGeom.rotateX(-Math.PI / 2);
          const planeMat = new THREE.MeshBasicMaterial({
            color: parseInt((thresholds.lowColor || '#06B6D4').replace('#', '0x'), 16),
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
          });
          const lowPlane = new THREE.Mesh(planeGeom, planeMat);
          lowPlane.position.set(0, lowY, 0);
          newGroup.add(lowPlane);
        }
      }
    }

    // 3. 3D Surface Mesh Geometry
    const numX = Math.max(xCategories.length, 2);
    const numZ = Math.max(equipmentList.length, 2);

    if (showMesh && numX > 1 && numZ > 1) {
      const surfaceGeom = new THREE.PlaneGeometry(gridXSize, gridZSize, numX - 1, numZ - 1);
      surfaceGeom.rotateX(-Math.PI / 2);

      const posAttr = surfaceGeom.attributes.position;
      const count = posAttr.count;

      const colors = new Float32Array(count * 3);
      const defaultColor = new THREE.Color(colorScheme.primary || '#38BDF8');

      // Create Matrix lookup: [xIdx][zIdx] -> { y, color }
      const matrixMap: { y: number; color: THREE.Color }[][] = Array.from({ length: numX }, () =>
        Array.from({ length: numZ }, () => ({
          y: 0,
          color: defaultColor,
        }))
      );

      points.forEach((p) => {
        if (p.xIndex < numX && p.equipmentIndex < numZ) {
          matrixMap[p.xIndex][p.equipmentIndex] = {
            y: mapValToY(p.value),
            color: getPointColor(p),
          };
        }
      });

      for (let i = 0; i < count; i++) {
        const zIdx = Math.floor(i / numX);
        const xIdx = i % numX;

        const cell = (matrixMap[xIdx] && matrixMap[xIdx][zIdx]) || { y: 0, color: defaultColor };
        posAttr.setY(i, cell.y);

        colors[i * 3] = cell.color.r;
        colors[i * 3 + 1] = cell.color.g;
        colors[i * 3 + 2] = cell.color.b;
      }

      surfaceGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      surfaceGeom.computeVertexNormals();

      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        wireframe: wireframe,
        roughness: 0.35,
        metalness: 0.25,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });

      const surfaceMesh = new THREE.Mesh(surfaceGeom, surfaceMat);
      surfaceMesh.receiveShadow = true;
      surfaceMesh.castShadow = true;
      newGroup.add(surfaceMesh);
    }

    // 4. Data Point Spheres
    if (showPoints) {
      const sphereGeom = new THREE.SphereGeometry(0.38, 16, 16);

      points.forEach((p) => {
        const xPos = numX > 1 ? -gridXSize / 2 + (p.xIndex / (numX - 1)) * gridXSize : 0;
        const zPos = numZ > 1 ? -gridZSize / 2 + (p.equipmentIndex / (numZ - 1)) * gridZSize : 0;
        const yPos = mapValToY(p.value);

        const pointColor = getPointColor(p);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: pointColor,
          emissive: pointColor,
          emissiveIntensity: p.status === 'HIGH' ? 0.8 : p.status === 'LOW' ? 0.4 : 0.2,
          roughness: 0.2,
          metalness: 0.7,
        });

        const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
        sphereMesh.position.set(xPos, yPos, zPos);
        newGroup.add(sphereMesh);

        // Vertical drop line to floor
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(xPos, 0, zPos),
          new THREE.Vector3(xPos, yPos, zPos),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: pointColor,
          transparent: true,
          opacity: 0.3,
        });
        const dropLine = new THREE.Line(lineGeom, lineMat);
        newGroup.add(dropLine);

        interactiveObjectsRef.current.push({ mesh: sphereMesh, point: p });
      });
    }

    scene.add(newGroup);
  }, [
    points,
    xCategories,
    equipmentList,
    distribution,
    thresholds,
    colorScheme,
    showThresholdPlanes,
    showPoints,
    showMesh,
    wireframe,
    verticalScale,
  ]);

  useEffect(() => {
    build3DGraph();
  }, [build3DGraph]);

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side') => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    ctrl.autoRotate = false;
    setAutoRotate(false);

    if (preset === 'iso') {
      cam.position.set(28, 22, 32);
      ctrl.target.set(0, 4, 0);
    } else if (preset === 'top') {
      cam.position.set(0, 48, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (preset === 'front') {
      cam.position.set(0, 10, 42);
      ctrl.target.set(0, 4, 0);
    } else if (preset === 'side') {
      cam.position.set(44, 10, 0);
      ctrl.target.set(0, 4, 0);
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* 3D Canvas Viewport */}
      <div ref={containerRef} style={{ height }} className="w-full bg-[#07090e] cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive Controls Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl z-20">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-md text-xs font-medium transition-all ${
            autoRotate ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Auto-Rotate Camera"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setWireframe(!wireframe)}
          className={`p-1.5 rounded-md text-xs font-medium transition-all ${
            wireframe ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Wireframe Mesh"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowThresholdPlanes(!showThresholdPlanes)}
          className={`p-1.5 rounded-md text-xs font-medium transition-all ${
            showThresholdPlanes ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Threshold Alarm Planes"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowPoints(!showPoints)}
          className={`p-1.5 rounded-md text-xs font-medium transition-all ${
            showPoints ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Telemetry Data Nodes"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* View Angle Presets */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            3D ISO
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            TOP
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            FRONT
          </button>
        </div>
      </div>

      {/* Metric Title & Range Badge (Top Left) */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 shadow-xl z-20 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: colorScheme.primary || '#38BDF8' }}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {metric.name} ({unit || 'Units'})
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            3D Elevation: Physical Z-Height
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Min: <b className="text-slate-200">{distribution.stats.min} {unit}</b></span>
          <span>Avg: <b className="text-slate-200">{distribution.stats.avg} {unit}</b></span>
          <span>Max: <b className="text-slate-200">{distribution.stats.max} {unit}</b></span>
        </div>
      </div>

      {/* Vertical Scale Slider (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl z-20 flex items-center gap-2">
        <Sliders className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] text-slate-400 font-mono">Z-Scale:</span>
        <input
          type="range"
          min="0.4"
          max="2.5"
          step="0.1"
          value={verticalScale}
          onChange={(e) => setVerticalScale(parseFloat(e.target.value))}
          className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <span className="text-[11px] font-mono text-cyan-400">{verticalScale.toFixed(1)}x</span>
      </div>

      {/* Dynamic 3D Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-2.5 shadow-2xl text-xs font-mono min-w-[200px]"
          style={{
            left: Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 600) - 220),
            top: Math.max(tooltipPos.y - 80, 15),
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-slate-200">{hoveredPoint.equipment}</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{
                backgroundColor: `${hoveredPoint.color}20`,
                color: hoveredPoint.color,
                border: `1px solid ${hoveredPoint.color}40`,
              }}
            >
              {hoveredPoint.statusLabel}
            </span>
          </div>
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-400">{metric.name}:</span>
            <span className="text-base font-black text-white">
              {hoveredPoint.value} <span className="text-xs font-normal text-slate-400">{unit}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Timestamp:</span>
            <span>{hoveredPoint.timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
};
