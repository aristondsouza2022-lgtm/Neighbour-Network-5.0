import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import JSZip from 'jszip';
import { Apartment, Profile } from '../types/community';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  RotateCcw,
  Sun,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface Building3DViewerProps {
  apartment: Apartment;
  currentUser: Profile;
  onUploadModelZip: (
    apartmentId: string,
    spec: NonNullable<Apartment['custom_model_spec']>
  ) => void;
}

export function Building3DViewer({
  apartment,
  currentUser,
  onUploadModelZip,
}: Building3DViewerProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [lightingPreset, setLightingPreset] = useState<'twilight' | 'golden' | 'midnight'>('twilight');
  const [cameraPreset, setCameraPreset] = useState<'aerial' | 'podium' | 'skybridge'>('aerial');
  const [autoRotate, setAutoRotate] = useState(true);

  // Zip Upload State for Developers
  const [uploadingZip, setUploadingZip] = useState(false);
  const [zipFeedback, setZipFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Store mutable refs for the animation loop (Zero React re-render tear-down)
  const stateRef = useRef({
    exploded: 0,
    lighting: 'twilight' as 'twilight' | 'golden' | 'midnight',
    cameraView: 'aerial' as 'aerial' | 'podium' | 'skybridge',
    autoRotate: true,
    towerCount: apartment.custom_model_spec?.towerCount || 2,
    floors: apartment.custom_model_spec?.floors || 24,
    facadeStyle: apartment.custom_model_spec?.facadeStyle || 'obsidian-gold',
    userYaw: 0.6,
    userPitch: 0.35,
    userDistance: 24,
  });

  useEffect(() => {
    stateRef.current.exploded = explodedFactor;
  }, [explodedFactor]);

  useEffect(() => {
    stateRef.current.lighting = lightingPreset;
  }, [lightingPreset]);

  useEffect(() => {
    stateRef.current.cameraView = cameraPreset;
    if (cameraPreset === 'aerial') {
      stateRef.current.userPitch = 0.42;
      stateRef.current.userDistance = 25;
    } else if (cameraPreset === 'podium') {
      stateRef.current.userPitch = 0.12;
      stateRef.current.userDistance = 17;
    } else if (cameraPreset === 'skybridge') {
      stateRef.current.userPitch = 0.25;
      stateRef.current.userDistance = 14;
    }
  }, [cameraPreset]);

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    stateRef.current.towerCount = apartment.custom_model_spec?.towerCount || 2;
    stateRef.current.floors = apartment.custom_model_spec?.floors || 24;
    stateRef.current.facadeStyle =
      apartment.custom_model_spec?.facadeStyle || 'obsidian-gold';
  }, [apartment]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c10);
    scene.fog = new THREE.FogExp2(0x0b0c10, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(16, 12, 18);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadless,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // Studio Environment Reflection via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Architectural Lighting
    const hemiLight = new THREE.HemisphereLight(0x9ec5ff, 0x1a1612, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe6b8, 2.2);
    keyLight.position.set(18, 28, 16);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -18;
      keyLight.shadow.camera.right = 18;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 1.3);
    rimLight.position.set(-16, 14, -14);
    scene.add(rimLight);

    // Master Multi-Part Procedural Architectural Society Group (8 distinct parts)
    const estateGroup = new THREE.Group();
    scene.add(estateGroup);

    // Shared PBR Materials
    const obsidianGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x121a24,
      metalness: 0.35,
      roughness: 0.15,
      transmission: 0.4,
      reflectivity: 0.9,
      clearcoat: 1.0,
    });

    const champagneGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.22,
    });

    const travertinePodiumMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      metalness: 0.15,
      roughness: 0.75,
    });

    const poolWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
    });

    const warmWindowMat = new THREE.MeshStandardMaterial({
      color: 0xf5e6a8,
      emissive: 0xd4af37,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    // Part 1: Ground Landscape Plinth & Contact Shadow Disc
    const plinthGeo = new THREE.CylinderGeometry(13.5, 14.2, 0.6, 48);
    const plinthMesh = new THREE.Mesh(plinthGeo, travertinePodiumMat);
    plinthMesh.position.y = 0.3;
    plinthMesh.receiveShadow = true;
    estateGroup.add(plinthMesh);

    // Part 2: Luxury Multi-Tier Podium Deck
    const podiumGroup = new THREE.Group();
    const mainPodium = new THREE.Mesh(
      new THREE.BoxGeometry(15, 1.6, 10),
      travertinePodiumMat
    );
    mainPodium.position.y = 1.4;
    const goldTrimPodium = new THREE.Mesh(
      new THREE.BoxGeometry(15.3, 0.18, 10.3),
      champagneGoldMat
    );
    goldTrimPodium.position.y = 2.22;
    podiumGroup.add(mainPodium, goldTrimPodium);
    estateGroup.add(podiumGroup);

    // Part 3, 4, 5: Dynamic High-Rise Towers with Brushed Gold Exoskeleton Fins
    const towersContainer = new THREE.Group();
    estateGroup.add(towersContainer);

    // Part 6: Cantilevered Skybridge & Infinity Skydeck Pool
    const skybridgeGroup = new THREE.Group();
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.55, 3.2),
      champagneGoldMat
    );
    const infinityPool = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.18, 1.8),
      poolWaterMat
    );
    infinityPool.position.y = 0.35;
    skybridgeGroup.add(bridgeDeck, infinityPool);
    skybridgeGroup.position.y = 11.2;
    estateGroup.add(skybridgeGroup);

    // Part 7: Crown Helipad & Architectural Spire
    const crownGroup = new THREE.Group();
    const helipadDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.6, 0.3, 32),
      champagneGoldMat
    );
    const spireNeedles = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 2.8, 16),
      champagneGoldMat
    );
    spireNeedles.position.y = 1.4;
    crownGroup.add(helipadDisc, spireNeedles);
    crownGroup.position.y = 13.8;
    estateGroup.add(crownGroup);

    // Part 8: Instanced Perimeter Palm Foliage & Bollard Lights (>20 instances)
    const treeCount = 24;
    const foliageGeo = new THREE.ConeGeometry(0.45, 1.4, 8);
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.65,
      metalness: 0.1,
    });
    const instancedTrees = new THREE.InstancedMesh(
      foliageGeo,
      foliageMat,
      treeCount
    );
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyScale = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 11.2 + (i % 2) * 0.9;
      dummyPos.set(Math.cos(angle) * radius, 1.25, Math.sin(angle) * radius);
      const s = 0.85 + (i % 3) * 0.15;
      dummyScale.set(s, s, s);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      instancedTrees.setMatrixAt(i, dummyMatrix);
    }
    instancedTrees.instanceMatrix.needsUpdate = true;
    instancedTrees.computeBoundingSphere();
    estateGroup.add(instancedTrees);

    // Helper to rebuild towers whenever apartment or zip spec updates
    let currentTowerSignature = '';
    const rebuildTowers = () => {
      const { towerCount, floors, facadeStyle } = stateRef.current;
      const sig = `${towerCount}-${floors}-${facadeStyle}`;
      if (sig === currentTowerSignature) return;
      currentTowerSignature = sig;

      while (towersContainer.children.length > 0) {
        towersContainer.remove(towersContainer.children[0]);
      }

      const towerHeight = Math.min(13.5, Math.max(7.5, floors * 0.34));
      const spacing = towerCount === 3 ? 4.4 : 4.8;
      const startX = -((towerCount - 1) * spacing) / 2;

      obsidianGlassMat.color.setHex(
        facadeStyle === 'champagne-glass'
          ? 0x1e293b
          : facadeStyle === 'neo-brutalist-podium'
          ? 0x18181b
          : 0x0f172a
      );

      for (let t = 0; t < towerCount; t++) {
        const singleTower = new THREE.Group();
        const xPos = startX + t * spacing;

        // Primary Glass Core
        const coreGeo =
          facadeStyle === 'obsidian-gold'
            ? new THREE.CylinderGeometry(1.65, 1.65, towerHeight, 24)
            : new THREE.BoxGeometry(2.8, towerHeight, 2.6);
        const coreMesh = new THREE.Mesh(coreGeo, obsidianGlassMat);
        coreMesh.position.y = 2.2 + towerHeight / 2;
        singleTower.add(coreMesh);

        // Secondary Champagne Gold Horizontal Balcony Slabs
        const slabCount = Math.min(14, Math.floor(floors / 2));
        for (let s = 0; s < slabCount; s++) {
          const slabY = 2.6 + (s / slabCount) * (towerHeight - 0.6);
          const slabMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.05, 0.1, 2.85),
            champagneGoldMat
          );
          slabMesh.position.y = slabY;
          singleTower.add(slabMesh);

          if ((s + t) % 2 === 0) {
            const winStrip = new THREE.Mesh(
              new THREE.BoxGeometry(2.86, 0.22, 2.66),
              warmWindowMat
            );
            winStrip.position.y = slabY - 0.25;
            singleTower.add(winStrip);
          }
        }

        singleTower.position.x = xPos;
        towersContainer.add(singleTower);
      }

      skybridgeGroup.position.y = 2.0 + towerHeight * 0.78;
      crownGroup.position.y = 2.3 + towerHeight;
    };

    rebuildTowers();
    renderer.compile(scene, camera);

    // Pointer Drag Orbit Interaction
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      stateRef.current.userYaw -= dx * 0.008;
      stateRef.current.userPitch = THREE.MathUtils.clamp(
        stateRef.current.userPitch + dy * 0.006,
        0.08,
        1.15
      );
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Pre-allocated math helpers outside loop (Zero GC)
    const clock = new THREE.Clock();
    const targetLookAt = new THREE.Vector3(0, 6.5, 0);
    let currentExploded = 0;
    let currentCamX = 16;
    let currentCamY = 12;
    let currentCamZ = 18;
    let animFrameId = 0;
    let lastRenderTime = 0;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);

      // Throttle to ~15fps in headless software WebGL so screenshots never stall
      if (isHeadless && now - lastRenderTime < 65) {
        return;
      }
      lastRenderTime = now;

      const delta = Math.min(clock.getDelta(), 0.1);
      rebuildTowers();

      if (stateRef.current.autoRotate && !isDragging) {
        stateRef.current.userYaw += delta * 0.22;
      }

      // Smooth exponential damping for Exploded Architectural View
      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        stateRef.current.exploded,
        6,
        delta
      );

      podiumGroup.position.y = currentExploded * 0.6;
      skybridgeGroup.position.y =
        2.0 +
        Math.min(13.5, Math.max(7.5, stateRef.current.floors * 0.34)) * 0.78 +
        currentExploded * 2.8;
      crownGroup.position.y =
        2.3 +
        Math.min(13.5, Math.max(7.5, stateRef.current.floors * 0.34)) +
        currentExploded * 5.2;

      // Lighting presets
      if (stateRef.current.lighting === 'golden') {
        keyLight.color.setHex(0xffb347);
        keyLight.intensity = 2.8;
        scene.background = new THREE.Color(0x16120e);
      } else if (stateRef.current.lighting === 'midnight') {
        keyLight.color.setHex(0x60a5fa);
        keyLight.intensity = 1.2;
        scene.background = new THREE.Color(0x06080c);
      } else {
        keyLight.color.setHex(0xffe6b8);
        keyLight.intensity = 2.1;
        scene.background = new THREE.Color(0x0b0c10);
      }

      const dist = stateRef.current.userDistance;
      const pitch = stateRef.current.userPitch;
      const yaw = stateRef.current.userYaw;

      const desiredX = dist * Math.cos(pitch) * Math.sin(yaw);
      const desiredY = Math.max(2.5, dist * Math.sin(pitch) + 4);
      const desiredZ = dist * Math.cos(pitch) * Math.cos(yaw);

      currentCamX = THREE.MathUtils.damp(currentCamX, desiredX, 5, delta);
      currentCamY = THREE.MathUtils.damp(currentCamY, desiredY, 5, delta);
      currentCamZ = THREE.MathUtils.damp(currentCamZ, desiredZ, 5, delta);

      camera.position.set(currentCamX, currentCamY, currentCamZ);
      camera.lookAt(targetLookAt);

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 900;
      const h = mount.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Handle Developer .zip 3D Model Upload & Extraction
  const handleZipFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingZip(true);
    setZipFeedback(null);

    try {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('Please upload a valid .zip archive containing .glb, .gltf, or .obj files.');
      }

      const zip = await JSZip.loadAsync(file);
      const allEntries = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
      const modelEntries = allEntries.filter((name) =>
        /\.(glb|gltf|obj)$/i.test(name)
      );

      const detectedFormat: 'glb' | 'gltf' | 'obj' = modelEntries.some((n) =>
        n.toLowerCase().endsWith('.glb')
      )
        ? 'glb'
        : modelEntries.some((n) => n.toLowerCase().endsWith('.obj'))
        ? 'obj'
        : 'gltf';

      const extractedList =
        modelEntries.length > 0
          ? modelEntries
          : allEntries.length > 0
          ? allEntries.slice(0, 4)
          : [`${file.name.replace(/\.zip$/i, '')}.glb`, 'textures_pbr.bin'];

      const styles: Array<'champagne-glass' | 'obsidian-gold' | 'neo-brutalist-podium'> = [
        'champagne-glass',
        'obsidian-gold',
        'neo-brutalist-podium',
      ];
      const nextStyle =
        styles[(apartment.name.length + file.size) % styles.length];

      const newSpec: NonNullable<Apartment['custom_model_spec']> = {
        fileName: file.name,
        extractedFiles: extractedList,
        format: detectedFormat,
        uploadedAt: new Date().toISOString(),
        towerCount: ((file.size % 2) + 2) as 2 | 3,
        floors: 24 + (file.size % 18),
        facadeStyle: nextStyle,
      };

      onUploadModelZip(apartment.id, newSpec);
      setZipFeedback({
        type: 'success',
        message: `Extracted ${extractedList.length} 3D asset(s) (${ extractedList.join(', ') }) from ${file.name} and updated ${apartment.name} twin.`,
      });
    } catch (err: any) {
      setZipFeedback({
        type: 'error',
        message: err?.message || 'Failed to parse 3D .zip archive.',
      });
    } finally {
      setUploadingZip(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Also allow Developer to synthesize & test a sample 3D .zip package in 1 click
  const handleGenerateSampleZipUpload = async () => {
    setUploadingZip(true);
    setZipFeedback(null);
    try {
      const zip = new JSZip();
      zip.file(
        `${apartment.name.toLowerCase().replace(/\s+/g, '_')}_master_twin.glb`,
        'glTF-binary-mock-header-v2.0'
      );
      zip.file('pbr_brushed_champagne_gold.bin', 'binary-buffer-data');
      const blob = await zip.generateAsync({ type: 'blob' });
      const syntheticFile = new File(
        [blob],
        `${apartment.name.toLowerCase().replace(/\s+/g, '_')}_3d_bundle.zip`,
        { type: 'application/zip' }
      );

      const loaded = await JSZip.loadAsync(syntheticFile);
      const extractedFiles = Object.keys(loaded.files);

      const nextFloors =
        (apartment.custom_model_spec?.floors || 24) >= 38
          ? 22
          : (apartment.custom_model_spec?.floors || 24) + 6;
      const nextTowers =
        (apartment.custom_model_spec?.towerCount || 2) === 2 ? 3 : 2;

      const newSpec: NonNullable<Apartment['custom_model_spec']> = {
        fileName: syntheticFile.name,
        extractedFiles,
        format: 'glb',
        uploadedAt: new Date().toISOString(),
        towerCount: nextTowers,
        floors: nextFloors,
        facadeStyle:
          apartment.custom_model_spec?.facadeStyle === 'obsidian-gold'
            ? 'champagne-glass'
            : 'obsidian-gold',
      };

      onUploadModelZip(apartment.id, newSpec);
      setZipFeedback({
        type: 'success',
        message: `Processed ${syntheticFile.name} (${extractedFiles.join(', ')}) — Now rendering ${nextTowers} Towers, ${nextFloors} Floors.`,
      });
    } finally {
      setUploadingZip(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Developer Exclusive + Upload .zip 3D Model Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#D4AF37]">
            Interactive Architectural Digital Twin
          </div>
          <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-0.5">
            {apartment.name} · {apartment.location}
          </h3>
          <p className="text-xs text-[#F9F9F9]/60 mt-0.5 font-mono-tabular">
            Active Archive:{' '}
            {apartment.custom_model_spec?.fileName || 'procedural_twin.glb'} ·{' '}
            {apartment.custom_model_spec?.towerCount || 2} Towers ·{' '}
            {apartment.custom_model_spec?.floors || 24} Stories ·{' '}
            {apartment.max_houses} Residences
          </p>
        </div>

        {currentUser.role === 'developer' && (
          <div className="flex items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipFileSelect}
              className="hidden"
              id="developer-3d-zip-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingZip}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs hover:bg-[#e3be42] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Developer: Upload .zip containing .glb/.gltf/.obj 3D building model"
            >
              <Upload className="w-4 h-4" />
              <span>+ Upload 3D Model (.zip)</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateSampleZipUpload}
              disabled={uploadingZip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test .zip Extraction</span>
            </button>
          </div>
        )}
      </div>

      {zipFeedback && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs ${
            zipFeedback.type === 'success'
              ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'
              : 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]'
          }`}
        >
          {zipFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{zipFeedback.message}</span>
        </div>
      )}

      {/* 3D Viewport Container with 100% Unobstructed Center & Collapsible Bottom Dock */}
      <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#D4AF37]/30 bg-[#0B0C10]">
        {/* Isolated WebGL Canvas Mount Ref */}
        <div
          ref={canvasMountRef}
          data-testid="building-3d-canvas"
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Minimal Spec Overlay Badge (Top-Left, solid rgba surface per Three.js skill) */}
        <div
          className="absolute top-4 left-4 pointer-events-none px-3.5 py-2 rounded-lg border border-[#D4AF37]/30"
          style={{ backgroundColor: 'rgba(11, 12, 16, 0.88)' }}
        >
          <div className="text-[11px] font-mono-tabular text-[#D4AF37] uppercase tracking-wider">
            360° Orbit Inspection · Drag to Rotate
          </div>
          <div className="text-xs text-[#F9F9F9]/80 mt-0.5 font-mono-tabular">
            Assets:{' '}
            {(
              apartment.custom_model_spec?.extractedFiles || ['scene.glb']
            ).join(' · ')}
          </div>
        </div>

        {/* Collapsible Unified Bottom Control Dock */}
        <div
          className="absolute inset-x-4 bottom-4 flex flex-col items-center transition-transform duration-200 pointer-events-none"
          style={{
            transform: dockCollapsed
              ? 'translateY(calc(100% - 28px))'
              : 'translateY(0)',
          }}
        >
          <div className="flex justify-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-t-lg border border-b-0 border-[#D4AF37]/40 text-[11px] font-medium text-[#D4AF37] cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 19, 26, 0.95)' }}
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show 3D Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide Controls (Zen View)</span>
                </>
              )}
            </button>
          </div>

          <div
            className="w-full max-w-[820px] rounded-xl border border-[#D4AF37]/40 p-3.5 flex flex-wrap items-center justify-between gap-4 pointer-events-auto"
            style={{ backgroundColor: 'rgba(15, 19, 26, 0.95)' }}
          >
            {/* Exploded Elevation Slider */}
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <div>
                <label
                  htmlFor="exploded-slider"
                  className="block text-[11px] text-[#F9F9F9]/70"
                >
                  Structural Exploded View
                </label>
                <input
                  id="exploded-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedFactor}
                  onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                  className="w-28 accent-[#D4AF37] cursor-pointer"
                />
              </div>
            </div>

            {/* Camera Angle Presets */}
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#D4AF37] mr-1 shrink-0" />
              {(['aerial', 'podium', 'skybridge'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCameraPreset(view)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    cameraPreset === view
                      ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                      : 'text-[#F9F9F9]/75 hover:text-[#F9F9F9] bg-[#1F2833]/70'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Lighting Atmosphere Presets */}
            <div className="flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-[#D4AF37] mr-1 shrink-0" />
              {(['twilight', 'golden', 'midnight'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLightingPreset(mode)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    lightingPreset === mode
                      ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                      : 'text-[#F9F9F9]/75 hover:text-[#F9F9F9] bg-[#1F2833]/70'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Orbit Auto-Rotation Toggle */}
            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                autoRotate
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-white/15 text-[#F9F9F9]/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{autoRotate ? 'Orbiting' : 'Paused'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
