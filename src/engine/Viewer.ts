/**
 * Visionneuse architecturale : orchestre scène, rendu, caméra et réglages.
 * API impérative, indépendante de React, pilotée par `apply(settings)`.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Building } from '@/domain/building';
import type { Site } from '@/domain/site';
import { buildBuilding, type BuiltBuilding, type RoomInfo } from './builders/building';
import { buildSite, type BuiltSite } from './builders/site';
import { Environment } from './environment/environment';
import { MaterialLibrary } from './materials/library';
import { findFacade, findInterior, isHexColor } from './materials/palettes';
import type { LayerId, Quality, ViewerSettings, ViewId } from './types';

const EXPLODE_GAP = 6.5;
const FLY_MS = 1300;
const TOUR_STEP_MS = 5200;

interface Fly {
  readonly fromPos: THREE.Vector3;
  readonly toPos: THREE.Vector3;
  readonly fromTarget: THREE.Vector3;
  readonly toTarget: THREE.Vector3;
  readonly start: number;
  readonly duration: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface ViewerCallbacks {
  onRoomSelect?: (room: RoomInfo) => void;
  /** Le visiteur a manipulé la caméra (interrompt la visite guidée). */
  onUserInteract?: () => void;
}

export class ArchitectureViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly gtao: GTAOPass | null;
  private readonly lib: MaterialLibrary;
  private env: Environment | null = null;
  private model: BuiltBuilding | null = null;
  private site: BuiltSite | null = null;
  private readonly labels: { object: CSS2DObject; levelId: string }[] = [];
  private readonly contourLabels: CSS2DObject[] = [];
  private readonly lights = new Map<string, THREE.PointLight[]>();
  private readonly explode = new Map<THREE.Object3D, { current: number; target: number }>();
  private settings: ViewerSettings | null = null;
  private fly: Fly | null = null;
  private dirty = true;
  private tourTimer = 0;
  private tourIndex = -1;
  private readonly resizeObserver: ResizeObserver;
  private center = new THREE.Vector3(6, 5, -6);
  private radius = 14;
  private disposed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly quality: Quality,
    private readonly callbacks: ViewerCallbacks = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.className = 'viewer-canvas';
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'viewer-labels';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
    this.camera.position.set(-16, 16, -32);
    this.scene.fog = new THREE.Fog('#cfd9e2', 160, 900);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 170;
    this.controls.addEventListener('change', () => (this.dirty = true));
    this.controls.addEventListener('start', () => {
      this.fly = null;
      this.callbacks.onUserInteract?.();
    });

    const samples = quality === 'low' ? 0 : 4;
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (quality === 'high') {
      this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
      this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      this.gtao.blendIntensity = 0.9;
      this.composer.addPass(this.gtao);
    } else {
      this.gtao = null;
    }
    this.composer.addPass(new OutputPass());

    this.lib = new MaterialLibrary(this.renderer.capabilities.getMaxAnisotropy());
    if (this.gtao) {
      // Le passage des normales doit voir la même coupe que le rendu.
      (this.gtao as unknown as { normalMaterial: THREE.Material }).normalMaterial.clippingPlanes = [this.lib.clipPlane];
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** Construit la maquette. Opération synchrone et coûteuse (≈ 200–600 ms). */
  load(building: Building, site: Site): void {
    const shadow = this.quality === 'high' ? 4096 : this.quality === 'balanced' ? 2048 : 1024;
    this.model = buildBuilding(building, this.lib, site.buildingBase);
    this.scene.add(this.model.root);
    this.center = this.model.bounds.getCenter(new THREE.Vector3());
    this.radius = this.model.bounds.getSize(new THREE.Vector3()).length() / 2;
    this.env = new Environment(this.renderer, this.scene, shadow, this.center.clone().setY(site.buildingBase));

    this.site = buildSite(site, this.lib, building.footprint);
    this.scene.add(this.site.terrain, this.site.vegetation, this.site.fence, this.site.contours, this.site.boundary);
    this.site.contourLabels.forEach(({ position, text }) => {
      const el = document.createElement('span');
      el.className = 'contour-label';
      el.textContent = text;
      const obj = new CSS2DObject(el);
      obj.position.copy(position);
      this.site!.contours.add(obj);
      this.contourLabels.push(obj);
    });

    this.model.levels.forEach((level) => {
      level.rooms.forEach((room) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = room.outdoor ? 'room-label room-label--outdoor' : 'room-label';
        el.textContent = room.name;
        el.title = `Voir ${room.name.toLowerCase()} — ${level.name}`;
        el.addEventListener('click', () => this.callbacks.onRoomSelect?.(room));
        const obj = new CSS2DObject(el);
        obj.position.copy(room.anchor);
        level.group.add(obj);
        this.labels.push({ object: obj, levelId: level.id });
      });
      if (this.quality !== 'low') {
        const ls = level.lightAnchors.map((p) => {
          const light = new THREE.PointLight('#ffd3a0', 0, 9, 2);
          light.position.copy(p);
          level.group.add(light);
          return light;
        });
        this.lights.set(level.id, ls);
      }
      this.explode.set(level.group, { current: 0, target: 0 });
    });
    this.explode.set(this.model.roof, { current: 0, target: 0 });
    this.goTo('ensemble', false);
    this.dirty = true;
  }

  /**
   * Charge un modèle .glb existant (projets livrés sous forme de fichier 3D).
   * Pas de niveaux ni de terrain : ciel, soleil et navigation uniquement.
   */
  async loadModel(url: string, onProgress?: (ratio: number) => void): Promise<void> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url, (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    });
    if (this.disposed) return;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this.scene.add(gltf.scene);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    this.center = bounds.getCenter(new THREE.Vector3());
    this.radius = bounds.getSize(new THREE.Vector3()).length() / 2;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48).rotateX(-Math.PI / 2), this.lib.getSite('terrain'));
    ground.position.y = bounds.min.y - 0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.env = new Environment(this.renderer, this.scene, this.quality === 'low' ? 1024 : 2048, this.center.clone().setY(bounds.min.y));
    this.env.update({ season: 'equinoxe', hour: 15 });
    this.goTo('ensemble', false);
  }

  /** Réglages d'ambiance seuls (modèles .glb). */
  setSun(season: ViewerSettings['season'], hour: number): void {
    this.env?.update({ season, hour });
    this.dirty = true;
  }

  get rooms(): readonly RoomInfo[] {
    return this.model?.levels.flatMap((l) => l.rooms) ?? [];
  }

  get levels() {
    return this.model?.levels.map((l) => ({ id: l.id, name: l.name, shortName: l.shortName })) ?? [];
  }

  apply(next: ViewerSettings): void {
    const prev = this.settings;
    this.settings = next;
    if (!this.model || !this.site) return;
    if (!prev || prev.facade !== next.facade || prev.frame !== next.frame || prev.wall !== next.wall) {
      this.lib.applyFacade(findFacade(next.facade), isHexColor(next.frame) ? next.frame : undefined, isHexColor(next.wall) ? next.wall : undefined);
    }
    if (!prev || prev.interior !== next.interior || prev.accent !== next.accent) {
      this.lib.applyInterior(findInterior(next.interior), isHexColor(next.accent) ? next.accent : undefined);
    }
    if (!prev || prev.season !== next.season || prev.hour !== next.hour) {
      this.env?.update({ season: next.season, hour: next.hour });
      this.lib.setNight(this.env?.nightFactor ?? 0);
      this.applyLights();
    }
    this.applyLevels();
    this.applyLayers(next.layers);
    this.dirty = true;
  }

  private applyLevels(): void {
    const s = this.settings;
    const model = this.model;
    if (!s || !model) return;
    const idx = s.level === 'all' ? model.levels.length : model.levels.findIndex((l) => l.id === s.level);
    const showAll = s.level === 'all' || idx < 0;
    model.levels.forEach((level, i) => {
      level.group.visible = showAll || i <= idx;
      this.explode.get(level.group)!.target = s.exploded ? i * EXPLODE_GAP : 0;
    });
    model.roof.visible = showAll;
    this.explode.get(model.roof)!.target = s.exploded ? model.levels.length * EXPLODE_GAP : 0;
    const top = showAll ? null : model.levels[idx]!;
    this.lib.setCut(top && !s.exploded ? top.floorY + s.cut : null);
    this.labels.forEach(({ object, levelId }) => {
      const visibleLevel = showAll ? false : levelId === top?.id;
      // En vue éclatée, les étiquettes de tous les niveaux se superposeraient.
      object.visible = s.layers.labels && visibleLevel && !s.exploded;
    });
    this.applyLights();
  }

  /**
   * Les lampes ne projettent pas d'ombre : allumées en vue d'ensemble, elles
   * éclaireraient les façades à travers les murs. On ne les allume donc que
   * pour le niveau coupé ; en vue d'ensemble, seuls les vitrages rayonnent.
   */
  private applyLights(): void {
    const night = this.env?.nightFactor ?? 0;
    const s = this.settings;
    const active = s && s.level !== 'all' && !s.exploded ? s.level : null;
    this.lights.forEach((ls, levelId) => ls.forEach((l) => (l.intensity = levelId === active ? night * 26 : 0)));
    this.dirty = true;
  }

  private applyLayers(layers: Readonly<Record<LayerId, boolean>>): void {
    if (!this.model || !this.site) return;
    this.model.levels.forEach((l) => (l.furniture.visible = layers.furniture));
    this.site.terrain.visible = layers.terrain;
    this.site.vegetation.visible = layers.vegetation && layers.terrain;
    this.site.fence.visible = layers.fence && layers.terrain;
    this.site.contours.visible = layers.contours && layers.terrain;
    this.contourLabels.forEach((o) => (o.visible = layers.contours && layers.terrain));
    this.site.boundary.visible = layers.boundary && layers.terrain;
  }

  /* -------------------------------- caméra -------------------------------- */

  goTo(view: ViewId, animate = true): void {
    const c = this.center;
    const r = Math.max(this.radius, 10);
    const offsets: Record<ViewId, THREE.Vector3> = {
      ensemble: new THREE.Vector3(-1.25, 0.85, -1.55),
      piste: new THREE.Vector3(0.12, 0.32, -2.2),
      jardin: new THREE.Vector3(-0.2, 0.5, 2.1),
      est: new THREE.Vector3(2.2, 0.45, 0.25),
      ouest: new THREE.Vector3(-2.2, 0.45, -0.2),
      aerienne: new THREE.Vector3(1.2, 2.3, 1.15),
      plan: new THREE.Vector3(0, 3.6, 0.001),
    };
    const pos = c.clone().addScaledVector(offsets[view], r * this.portraitFit());
    this.flyTo(pos, c.clone(), animate);
  }

  focusRoom(room: RoomInfo, animate = true): void {
    const target = room.bounds.getCenter(new THREE.Vector3());
    target.y = room.anchor.y + 0.6;
    const size = room.bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 3.5);
    const outward = target.clone().sub(this.center).setY(0);
    if (outward.lengthSq() < 0.5) outward.set(-1, 0, -1);
    outward.normalize();
    const k = this.portraitFit();
    const pos = target.clone().addScaledVector(outward, span * 0.95 * k).add(new THREE.Vector3(0, (span * 1.25 + 2.5) * k, 0));
    this.flyTo(pos, target, animate);
  }

  /** Recul supplémentaire sur écran vertical (le champ horizontal y est étroit). */
  private portraitFit(): number {
    return this.camera.aspect < 1 ? Math.min(2.2, 1 / Math.pow(this.camera.aspect, 0.8)) : 1;
  }

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3, animate: boolean): void {
    if (!animate) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.fly = null;
      this.dirty = true;
      return;
    }
    this.fly = {
      fromPos: this.camera.position.clone(),
      toPos: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      start: performance.now(),
      duration: FLY_MS,
    };
  }

  /* --------------------------- visite guidée ----------------------------- */

  startTour(rooms: readonly RoomInfo[], onStep: (room: RoomInfo | null) => void): void {
    this.stopTour();
    if (rooms.length === 0) return;
    const step = () => {
      this.tourIndex = (this.tourIndex + 1) % rooms.length;
      onStep(rooms[this.tourIndex]!);
      this.tourTimer = window.setTimeout(step, TOUR_STEP_MS);
    };
    this.tourIndex = -1;
    step();
  }

  stopTour(): void {
    window.clearTimeout(this.tourTimer);
    this.tourTimer = 0;
  }

  /* ------------------------------ exports -------------------------------- */

  async screenshot(): Promise<Blob> {
    this.render();
    return new Promise((resolve, reject) =>
      this.renderer.domElement.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture impossible'))), 'image/png'),
    );
  }

  /* ------------------------------- boucle -------------------------------- */

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.dirty = true;
  }

  private frame(now: number): void {
    if (this.disposed) return;
    let animating = false;
    if (this.fly) {
      const t = Math.min(1, (now - this.fly.start) / this.fly.duration);
      const k = ease(t);
      this.camera.position.lerpVectors(this.fly.fromPos, this.fly.toPos, k);
      this.controls.target.lerpVectors(this.fly.fromTarget, this.fly.toTarget, k);
      if (t >= 1) this.fly = null;
      animating = true;
    }
    this.explode.forEach((state, obj) => {
      if (Math.abs(state.current - state.target) > 0.002) {
        state.current += (state.target - state.current) * 0.12;
        obj.position.y = state.current;
        animating = true;
      } else if (state.current !== state.target) {
        state.current = state.target;
        obj.position.y = state.current;
        animating = true;
      }
    });
    this.controls.update();
    if (animating || this.dirty) {
      this.render();
      this.dirty = false;
    }
  }

  private render(): void {
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.stopTour();
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.env?.dispose();
    this.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    this.lib.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
