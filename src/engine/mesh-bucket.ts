/**
 * Accumulateur de géométries : chaque pièce est convertie en non-indexée avec
 * des UV « monde » (1 unité = 1 m), puis fusionnée par matériau. On obtient
 * quelques dizaines d'appels de rendu pour toute la maison.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec2 } from '@/domain/building';

/** Repère plan (x, y, altitude z) → repère three (x, y = haut, z = -y plan). */
export const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y);

export interface BucketOptions {
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

export class MeshBucket<K extends string> {
  private readonly parts = new Map<K, THREE.BufferGeometry[]>();

  constructor(private readonly resolve: (key: K) => THREE.Material) {}

  /** Boîte alignée, bornes en repère plan. */
  box(key: K, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    const w = Math.abs(x1 - x0);
    const d = Math.abs(y1 - y0);
    const h = Math.abs(z1 - z0);
    if (w < 1e-4 || d < 1e-4 || h < 1e-4) return;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
    this.add(key, g);
  }

  /** Prisme vertical à base polygonale (repère plan), de z0 à z1. */
  prism(key: K, polygon: readonly Vec2[], z0: number, z1: number, holes: readonly (readonly Vec2[])[] = []): void {
    const geom = prismGeometry(polygon, z0, z1, holes);
    if (geom) this.add(key, geom);
  }

  /** Ajoute une géométrie déjà placée en coordonnées monde. */
  add(key: K, geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4): void {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    g = normalizeAttributes(g);
    applyWorldUV(g);
    const list = this.parts.get(key);
    if (list) list.push(g);
    else this.parts.set(key, [g]);
  }

  isEmpty(): boolean {
    return this.parts.size === 0;
  }

  build(name: string, opts: BucketOptions = {}, shadowFor?: (key: K) => boolean): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    this.parts.forEach((geoms, key) => {
      const merged = geoms.length === 1 ? geoms[0]! : mergeGeometries(geoms, false);
      if (!merged) throw new Error(`Fusion impossible pour ${String(key)}`);
      if (geoms.length > 1) geoms.forEach((g) => g.dispose());
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, this.resolve(key));
      mesh.name = `${name}:${String(key)}`;
      const casts = shadowFor ? shadowFor(key) : (opts.castShadow ?? true);
      mesh.castShadow = casts;
      mesh.receiveShadow = opts.receiveShadow ?? true;
      mesh.userData.role = key;
      group.add(mesh);
    });
    this.parts.clear();
    return group;
  }
}

export function prismGeometry(
  polygon: readonly Vec2[],
  z0: number,
  z1: number,
  holes: readonly (readonly Vec2[])[] = [],
): THREE.BufferGeometry | null {
  if (polygon.length < 3 || z1 - z0 < 1e-5) return null;
  const shape = new THREE.Shape(polygon.map(([x, y]) => new THREE.Vector2(x, y)));
  holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 12 });
  // (x, y, z) plan → (x, z, -y) monde, puis décalage en altitude.
  g.rotateX(-Math.PI / 2);
  g.translate(0, z0, 0);
  return g;
}

/** Sépare une géométrie à groupes (ex. ExtrudeGeometry : 0 = faces, 1 = côtés). */
export function splitGroups(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const src = geometry.index ? geometry.toNonIndexed() : geometry;
  const out: THREE.BufferGeometry[] = [];
  const groups = src.groups.length ? src.groups : [{ start: 0, count: src.attributes.position!.count, materialIndex: 0 }];
  for (const grp of groups) {
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(src.attributes)) {
      const a = attr as THREE.BufferAttribute;
      const arr = (a.array as Float32Array).slice(grp.start * a.itemSize, (grp.start + grp.count) * a.itemSize);
      part.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
    }
    out[grp.materialIndex ?? 0] = part;
  }
  if (src !== geometry) src.dispose();
  return out;
}

function normalizeAttributes(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
  g.clearGroups();
  return g;
}

/** UV projetées selon l'axe dominant de la normale, en mètres. */
export function applyWorldUV(g: THREE.BufferGeometry): void {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ny >= nx && ny >= nz) uv.setXY(i, x, -z);
    else if (nx >= nz) uv.setXY(i, -z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}

/** Poutre orientée entre deux points monde (section w × h). */
export function beamGeometry(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(w, h, len);
  const m = new THREE.Matrix4().lookAt(a, b, Math.abs(b.y - a.y) > len * 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
  g.applyMatrix4(m);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Quadrilatère vertical (panneau de verre) entre deux points bas et une hauteur. */
export function panelGeometry(a: THREE.Vector3, b: THREE.Vector3, h0: number, h1: number): THREE.BufferGeometry {
  const p = [
    a.x, a.y + h0, a.z, b.x, b.y + h0, b.z, b.x, b.y + h1, b.z,
    a.x, a.y + h0, a.z, b.x, b.y + h1, b.z, a.x, a.y + h1, a.z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3));
  g.computeVertexNormals();
  return g;
}
