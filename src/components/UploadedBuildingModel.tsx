import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import JSZip from 'jszip';
import { AlertCircle, CheckCircle2, Cuboid, LoaderCircle, RotateCcw, UploadCloud } from 'lucide-react';
import type { Apartment, Profile } from '../types/community';
import { supabase } from '../lib/supabase';

const BUCKET = 'building-models';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const LOCAL_ASSET_ORIGIN = 'https://model-assets.invalid/';

type BundleFile = { relativePath: string; file: Blob };
type ModelBundle = {
  format: 'glb' | 'gltf';
  modelRelativePath: string;
  files: BundleFile[];
  mainFile: Blob;
  fileName: string;
};

type ModelSpec = NonNullable<Apartment['custom_model_spec']> & {
  modelFormat?: 'glb' | 'gltf';
  rootPath?: string;
  modelRelativePath?: string;
  assetFiles?: string[];
};

function normalizedPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

async function makeBundle(file: File): Promise<ModelBundle> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('The selected file is larger than the 100 MB upload limit.');
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.glb')) {
    return {
      format: 'glb',
      modelRelativePath: file.name,
      files: [{ relativePath: file.name, file }],
      mainFile: file,
      fileName: file.name,
    };
  }

  if (lower.endsWith('.gltf')) {
    let parsed: any;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('This .gltf file is not valid JSON.'); }
    const uris: string[] = [
      ...(Array.isArray(parsed?.buffers) ? parsed.buffers.map((item: any) => item?.uri) : []),
      ...(Array.isArray(parsed?.images) ? parsed.images.map((item: any) => item?.uri) : []),
    ].filter((uri): uri is string => typeof uri === 'string' && !uri.startsWith('data:'));
    if (uris.length) {
      throw new Error('This .gltf references separate textures or binary files. Put the .gltf and all referenced files into one ZIP archive, preserving their folders, then upload the ZIP.');
    }
    return {
      format: 'gltf',
      modelRelativePath: file.name,
      files: [{ relativePath: file.name, file }],
      mainFile: file,
      fileName: file.name,
    };
  }

  if (!lower.endsWith('.zip')) throw new Error('Choose a .glb, self-contained .gltf, or ZIP containing a .gltf and its resources.');
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const models = entries.filter((entry) => /\.(glb|gltf)$/i.test(entry.name));
  if (models.length !== 1) throw new Error('The ZIP must contain exactly one .glb or .gltf model file.');
  const modelEntry = models[0];
  const modelRelativePath = normalizedPath(modelEntry.name);
  if (modelRelativePath.split('/').some((part) => part === '..')) throw new Error('The model ZIP contains an unsafe file path.');
  const files: BundleFile[] = [];
  let totalBytes = 0;
  for (const entry of entries) {
    const relativePath = normalizedPath(entry.name);
    if (relativePath.startsWith('/') || relativePath.split('/').some((part) => part === '..')) {
      throw new Error('The ZIP contains an unsafe file path.');
    }
    const blob = await entry.async('blob');
    totalBytes += blob.size;
    if (totalBytes > MAX_UPLOAD_BYTES) throw new Error('The uncompressed model files exceed the 100 MB upload limit.');
    files.push({ relativePath, file: blob });
  }
  const mainFile = files.find((item) => item.relativePath === modelRelativePath)?.file;
  if (!mainFile) throw new Error('Could not read the model file from the ZIP.');
  if (modelRelativePath.toLowerCase().endsWith('.gltf')) {
    let gltf: any;
    try { gltf = JSON.parse(await mainFile.text()); } catch { throw new Error('The .gltf file inside the ZIP is not valid JSON.'); }
    const modelDirectory = modelRelativePath.includes('/') ? modelRelativePath.slice(0, modelRelativePath.lastIndexOf('/') + 1) : '';
    const uris: string[] = [
      ...(Array.isArray(gltf?.buffers) ? gltf.buffers.map((item: any) => item?.uri) : []),
      ...(Array.isArray(gltf?.images) ? gltf.images.map((item: any) => item?.uri) : []),
    ].filter((uri): uri is string => typeof uri === 'string' && !uri.startsWith('data:'));
    for (const uri of uris) {
      const resolved = normalizedPath(modelDirectory + decodeURIComponent(uri));
      if (!files.some((item) => item.relativePath === resolved)) {
        throw new Error(`Missing model resource in ZIP: ${uri}`);
      }
    }
  }
  return {
    format: modelRelativePath.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf',
    modelRelativePath,
    files,
    mainFile,
    fileName: file.name,
  };
}

function mimeForPath(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'glb') return 'model/gltf-binary';
  if (ext === 'gltf') return 'model/gltf+json';
  if (ext === 'bin') return 'application/octet-stream';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'ktx2') return 'image/ktx2';
  return 'application/octet-stream';
}

function ModelCanvas({ apartment, preview }: { apartment: Apartment; preview?: ModelBundle | null }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let frame = 0;
    let model: THREE.Object3D | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const objectUrls: string[] = [];

    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      controls?.dispose();
      if (model) {
        model.traverse((item: any) => {
          if (item.geometry) item.geometry.dispose();
          if (item.material) {
            const materials = Array.isArray(item.material) ? item.material : [item.material];
            materials.forEach((material: any) => {
              Object.values(material).forEach((value: any) => {
                if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) value.dispose();
              });
              material.dispose();
            });
          }
        });
      }
      renderer?.dispose();
      if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };

    const run = async () => {
      setError(null);
      setLoading(true);
      const spec = (apartment.custom_model_spec ?? {}) as ModelSpec;
      let modelBuffer: ArrayBuffer;
      let rootPath = '';
      let modelRelativePath = '';
      let fileUrlByRelativePath: Record<string, string> = {};

      if (preview) {
        rootPath = '';
        modelRelativePath = preview.modelRelativePath;
        for (const item of preview.files) {
          const url = URL.createObjectURL(item.file);
          objectUrls.push(url);
          fileUrlByRelativePath[item.relativePath] = url;
        }
        modelBuffer = await preview.mainFile.arrayBuffer();
      } else {
        const mainPath = apartment.model_3d_url;
        if (!mainPath || !spec.modelFormat || !spec.rootPath || !spec.modelRelativePath || !Array.isArray(spec.assetFiles)) {
          setLoading(false);
          return;
        }
        rootPath = spec.rootPath;
        modelRelativePath = spec.modelRelativePath;
        const { data: signedItems, error: signedError } = await supabase!.storage.from(BUCKET).createSignedUrls(spec.assetFiles, 3600);
        if (signedError) throw signedError;
        (signedItems ?? []).forEach((item: any, index: number) => {
          if (item.signedUrl) {
            const fullPath = spec.assetFiles![index];
            const relative = fullPath.startsWith(rootPath + '/') ? fullPath.slice(rootPath.length + 1) : fullPath;
            fileUrlByRelativePath[relative] = item.signedUrl;
          }
        });
        const mainUrl = fileUrlByRelativePath[modelRelativePath];
        if (!mainUrl) throw new Error('The saved 3D model file is missing from storage.');
        const response = await fetch(mainUrl);
        if (!response.ok) throw new Error('The saved 3D model could not be downloaded. Please ask the admin to upload it again.');
        modelBuffer = await response.arrayBuffer();
      }

      if (cancelled) return;
      const width = Math.max(mount.clientWidth, 320);
      const height = Math.max(mount.clientHeight, 280);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#090b14');
      scene.add(new THREE.HemisphereLight(0xdce7ff, 0x202033, 2.0));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
      keyLight.position.set(8, 12, 10);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.2);
      fillLight.position.set(-8, 5, -8);
      scene.add(fillLight);
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100000);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (url.startsWith('data:') || url.startsWith('blob:')) return url;
        try {
          const parsed = new URL(url);
          let relative = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
          const rootMarker = rootPath ? rootPath + '/' : '';
          if (rootMarker && relative.includes(rootMarker)) relative = relative.slice(relative.indexOf(rootMarker) + rootMarker.length);
          if (fileUrlByRelativePath[relative]) return fileUrlByRelativePath[relative];
          const suffix = Object.keys(fileUrlByRelativePath).find((key) => relative === key || relative.endsWith('/' + key));
          if (suffix) return fileUrlByRelativePath[suffix];
        } catch { /* Keep Three.js's URL if it is not a model dependency. */ }
        return url;
      });
      const loader = new GLTFLoader(manager);
      const modelDirectory = modelRelativePath.includes('/')
        ? modelRelativePath.slice(0, modelRelativePath.lastIndexOf('/') + 1)
        : '';
      const parseBase = preview
        ? `${LOCAL_ASSET_ORIGIN}${modelDirectory}`
        : `${LOCAL_ASSET_ORIGIN}${rootPath}/${modelDirectory}`;
      const gltf = await loader.parseAsync(modelBuffer, parseBase);
      if (cancelled) {
        gltf.scene.traverse((item: any) => {
          if (item.geometry) item.geometry.dispose();
        });
        return;
      }
      model = gltf.scene;
      scene.add(model);
      const bounds = new THREE.Box3().setFromObject(model);
      if (bounds.isEmpty()) throw new Error('The uploaded model contains no visible 3D geometry.');
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const size = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 0.1);
      const distance = maxDimension * 2.2;
      camera.position.set(distance, distance * 0.72, distance);
      camera.near = Math.max(maxDimension / 10000, 0.001);
      camera.far = maxDimension * 100;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.minDistance = maxDimension * 0.05;
      controls.maxDistance = maxDimension * 25;
      controls.update();

      const render = () => {
        if (cancelled || !renderer || !controls) return;
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
      resizeObserver = new ResizeObserver(() => {
        if (!renderer || !mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      });
      resizeObserver.observe(mount);
      setLoading(false);
    };

    run().catch((cause: unknown) => {
      if (!cancelled) {
        console.error('Unable to render uploaded building model:', cause);
        setError(cause instanceof Error ? cause.message : 'The 3D model could not be loaded.');
        setLoading(false);
      }
    });
    return cleanup;
  }, [apartment.id, apartment.model_3d_url, apartment.custom_model_spec, preview]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#090b14]">
      <div ref={mountRef} className="h-[320px] w-full sm:h-[420px]" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#090b14]/85 text-sm text-white/80">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-violet-300" /> Loading original 3D model…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#090b14] p-6 text-center text-sm text-rose-200">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
        </div>
      )}
      {!preview && !apartment.model_3d_url && !loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white/60">
          <Cuboid className="h-8 w-8 text-violet-300" />
          <span>No 3D building model has been uploaded for this residence yet.</span>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-widest text-white/60">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

export function UploadedBuildingViewer({ apartment }: { apartment: Apartment }) {
  const spec = (apartment.custom_model_spec ?? {}) as ModelSpec;
  const hasModel = Boolean(
    apartment.model_3d_url &&
    !apartment.model_3d_url.startsWith('procedural://') &&
    spec.modelFormat && spec.rootPath && spec.modelRelativePath && spec.assetFiles?.length
  );

  return (
    <section className="mb-5 rounded-2xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(76,29,149,0.2),rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/10 text-violet-200">
          <Cuboid className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">{apartment.name} · 3D Building</h2>
          <p className="text-xs text-white/55">{hasModel ? 'Original admin-uploaded model' : 'Building model preview'}</p>
        </div>
      </div>
      {hasModel ? (
        <ModelCanvas apartment={apartment} />
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-7 text-center text-sm text-white/60">
          <Cuboid className="mx-auto mb-2 h-7 w-7 text-violet-300" />
          No saved 3D model is available for this residence yet. An authorized admin can upload one from the Admin Panel.
        </div>
      )}
    </section>
  );
}

export function BuildingModelManager({
  apartment,
  currentUser,
  onSaved,
}: {
  apartment: Apartment;
  currentUser: Profile;
  onSaved: (apartment: Apartment) => void;
}) {
  const [bundle, setBundle] = useState<ModelBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canUpload = currentUser.role === 'developer' || (currentUser.role === 'admin' && currentUser.apartment_id === apartment.id);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setFeedback(null);
    try {
      const parsed = await makeBundle(file);
      setBundle(parsed);
      setFeedback({ type: 'success', message: `Ready to preview: ${file.name}` });
    } catch (cause: unknown) {
      setBundle(null);
      setFeedback({ type: 'error', message: cause instanceof Error ? cause.message : 'Could not read the selected model.' });
    }
  };

  const saveModel = async () => {
    if (!supabase || !bundle || !canUpload) return;
    setBusy(true);
    setFeedback(null);
    const uploadId = crypto.randomUUID();
    const rootPath = `${apartment.id}/${uploadId}`;
    const uploadedPaths: string[] = [];
    try {
      for (let index = 0; index < bundle.files.length; index += 1) {
        const item = bundle.files[index];
        const path = `${rootPath}/${item.relativePath}`;
        setProgress(`Uploading asset ${index + 1} of ${bundle.files.length}…`);
        const { error } = await supabase.storage.from(BUCKET).upload(path, item.file, {
          contentType: mimeForPath(item.relativePath),
          upsert: false,
          cacheControl: '3600',
        });
        if (error) throw error;
        uploadedPaths.push(path);
      }

      const mainPath = `${rootPath}/${bundle.modelRelativePath}`;
      setProgress('Saving building metadata…');
      const previousSpec = (apartment.custom_model_spec ?? {}) as ModelSpec;
      const spec: ModelSpec = {
        fileName: bundle.fileName,
        extractedFiles: bundle.files.map((item) => item.relativePath),
        format: bundle.format,
        modelFormat: bundle.format,
        uploadedAt: new Date().toISOString(),
        towerCount: previousSpec.towerCount ?? 0,
        floors: previousSpec.floors ?? 0,
        facadeStyle: previousSpec.facadeStyle ?? 'obsidian-gold',
        rootPath,
        modelRelativePath: bundle.modelRelativePath,
        assetFiles: uploadedPaths,
      };
      const { data, error } = await supabase
        .from('apartments')
        .update({ model_3d_url: mainPath, custom_model_spec: spec })
        .eq('id', apartment.id)
        .select('*')
        .single();
      if (error) throw error;
      onSaved(data as Apartment);
      setFeedback({ type: 'success', message: 'The original 3D model is saved. Members of this residence can now view it on their own devices.' });
      setBundle(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (cause: unknown) {
      if (uploadedPaths.length) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths).catch(() => undefined);
      }
      console.error('Unable to save building model:', cause);
      setFeedback({ type: 'error', message: cause instanceof Error ? cause.message : 'The model could not be saved. Please try again.' });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  if (!canUpload) return null;

  return (
    <section className="mb-5 rounded-2xl border border-violet-400/25 bg-[#11131d] p-5 text-white">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl border border-violet-300/25 bg-violet-400/10 p-3 text-violet-200"><UploadCloud className="h-5 w-5" /></div>
        <div>
          <h2 className="text-base font-semibold">Upload exact 3D building model</h2>
          <p className="mt-1 text-xs leading-5 text-white/55">Residence: {apartment.name}. Upload a .glb, a self-contained .gltf, or a ZIP with one .gltf and all its textures/resources.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf,.zip,model/gltf-binary,model/gltf+json,application/zip"
          disabled={busy}
          onChange={(event) => void chooseFile(event.target.files?.[0])}
          className="block w-full min-w-0 text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-100 hover:file:bg-violet-500/30"
        />
        {bundle && (
          <button type="button" onClick={() => void saveModel()} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {busy ? 'Saving…' : apartment.model_3d_url ? 'Replace model' : 'Save model'}
          </button>
        )}
        {bundle && !busy && (
          <button type="button" onClick={() => { setBundle(null); setFeedback(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs text-white/70 hover:bg-white/5">
            <RotateCcw className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {bundle && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/65">
            <div className="font-medium text-white">{bundle.fileName}</div>
            <div className="mt-1">{bundle.format.toUpperCase()} · {bundle.files.length} asset file(s) · Preview the exact model below before saving.</div>
          </div>
          <ModelCanvas apartment={apartment} preview={bundle} />
        </div>
      )}
      {busy && progress && <p className="mt-3 text-xs text-violet-200">{progress}</p>}
      {feedback && (
        <div className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${feedback.type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-5 text-white/40">The model file is stored privately in Supabase Storage. Replacing a model creates a new asset first and only switches the active building after the upload succeeds.</p>
    </section>
  );
}
