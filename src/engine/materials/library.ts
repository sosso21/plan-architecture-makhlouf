/**
 * Bibliothèque de matériaux partagés, indexés par « rôle ». Les palettes ne
 * font que modifier les couleurs : aucune géométrie n'est reconstruite et
 * aucun shader n'est recompilé lors d'un changement de couleurs.
 */
import * as THREE from 'three';
import type { FloorFinish } from '@/domain/building';
import type { FacadePalette, InteriorStyle } from './palettes';
import { TextureFactory, type TextureId } from './textures';

export type MaterialRole =
  | 'facade' | 'facadeAccent' | 'stone' | 'interiorWall' | 'ceiling' | 'column' | 'slabEdge'
  | `floor.${FloorFinish}`
  | 'frame' | 'glass' | 'door' | 'entryDoor' | 'garageDoor'
  | 'stairWood' | 'stairConcrete' | 'railMetal' | 'railGlass'
  | 'roof' | 'pergola' | 'solar'
  | 'fabric' | 'fabricAccent' | 'wood' | 'woodDark' | 'cabinet' | 'counter' | 'ceramic' | 'metal'
  | 'chrome' | 'appliance' | 'screen' | 'rug' | 'leaf' | 'pot' | 'linen' | 'lampShade'
  | 'carGraphite' | 'carPearl' | 'tire' | 'carGlass' | 'water' | 'cushion';

export type SiteRole = 'terrain' | 'gravel' | 'paving' | 'road' | 'fenceWall' | 'fenceMetal' | 'bark' | 'olive' | 'cypress' | 'pole' | 'contour' | 'boundary' | 'cable';

interface RoleSpec {
  readonly color: string;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly map?: TextureId;
  readonly bump?: number;
  readonly transparent?: { opacity: number };
  readonly poche?: boolean;
  readonly emissive?: string;
}

const ROLE_SPECS: Record<MaterialRole, RoleSpec> = {
  facade: { color: '#efebe3', roughness: 0.92, map: 'plaster', bump: 0.6, poche: true },
  facadeAccent: { color: '#d8cfbf', roughness: 0.85, poche: true },
  stone: { color: '#b9a487', roughness: 0.95, map: 'stoneCladding', bump: 2.2, poche: true },
  interiorWall: { color: '#f3f1ec', roughness: 0.95, poche: true },
  ceiling: { color: '#fbfaf7', roughness: 0.95, poche: true },
  column: { color: '#efebe3', roughness: 0.9, poche: true },
  slabEdge: { color: '#d8cfbf', roughness: 0.85, poche: true },
  'floor.parquet': { color: '#d2b38c', roughness: 0.55, map: 'parquet', bump: 0.6 },
  'floor.tile': { color: '#e6e3dd', roughness: 0.4, map: 'largeTile' },
  'floor.stone': { color: '#dedad2', roughness: 0.35, map: 'largeTile' },
  'floor.concrete': { color: '#b8b5ae', roughness: 0.8, map: 'concrete' },
  'floor.deck': { color: '#a5774f', roughness: 0.75, map: 'deck', bump: 0.8 },
  'floor.wet': { color: '#e9e7e2', roughness: 0.3, map: 'wetTile' },
  'floor.terracotta': { color: '#c87b55', roughness: 0.7, map: 'terracotta' },
  frame: { color: '#2c3034', roughness: 0.45, metalness: 0.3 },
  glass: { color: '#a7c3cf', roughness: 0.04, metalness: 0.15, transparent: { opacity: 0.26 }, emissive: '#ffcf8a' },
  door: { color: '#c9a47c', roughness: 0.6, map: 'woodGrain' },
  entryDoor: { color: '#6d4a31', roughness: 0.55, map: 'woodGrain' },
  garageDoor: { color: '#3a3f44', roughness: 0.5, metalness: 0.35 },
  stairWood: { color: '#b98d62', roughness: 0.55, map: 'woodGrain' },
  stairConcrete: { color: '#cfcac1', roughness: 0.85, map: 'concrete', poche: true },
  railMetal: { color: '#2a2b2d', roughness: 0.4, metalness: 0.7 },
  railGlass: { color: '#cfe3ea', roughness: 0.03, metalness: 0.1, transparent: { opacity: 0.18 } },
  roof: { color: '#cfcbc4', roughness: 0.95, map: 'roof', poche: true },
  pergola: { color: '#8a5f3c', roughness: 0.7, map: 'woodGrain' },
  solar: { color: '#1b2a3d', roughness: 0.2, metalness: 0.6 },
  fabric: { color: '#cfcbc3', roughness: 0.95, map: 'fabric' },
  fabricAccent: { color: '#6f8aa6', roughness: 0.95, map: 'fabric' },
  cushion: { color: '#e9e3d8', roughness: 0.95, map: 'fabric' },
  linen: { color: '#f2efe9', roughness: 0.95, map: 'fabric' },
  wood: { color: '#c9a47c', roughness: 0.6, map: 'woodGrain' },
  woodDark: { color: '#3b3a38', roughness: 0.55, map: 'woodGrain' },
  cabinet: { color: '#f4f2ed', roughness: 0.5 },
  counter: { color: '#e8e5de', roughness: 0.25 },
  ceramic: { color: '#fbfbf9', roughness: 0.15 },
  metal: { color: '#2a2a2a', roughness: 0.45, metalness: 0.6 },
  chrome: { color: '#d7d9db', roughness: 0.15, metalness: 1 },
  appliance: { color: '#d9dadb', roughness: 0.3, metalness: 0.6 },
  screen: { color: '#0e0f11', roughness: 0.15, metalness: 0.2 },
  rug: { color: '#d9d0c1', roughness: 1, map: 'fabric' },
  leaf: { color: '#5f7d45', roughness: 0.8 },
  pot: { color: '#c58a65', roughness: 0.8 },
  lampShade: { color: '#f2e6cf', roughness: 0.9, emissive: '#ffd69a' },
  carGraphite: { color: '#3a3e44', roughness: 0.25, metalness: 0.75 },
  carPearl: { color: '#e9e7e1', roughness: 0.25, metalness: 0.55 },
  tire: { color: '#151515', roughness: 0.9 },
  carGlass: { color: '#1d2730', roughness: 0.05, metalness: 0.4 },
  water: { color: '#bfe0ea', roughness: 0.05, transparent: { opacity: 0.6 } },
};

const SITE_SPECS: Record<SiteRole, RoleSpec> = {
  terrain: { color: '#ffffff', roughness: 1, map: 'grass' },
  gravel: { color: '#ffffff', roughness: 1, map: 'gravel' },
  paving: { color: '#d6cfc3', roughness: 0.85, map: 'paving' },
  road: { color: '#ffffff', roughness: 1, map: 'road' },
  fenceWall: { color: '#e8e2d6', roughness: 0.9, map: 'plaster' },
  fenceMetal: { color: '#2b2c2e', roughness: 0.5, metalness: 0.6 },
  bark: { color: '#6b5a48', roughness: 1 },
  olive: { color: '#7d8a5c', roughness: 0.85 },
  cypress: { color: '#3f5a3a', roughness: 0.9 },
  pole: { color: '#8f8a80', roughness: 0.9 },
  contour: { color: '#f4e7c8', roughness: 1, emissive: '#5a4a2a' },
  boundary: { color: '#ff7a45', roughness: 1, emissive: '#7a2a10' },
  cable: { color: '#202020', roughness: 0.8 },
};

/** Couleur des sections coupées (poché), en espace d'affichage sRGB. */
const POCHE = new THREE.Color('#3a3530');

export class MaterialLibrary {
  /** Plan de coupe horizontal : garde y ≤ constante. */
  readonly clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  readonly textures: TextureFactory;
  private readonly building = new Map<MaterialRole, THREE.MeshStandardMaterial>();
  private readonly site = new Map<SiteRole, THREE.MeshStandardMaterial>();
  private readonly pocheUniform = { value: new THREE.Vector3(POCHE.r, POCHE.g, POCHE.b) };

  constructor(anisotropy: number) {
    this.textures = new TextureFactory(anisotropy);
    (Object.keys(ROLE_SPECS) as MaterialRole[]).forEach((role) => {
      const mat = this.create(ROLE_SPECS[role], role);
      mat.clippingPlanes = [this.clipPlane];
      if (ROLE_SPECS[role].poche) this.installPoche(mat);
      this.building.set(role, mat);
    });
    (Object.keys(SITE_SPECS) as SiteRole[]).forEach((role) => {
      this.site.set(role, this.create(SITE_SPECS[role], role));
    });
  }

  get(role: MaterialRole): THREE.MeshStandardMaterial {
    const m = this.building.get(role);
    if (!m) throw new Error(`Matériau inconnu : ${role}`);
    return m;
  }

  getSite(role: SiteRole): THREE.MeshStandardMaterial {
    const m = this.site.get(role);
    if (!m) throw new Error(`Matériau site inconnu : ${role}`);
    return m;
  }

  /** Active la coupe à l'altitude `y` (monde), ou la désactive avec `null`. */
  setCut(y: number | null): void {
    this.clipPlane.constant = y ?? 1e6;
  }

  applyFacade(p: FacadePalette, frameOverride?: string, wallOverride?: string): void {
    this.color('facade', wallOverride ?? p.wall);
    this.color('column', wallOverride ?? p.wall);
    this.color('facadeAccent', p.accent);
    this.color('slabEdge', p.accent);
    this.color('stone', p.stone);
    this.color('frame', frameOverride ?? p.frame);
    this.color('entryDoor', p.door);
    this.color('garageDoor', p.garage);
    this.color('pergola', p.door);
  }

  applyInterior(s: InteriorStyle, accentOverride?: string): void {
    this.color('interiorWall', s.walls);
    this.color('ceiling', s.ceiling);
    this.color('floor.parquet', s.parquet);
    this.color('floor.stone', s.stone);
    this.color('floor.tile', s.tile);
    this.color('fabric', s.fabric);
    this.color('fabricAccent', accentOverride ?? s.fabricAccent);
    this.color('wood', s.wood);
    this.color('door', s.wood);
    this.color('stairWood', s.wood);
    this.color('woodDark', s.woodDark);
    this.color('cabinet', s.cabinet);
    this.color('counter', s.counter);
    this.color('rug', s.rug);
    this.color('metal', s.metal);
  }

  /** 0 = plein jour, 1 = nuit : vitrages et abat-jour s'illuminent. */
  setNight(f: number): void {
    this.get('glass').emissiveIntensity = 0.55 * f;
    this.get('glass').opacity = 0.26 + 0.34 * f;
    this.get('lampShade').emissiveIntensity = 1.6 * f;
  }

  /** Matériaux exportables (sans extension shader). */
  all(): THREE.Material[] {
    return [...this.building.values(), ...this.site.values()];
  }

  dispose(): void {
    this.all().forEach((m) => m.dispose());
    this.textures.dispose();
  }

  private color(role: MaterialRole, hex: string): void {
    this.get(role).color.set(hex);
  }

  private create(spec: RoleSpec, name: string): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      name,
      color: new THREE.Color(spec.color),
      roughness: spec.roughness ?? 0.8,
      metalness: spec.metalness ?? 0,
    });
    if (spec.map) {
      mat.map = this.textures.get(spec.map);
      if (spec.bump) {
        mat.bumpMap = mat.map;
        mat.bumpScale = spec.bump;
      }
    }
    if (spec.transparent) {
      mat.transparent = true;
      mat.opacity = spec.transparent.opacity;
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;
    }
    if (spec.emissive) {
      mat.emissive = new THREE.Color(spec.emissive);
      mat.emissiveIntensity = 0;
    }
    return mat;
  }

  /** Les faces arrière (visibles dans la coupe) sont peintes d'une teinte unie. */
  private installPoche(mat: THREE.MeshStandardMaterial): void {
    mat.side = THREE.DoubleSide;
    mat.shadowSide = THREE.FrontSide;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPoche = this.pocheUniform;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uPoche;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tif (!gl_FrontFacing) gl_FragColor = vec4(uPoche, 1.0);');
    };
    mat.customProgramCacheKey = () => 'poche-v1';
  }
}
