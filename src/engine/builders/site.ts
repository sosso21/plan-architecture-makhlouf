/**
 * Terrain, voirie, clôture, végétation et courbes de niveau, générés depuis
 * la topographie relevée. Le terrain est évidé sous l'emprise du sous-sol par
 * un `discard` dans le shader, ce qui donne une découpe exacte au nu des murs.
 */
import * as THREE from 'three';
import type { Rect, Vec2 } from '@/domain/building';
import type { Site } from '@/domain/site';
import {
  distanceToPolyline,
  gradedHeight,
  naturalHeight,
  pointInPolygon,
  rectContains,
  seededRandom,
} from '../geometry';
import type { MaterialLibrary, SiteRole } from '../materials/library';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { beamGeometry, MeshBucket, toWorld } from '../mesh-bucket';

export interface BuiltSite {
  readonly terrain: THREE.Group;
  readonly vegetation: THREE.Group;
  readonly fence: THREE.Group;
  readonly contours: THREE.Group;
  readonly boundary: THREE.Group;
  readonly heightAt: (x: number, y: number) => number;
  readonly center: Vec2;
  /** Étiquettes des courbes (rattachées au groupe `contours`). */
  readonly contourLabels: readonly { position: THREE.Vector3; text: string }[];
}

const GRID_STEP = 0.6;
const FLAT_START = 34;
const FLAT_END = 60;

export function buildSite(site: Site, lib: MaterialLibrary, holes: readonly Rect[]): BuiltSite {
  const center = centroid(site.boundary);
  const field = new HeightField(site, center);

  const terrain = new THREE.Group();
  terrain.name = 'terrain';
  terrain.add(terrainMesh(field, lib, holes, center, site.extent));
  terrain.add(outerGround(field, lib, center, site.extent));
  terrain.add(padSurfaces(site, field, lib));
  terrain.add(roadMesh(site, field, lib));
  terrain.add(utilityPoles(site, field, lib));

  const fence = fenceGroup(site, field, lib);
  const vegetation = treeGroup(site, field, lib, center);
  const { group: contours, labels } = contourGroup(site, field, lib);
  const boundary = boundaryGroup(site, field, lib);

  return {
    terrain,
    vegetation,
    fence,
    contours,
    boundary,
    heightAt: (x, y) => field.at(x, y),
    center,
    contourLabels: labels,
  };
}

/* ------------------------------------------------------------------ */

class HeightField {
  readonly avg: number;
  constructor(
    private readonly site: Site,
    private readonly center: Vec2,
  ) {
    const samples = site.boundary.map((p) => naturalHeight(p, site.contours));
    this.avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  natural(x: number, y: number): number {
    const raw = naturalHeight([x, y], this.site.contours);
    const d = Math.hypot(x - this.center[0], y - this.center[1]);
    const t = Math.max(0, Math.min(1, (d - FLAT_START) / (FLAT_END - FLAT_START)));
    const s = t * t * (3 - 2 * t);
    return raw + (this.avg - raw) * s;
  }

  at(x: number, y: number): number {
    return gradedHeight([x, y], this.natural(x, y), this.site.pads);
  }
}

function centroid(poly: readonly Vec2[]): Vec2 {
  const sx = poly.reduce((a, p) => a + p[0], 0);
  const sy = poly.reduce((a, p) => a + p[1], 0);
  return [sx / poly.length, sy / poly.length];
}

function terrainMesh(field: HeightField, lib: MaterialLibrary, holes: readonly Rect[], center: Vec2, extent: number): THREE.Mesh {
  const size = extent * 2;
  const n = Math.round(size / GRID_STEP);
  const geom = new THREE.PlaneGeometry(size, size, n, n);
  geom.rotateX(-Math.PI / 2);
  geom.translate(center[0], 0, -center[1]);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = -pos.getZ(i);
    pos.setY(i, field.at(x, y));
  }
  geom.computeVertexNormals();
  // UV en mètres pour la texture d'herbe.
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));

  const mat = lib.getSite('terrain');
  installTerrainHoles(mat, holes);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'terrain:sol';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

const MAX_HOLES = 4;

function installTerrainHoles(mat: THREE.MeshStandardMaterial, holes: readonly Rect[]) {
  const data = Array.from({ length: MAX_HOLES }, (_, i) => {
    const r = holes[i];
    return r ? new THREE.Vector4(r.x0, r.y0, r.x1, r.y1) : new THREE.Vector4(0, 0, 0, 0);
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHoles = { value: data };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTerrainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTerrainWorld;\nuniform vec4 uHoles[${MAX_HOLES}];`)
      .replace(
        'void main() {',
        `void main() {
  vec2 planP = vec2(vTerrainWorld.x, -vTerrainWorld.z);
  for (int i = 0; i < ${MAX_HOLES}; i++) {
    vec4 h = uHoles[i];
    if (h.z > h.x && planP.x > h.x && planP.x < h.z && planP.y > h.y && planP.y < h.w) discard;
  }`,
      );
  };
  mat.customProgramCacheKey = () => 'terrain-holes-v1';
}

/**
 * Anneau de sol lointain, raccordé au terrain modélisé là où celui-ci est
 * déjà aplani à l'altitude moyenne (au-delà de FLAT_END).
 */
function outerGround(field: HeightField, lib: MaterialLibrary, center: Vec2, extent: number): THREE.Mesh {
  const g = new THREE.RingGeometry(Math.min(extent - 2, FLAT_END + 2), 900, 64, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(center[0], field.avg - 0.03, -center[1]);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
  const mesh = new THREE.Mesh(g, lib.getSite('terrain'));
  mesh.name = 'terrain:lointain';
  mesh.receiveShadow = true;
  return mesh;
}

/** Surface draper sur le terrain (grille sur un rectangle). */
function drapedRect(field: HeightField, r: Rect, step: number, lift: number): THREE.BufferGeometry {
  const nx = Math.max(1, Math.ceil((r.x1 - r.x0) / step));
  const ny = Math.max(1, Math.ceil((r.y1 - r.y0) / step));
  const g = new THREE.PlaneGeometry(r.x1 - r.x0, r.y1 - r.y0, nx, ny);
  g.rotateX(-Math.PI / 2);
  g.translate((r.x0 + r.x1) / 2, 0, -(r.y0 + r.y1) / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, field.at(pos.getX(i), -pos.getZ(i)) + lift);
  g.computeVertexNormals();
  return g;
}

function padSurfaces(site: Site, field: HeightField, lib: MaterialLibrary): THREE.Group {
  const b = new MeshBucket<SiteRole>((r) => lib.getSite(r));
  site.pads.forEach((pad) => {
    if (pad.surface === 'none') return;
    b.add(pad.surface, drapedRect(field, pad.rect, 0.5, 0.025));
    // Bordures béton le long des grands côtés.
    if (pad.surface === 'gravel' || pad.surface === 'paving') {
      const r = pad.rect;
      for (const x of [r.x0, r.x1]) {
        for (let y = r.y0; y < r.y1 - 0.01; y += 1) {
          const y1 = Math.min(r.y1, y + 1);
          b.add('fenceWall', beamGeometry(toWorld(x, y, field.at(x, y) + 0.04), toWorld(x, y1, field.at(x, y1) + 0.04), 0.14, 0.12));
        }
      }
    }
  });
  const group = b.build('terrain:amenagements', { castShadow: false });
  group.children.forEach((m) => {
    const mat = (m as THREE.Mesh).material as THREE.Material;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  });
  return group;
}

function resample(line: readonly Vec2[], count: number): Vec2[] {
  const lengths = [0];
  for (let i = 1; i < line.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(line[i]![0] - line[i - 1]![0], line[i]![1] - line[i - 1]![1]));
  const total = lengths[lengths.length - 1]!;
  const out: Vec2[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const d = (total * k) / (count - 1);
    while (seg < line.length - 2 && lengths[seg + 1]! < d) seg++;
    const t = (d - lengths[seg]!) / Math.max(1e-6, lengths[seg + 1]! - lengths[seg]!);
    const a = line[seg]!;
    const c = line[seg + 1]!;
    out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
  }
  return out;
}

function roadMesh(site: Site, field: HeightField, lib: MaterialLibrary): THREE.Mesh {
  const n = 120;
  const across = 4;
  const left = resample(site.road[0], n);
  const right = resample(site.road[1], n);
  const positions: number[] = [];
  const grid: THREE.Vector3[][] = [];
  for (let i = 0; i < n; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j <= across; j++) {
      const t = j / across;
      const x = left[i]![0] + (right[i]![0] - left[i]![0]) * t;
      const y = left[i]![1] + (right[i]![1] - left[i]![1]) * t;
      row.push(toWorld(x, y, field.at(x, y) + 0.05));
    }
    grid.push(row);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < across; j++) {
      const a = grid[i]![j]!;
      const b = grid[i + 1]![j]!;
      const c = grid[i + 1]![j + 1]!;
      const d = grid[i]![j + 1]!;
      positions.push(a.x, a.y, a.z, d.x, d.y, d.z, b.x, b.y, b.z, b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  g.computeVertexNormals();
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0; i < positions.length / 3; i++) {
    uv[i * 2] = positions[i * 3]!;
    uv[i * 2 + 1] = -positions[i * 3 + 2]!;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(g, lib.getSite('road'));
  mesh.name = 'terrain:piste';
  mesh.receiveShadow = true;
  return mesh;
}

function utilityPoles(site: Site, field: HeightField, lib: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain:reseaux';
  site.poles.forEach((pole) => {
    const base = field.at(pole.at[0], pole.at[1]);
    const g = new THREE.CylinderGeometry(0.1, 0.16, pole.height, 10);
    g.translate(pole.at[0], base + pole.height / 2, -pole.at[1]);
    const mesh = new THREE.Mesh(g, lib.getSite('pole'));
    mesh.castShadow = true;
    group.add(mesh);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < pole.line.length - 1; i++) {
      const a = pole.line[i]!;
      const c = pole.line[i + 1]!;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const x = a[0] + (c[0] - a[0]) * t;
        const y = a[1] + (c[1] - a[1]) * t;
        const sag = Math.sin(t * Math.PI) * 0.6;
        pts.push(toWorld(x, y, base + pole.height - 0.3 - sag));
      }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x222222 }));
    group.add(line);
  });
  return group;
}

/* ------------------------------------------------------------------ */

function fenceGroup(site: Site, field: HeightField, lib: MaterialLibrary): THREE.Group {
  const b = new MeshBucket<SiteRole>((r) => lib.getSite(r));
  const gate = (p: Vec2) => p[0] > 3.6 && p[0] < 12.9 && p[1] > 18;
  const ring = [...site.boundary, site.boundary[0]!];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const c = ring[i + 1]!;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const pieces = Math.max(1, Math.ceil(len / 2.4));
    for (let k = 0; k < pieces; k++) {
      const p0: Vec2 = [a[0] + ((c[0] - a[0]) * k) / pieces, a[1] + ((c[1] - a[1]) * k) / pieces];
      const p1: Vec2 = [a[0] + ((c[0] - a[0]) * (k + 1)) / pieces, a[1] + ((c[1] - a[1]) * (k + 1)) / pieces];
      if (gate(p0) || gate(p1)) continue;
      const h0 = field.at(p0[0], p0[1]);
      const h1 = field.at(p1[0], p1[1]);
      b.add('fenceWall', beamGeometry(toWorld(p0[0], p0[1], h0 + 0.2), toWorld(p1[0], p1[1], h1 + 0.2), 0.22, 0.8));
      b.add('fenceWall', beamGeometry(toWorld(p0[0], p0[1], h0 + 0.62), toWorld(p1[0], p1[1], h1 + 0.62), 0.28, 0.05));
      b.add('fenceMetal', beamGeometry(toWorld(p0[0], p0[1], h0 + 1.55), toWorld(p1[0], p1[1], h1 + 1.55), 0.04, 0.04));
      const bars = 12;
      for (let s = 0; s <= bars; s++) {
        const t = s / bars;
        const x = p0[0] + (p1[0] - p0[0]) * t;
        const y = p0[1] + (p1[1] - p0[1]) * t;
        const h = h0 + (h1 - h0) * t;
        b.add('fenceMetal', beamGeometry(toWorld(x, y, h + 0.64), toWorld(x, y, h + 1.58), 0.02, 0.02));
      }
      const hp = h0;
      b.add('fenceWall', beamGeometry(toWorld(p0[0], p0[1], hp - 0.2), toWorld(p0[0], p0[1], hp + 1.7), 0.32, 0.32));
    }
  }
  // Piliers du portail.
  [[3.55, 24.42], [12.95, 23.88]].forEach(([x, y]) => {
    const h = field.at(x!, y!);
    b.add('fenceWall', beamGeometry(toWorld(x!, y!, h - 0.2), toWorld(x!, y!, h + 2.0), 0.45, 0.45));
  });
  return b.build('cloture');
}

/* ------------------------------------------------------------------ */

/** Houppier d'olivier : amas de sphères bosselées, ombrage lissé. */
function oliveCanopy(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rnd = seededRandom(7);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.IcosahedronGeometry(0.95 + rnd() * 0.65, 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, k);
      const n = Math.sin(v.x * 4.1) * Math.cos(v.y * 3.7) * Math.sin(v.z * 4.6);
      v.multiplyScalar(1 + n * 0.16);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
    g.scale(1, 0.68, 1);
    g.translate((rnd() - 0.5) * 2.4, 3.0 + rnd() * 1.0, (rnd() - 0.5) * 2.4);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    parts.push(g);
  }
  const merged = mergeVertices(mergeGeometries(parts)!, 1e-3);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function treeGroup(site: Site, field: HeightField, lib: MaterialLibrary, center: Vec2): THREE.Group {
  const rnd = seededRandom(20261028);
  const placed: { p: Vec2; kind: 'olive' | 'cypress' | 'shrub'; s: number }[] = [];
  const blocked = (p: Vec2) =>
    site.treeExclusions.some((r) => rectContains(r, p)) ||
    distanceToPolyline(p, site.road[0]) < 3 ||
    distanceToPolyline(p, site.road[1]) < 3;
  const tryPlace = (p: Vec2, kind: 'olive' | 'cypress' | 'shrub', minGap: number) => {
    if (blocked(p)) return;
    if (placed.some((q) => Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) < minGap)) return;
    placed.push({ p, kind, s: 0.8 + rnd() * 0.45 });
  };
  // Oliviers dans la parcelle.
  for (let i = 0; i < 400 && placed.length < 16; i++) {
    const p: Vec2 = [-9 + rnd() * 27, -18 + rnd() * 44];
    if (pointInPolygon(p, site.boundary)) tryPlace(p, 'olive', 6.5);
  }
  // Cyprès le long de la limite ouest.
  for (let t = 0.08; t < 0.95; t += 0.12) {
    const a = site.boundary[9]!;
    const c = site.boundary[11]!;
    tryPlace([a[0] + (c[0] - a[0]) * t + 1.3, a[1] + (c[1] - a[1]) * t], 'cypress', 2.2);
  }
  // Paysage alentour.
  for (let i = 0; i < 1600 && placed.length < 150; i++) {
    const ang = rnd() * Math.PI * 2;
    const r = 24 + rnd() * 52;
    const p: Vec2 = [center[0] + Math.cos(ang) * r, center[1] + Math.sin(ang) * r];
    if (pointInPolygon(p, site.boundary)) continue;
    const k = rnd();
    tryPlace(p, k < 0.62 ? 'olive' : k < 0.8 ? 'cypress' : 'shrub', 5);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 3.2, 7);
  trunkGeo.translate(0, 1.6, 0);
  const oliveGeo = oliveCanopy();
  const cypressGeo = new THREE.ConeGeometry(0.9, 7.5, 9);
  cypressGeo.translate(0, 4.6, 0);
  const shrubGeo = new THREE.IcosahedronGeometry(0.9, 2);
  shrubGeo.scale(1.2, 0.7, 1.2);
  shrubGeo.translate(0, 0.45, 0);

  const make = (geo: THREE.BufferGeometry, role: SiteRole, list: typeof placed) => {
    const mesh = new THREE.InstancedMesh(geo, lib.getSite(role), Math.max(1, list.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (t.p[0] * 13.1 + t.p[1] * 7.7) % (Math.PI * 2));
      m.compose(toWorld(t.p[0], t.p[1], field.at(t.p[0], t.p[1]) - 0.1), q, new THREE.Vector3(t.s, t.s, t.s));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = list.length;
    const tint = new THREE.Color();
    list.forEach((t, i) => {
      const k = 0.82 + ((Math.abs(Math.sin(t.p[0] * 12.9898 + t.p[1] * 78.233)) * 43758.5453) % 1) * 0.3;
      mesh.setColorAt(i, tint.setRGB(k, k * (0.97 + 0.06 * (i % 3)), k * 0.95));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  };

  const olives = placed.filter((t) => t.kind === 'olive');
  const cypresses = placed.filter((t) => t.kind === 'cypress');
  const shrubs = placed.filter((t) => t.kind === 'shrub');
  const group = new THREE.Group();
  group.name = 'vegetation';
  group.add(make(trunkGeo, 'bark', olives), make(oliveGeo, 'olive', olives), make(cypressGeo, 'cypress', cypresses), make(shrubGeo, 'olive', shrubs));
  return group;
}

/* ------------------------------------------------------------------ */

function ribbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry | null {
  if (points.length < 2) return null;
  const pos: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const c = points[i + 1]!;
    const dir = new THREE.Vector3(c.x - a.x, 0, c.z - a.z).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    const a0 = a.clone().add(side);
    const a1 = a.clone().sub(side);
    const c0 = c.clone().add(side);
    const c1 = c.clone().sub(side);
    pos.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, c0.x, c0.y, c0.z, c0.x, c0.y, c0.z, a1.x, a1.y, a1.z, c1.x, c1.y, c1.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

function contourGroup(site: Site, field: HeightField, lib: MaterialLibrary) {
  const group = new THREE.Group();
  group.name = 'courbes';
  const labels: { position: THREE.Vector3; text: string }[] = [];
  const mat = lib.getSite('contour');
  site.contours.forEach((c) => {
    const pts = resample(c.points, 160);
    let run: THREE.Vector3[] = [];
    const flush = () => {
      const g = ribbon(run, 0.09);
      if (g) group.add(new THREE.Mesh(g, mat));
      run = [];
    };
    pts.forEach(([x, y]) => {
      const nat = field.natural(x, y);
      const graded = field.at(x, y);
      if (Math.abs(nat - graded) > 0.12) {
        flush();
        return;
      }
      run.push(toWorld(x, y, graded + 0.06));
    });
    flush();
    const inside = pts.filter((p) => pointInPolygon(p, site.boundary));
    const mid = inside[Math.floor(inside.length / 2)] ?? pts[Math.floor(pts.length / 2)]!;
    labels.push({ position: toWorld(mid[0], mid[1], field.at(mid[0], mid[1]) + 0.4), text: `${c.height >= 0 ? '+' : ''}${c.height.toFixed(0)} m` });
  });
  return { group, labels };
}

function boundaryGroup(site: Site, field: HeightField, lib: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'parcelle';
  const ring = resample([...site.boundary, site.boundary[0]!], 240).map(([x, y]) => toWorld(x, y, field.at(x, y) + 0.08));
  const g = ribbon(ring, 0.14);
  if (g) group.add(new THREE.Mesh(g, lib.getSite('boundary')));
  site.boundary.forEach(([x, y]) => {
    const post = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    post.translate(x, field.at(x, y) + 0.3, -y);
    group.add(new THREE.Mesh(post, lib.getSite('boundary')));
  });
  return group;
}
