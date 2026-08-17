import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Camera,
  Layers,
  Sliders,
  Eye,
  Activity,
  Compass,
  Grid,
  Sparkles,
} from 'lucide-react';
import { TemperatureAnalyticsPayload, TemperatureDataPoint } from '../../types';

interface ThreeDSurfaceGraphProps {
  analytics: TemperatureAnalyticsPayload;
  onSelectPoint?: (point: TemperatureDataPoint | null) => void;
  height?: number | string;
  wireframeOverride?: boolean;
}

export const ThreeDSurfaceGraph: React.FC<ThreeDSurfaceGraphProps> = ({
  analytics,
  onSelectPoint,
  height = 560,
  wireframeOverride,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const interactiveObjectsRef = useRef<{ mesh: THREE.Mesh; point: TemperatureDataPoint }[]>([]);

  const [hoveredPoint, setHoveredPoint] = useState<TemperatureDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showThresholdPlanes, setShowThresholdPlanes] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [wireframe, setWireframe] = useState(wireframeOverride || analytics.config?.wireframe || false);

  const { points, config, summary, xCategories, equipmentList, unit } = analytics;

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const heightPx = typeof height === 'number' ? height : container.clientHeight || 560;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(30, 24, 34);
    cameraRef.current = camera;

    // WebGL Renderer with High-DPI support
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
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // allow slight under-angle
    controls.minDistance = 5;
    controls.maxDistance = 120;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(25, 40, 20);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf27d26, 0.5); // Warm Tata Power amber rim
    dirLight2.position.set(-25, 20, -20);
    scene.add(dirLight2);

    const blueRimLight = new THREE.DirectionalLight(0x0284c7, 0.4);
    blueRimLight.position.set(0, -20, 20);
    scene.add(blueRimLight);

    // Build Graph Geometry
    build3DGraph();

    // Raycaster for Hover
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
        controlsRef.current.autoRotateSpeed = 1.0;
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
  }, [height]);

  // Re-build Graph on Data or Settings Change
  const build3DGraph = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous graph objects
    const graphGroup = scene.getObjectByName('graphGroup');
    if (graphGroup) {
      scene.remove(graphGroup);
    }

    interactiveObjectsRef.current = [];

    const newGroup = new THREE.Group();
    newGroup.name = 'graphGroup';

    if (!points || points.length === 0) {
      scene.add(newGroup);
      return;
    }

    // Graph Dimensions
    const gridXSize = 36; // X span for time sequence
    const gridZSize = 22; // Z span for equipment depth
    const maxGraphHeight = 14;

    const minT = summary.minTemp || 0;
    const maxT = Math.max(summary.maxTemp || 100, minT + 1);
    const tempRange = maxT - minT || 1;

    // Y Position Mapping Function (Temperature -> 3D Y coordinate)
    const mapTempToY = (t: number) => {
      const normalized = (t - minT) / tempRange;
      return normalized * maxGraphHeight + 0.2;
    };

    // Color mapper based on classification
    const getColorForPoint = (pt: TemperatureDataPoint) => {
      if (pt.status === 'ABOVE') return new THREE.Color(config.aboveColor || '#EF4444');
      if (pt.status === 'BELOW') return new THREE.Color(config.belowColor || '#06B6D4');
      return new THREE.Color(config.normalColor || '#00FF41');
    };

    // 1. Base Grid Floor & Axes
    const gridHelper = new THREE.GridHelper(40, 20, 0xf27d26, 0x1f293d);
    gridHelper.position.y = 0;
    newGroup.add(gridHelper);

    // Coordinate Origin Axes
    const axesHelper = new THREE.AxesHelper(6);
    axesHelper.position.set(-gridXSize / 2, 0, gridZSize / 2);
    newGroup.add(axesHelper);

    // 2. Threshold Reference Planes (Above Ceiling & Below Floor)
    if (showThresholdPlanes) {
      // Normal Max / Above Threshold Plane
      if (config.aboveThreshold !== undefined) {
        const aboveY = mapTempToY(config.aboveThreshold);
        if (aboveY >= 0 && aboveY <= maxGraphHeight * 1.5) {
          const planeGeo = new THREE.PlaneGeometry(gridXSize + 2, gridZSize + 2);
          const planeMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(config.aboveColor || '#EF4444'),
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const abovePlane = new THREE.Mesh(planeGeo, planeMat);
          abovePlane.rotation.x = -Math.PI / 2;
          abovePlane.position.set(0, aboveY, 0);
          newGroup.add(abovePlane);

          // Threshold Border Wire
          const wireGeo = new THREE.EdgesGeometry(planeGeo);
          const wireMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(config.aboveColor || '#EF4444'),
            transparent: true,
            opacity: 0.5,
          });
          const wire = new THREE.LineSegments(wireGeo, wireMat);
          wire.rotation.x = -Math.PI / 2;
          wire.position.set(0, aboveY, 0);
          newGroup.add(wire);
        }
      }

      // Normal Min / Below Threshold Plane
      if (config.belowThreshold !== undefined) {
        const belowY = mapTempToY(config.belowThreshold);
        if (belowY >= 0 && belowY <= maxGraphHeight * 1.5) {
          const planeGeo = new THREE.PlaneGeometry(gridXSize + 2, gridZSize + 2);
          const planeMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(config.belowColor || '#06B6D4'),
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const belowPlane = new THREE.Mesh(planeGeo, planeMat);
          belowPlane.rotation.x = -Math.PI / 2;
          belowPlane.position.set(0, belowY, 0);
          newGroup.add(belowPlane);

          const wireGeo = new THREE.EdgesGeometry(planeGeo);
          const wireMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(config.belowColor || '#06B6D4'),
            transparent: true,
            opacity: 0.5,
          });
          const wire = new THREE.LineSegments(wireGeo, wireMat);
          wire.rotation.x = -Math.PI / 2;
          wire.position.set(0, belowY, 0);
          newGroup.add(wire);
        }
      }
    }

    // 3. Mathematical Surface Mesh Construction
    const numX = Math.min(xCategories.length, 50);
    const numZ = Math.max(equipmentList.length, 2);

    if (showMesh && numX >= 2) {
      const segX = numX - 1;
      const segZ = numZ - 1;
      const planeGeo = new THREE.PlaneGeometry(gridXSize, gridZSize, segX, segZ);
      planeGeo.rotateX(-Math.PI / 2);

      const positions = planeGeo.attributes.position;
      const count = positions.count;

      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const xVal = positions.getX(i);
        const zVal = positions.getZ(i);

        // Normalized 0..1 coordinates
        const u = (xVal + gridXSize / 2) / gridXSize;
        const v = (zVal + gridZSize / 2) / gridZSize;

        const xIdx = Math.min(Math.floor(u * xCategories.length), xCategories.length - 1);
        const eqIdx = Math.min(Math.floor(v * equipmentList.length), equipmentList.length - 1);

        const targetTime = xCategories[xIdx];
        const targetEq = equipmentList[eqIdx];

        // Find matching point in real uploaded records
        const matched = points.find(
          (p) => (p.timestamp === targetTime || p.xIndex === xIdx) && (p.equipment === targetEq || p.equipmentIndex === eqIdx)
        ) || points.find((p) => p.xIndex === xIdx) || points[Math.min(i, points.length - 1)];

        const temp = matched ? matched.temperature : minT;
        const yVal = mapTempToY(temp);
        positions.setY(i, yVal);

        // Color vertex based on classification
        const c = matched ? getColorForPoint(matched) : new THREE.Color(0x00ff41);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      planeGeo.computeVertexNormals();

      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.25,
        metalness: 0.35,
        wireframe: wireframe,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });

      const surfaceMesh = new THREE.Mesh(planeGeo, surfaceMat);
      surfaceMesh.receiveShadow = true;
      surfaceMesh.castShadow = true;
      newGroup.add(surfaceMesh);

      // Wireframe overlay if not in wireframe mode
      if (!wireframe) {
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.08,
        });
        const wireOverlay = new THREE.Mesh(planeGeo, wireMat);
        newGroup.add(wireOverlay);
      }
    }

    // 4. Elevated Data Point Spheres at Exact Coordinates
    if (showPoints) {
      const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const glowGeo = new THREE.RingGeometry(0.38, 0.6, 16);

      points.forEach((pt) => {
        const u = xCategories.length > 1 ? pt.xIndex / (xCategories.length - 1) : 0.5;
        const v = equipmentList.length > 1 ? pt.equipmentIndex / (equipmentList.length - 1) : 0.5;

        const posX = (u - 0.5) * gridXSize;
        const posZ = (v - 0.5) * gridZSize;
        const posY = mapTempToY(pt.temperature);

        const pointColor = getColorForPoint(pt);

        const sphereMat = new THREE.MeshStandardMaterial({
          color: pointColor,
          emissive: pointColor,
          emissiveIntensity: pt.status === 'ABOVE' ? 0.6 : 0.25,
          roughness: 0.2,
          metalness: 0.8,
        });

        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(posX, posY, posZ);
        sphere.castShadow = true;
        newGroup.add(sphere);

        // Ground drop laser guide
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(posX, 0, posZ),
          new THREE.Vector3(posX, posY, posZ),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: pointColor,
          transparent: true,
          opacity: pt.status === 'ABOVE' ? 0.45 : 0.2,
        });
        const dropLine = new THREE.Line(lineGeo, lineMat);
        newGroup.add(dropLine);

        // Ground Target Ring
        const ringMat = new THREE.MeshBasicMaterial({
          color: pointColor,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const groundRing = new THREE.Mesh(glowGeo, ringMat);
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.set(posX, 0.02, posZ);
        newGroup.add(groundRing);

        interactiveObjectsRef.current.push({ mesh: sphere, point: pt });
      });
    }

    scene.add(newGroup);
  }, [points, config, summary, xCategories, equipmentList, showThresholdPlanes, showPoints, showMesh, wireframe]);

  useEffect(() => {
    build3DGraph();
  }, [build3DGraph]);

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'side' | 'front') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === 'iso') {
      camera.position.set(30, 24, 34);
    } else if (preset === 'top') {
      camera.position.set(0, 50, 0.1);
    } else if (preset === 'side') {
      camera.position.set(50, 8, 0);
    } else if (preset === 'front') {
      camera.position.set(0, 10, 48);
    }
    controls.target.set(0, 4, 0);
    controls.update();
  };

  // High-Resolution Snapshot Capture
  const handleCaptureSnapshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `tatapower_3d_temperature_surface_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="relative w-full rounded-sm bg-[#07090E] border border-[#222] shadow-2xl overflow-hidden select-none">
      {/* 3D Canvas Mount */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full relative focus:outline-none cursor-grab active:cursor-grabbing"
      />

      {/* Floating Header & Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        {/* Title Tag */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-xs border border-[#333] shadow-lg">
          <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Mathematical 3D Surface Matrix
          </span>
          <span className="text-[10px] font-mono text-[#AAA] border-l border-[#333] pl-2">
            Z-Axis: {config.metricColumn} ({unit})
          </span>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#0A0A0A]/90 backdrop-blur-md p-1 rounded-xs border border-[#333] shadow-lg font-mono text-xs">
          {/* Camera Presets */}
          <div className="flex items-center space-x-1 border-r border-[#333] pr-1.5 mr-0.5">
            <button
              onClick={() => setCameraPreset('iso')}
              className="px-2 py-1 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white text-[11px] cursor-pointer"
              title="Isometric 3D Perspective"
            >
              ISO
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className="px-2 py-1 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white text-[11px] cursor-pointer"
              title="Top-Down Plan View"
            >
              TOP
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className="px-2 py-1 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-white text-[11px] cursor-pointer"
              title="Front Elevation"
            >
              FRONT
            </button>
          </div>

          {/* Toggle Mesh */}
          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              showMesh ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40' : 'text-[#777] hover:text-white'
            }`}
            title="Toggle Surface Mesh"
          >
            Mesh
          </button>

          {/* Toggle Points */}
          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              showPoints ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40' : 'text-[#777] hover:text-white'
            }`}
            title="Toggle Point Spheres"
          >
            Nodes
          </button>

          {/* Toggle Threshold Planes */}
          <button
            onClick={() => setShowThresholdPlanes(!showThresholdPlanes)}
            className={`px-2 py-1 rounded-xs cursor-pointer ${
              showThresholdPlanes ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'text-[#777] hover:text-white'
            }`}
            title="Toggle Threshold Reference Planes"
          >
            Planes
          </button>

          {/* Wireframe */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded-xs cursor-pointer ${
              wireframe ? 'bg-[#F27D26] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
            title="Toggle Wireframe Mode"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Auto Rotate */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xs cursor-pointer ${
              autoRotate ? 'bg-[#00FF41] text-black font-bold' : 'text-[#888] hover:text-white'
            }`}
            title="Auto-Rotate Camera"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>

          {/* Snapshot PNG */}
          <button
            onClick={handleCaptureSnapshot}
            className="p-1.5 rounded-xs bg-[#111] hover:bg-[#222] text-[#AAA] hover:text-[#F27D26] border border-[#333] cursor-pointer"
            title="Download 3D View Snapshot (PNG)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating 3D Legend Bar */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-2 rounded-xs border border-[#333] shadow-lg font-mono text-[11px] pointer-events-auto z-20">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: config.aboveColor || '#EF4444' }} />
          <span className="text-[#CCC]">{config.aboveLabel || 'ABOVE'}</span>
          <span className="text-[#888]">(&gt;{config.aboveThreshold}{unit})</span>
        </div>

        <div className="flex items-center space-x-1.5 pl-2 border-l border-[#333]">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: config.normalColor || '#00FF41' }} />
          <span className="text-[#CCC]">{config.normalLabel || 'NORMAL'}</span>
          <span className="text-[#888]">([{config.normalMin}-{config.normalMax}{unit}])</span>
        </div>

        <div className="flex items-center space-x-1.5 pl-2 border-l border-[#333]">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: config.belowColor || '#06B6D4' }} />
          <span className="text-[#CCC]">{config.belowLabel || 'BELOW'}</span>
          <span className="text-[#888]">(&lt;{config.belowThreshold}{unit})</span>
        </div>
      </div>

      {/* Interactive Floating Glass HUD Tooltip */}
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
              <span>Record Sequence:</span>
              <span className="text-[#F27D26]">#{hoveredPoint.rowIndex + 1}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
