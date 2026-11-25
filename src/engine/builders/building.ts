/**
 * Construit la maquette 3D d'un bâtiment à partir de ses données (murs,
 * ouvertures, dalles, escaliers, mobilier). Chaque niveau est un groupe
 * indépendant pour l'affichage par étage, la coupe et la vue éclatée.
 */
import * as THREE from 'three';
import type { Building, CurvedWall, Level, Railing, Room, Stair, Vec2, Wall } from '@/domain/building';
import { addFurniture } from '../furniture/catalog';
import {
  buildStairSteps,
  curvedWallSegments,
  insetOrthogonalPolygon,
  rectContains,
  resolveOpening,
  splitWall,
  wallAxis,
  type WallAxis,
} from '../geometry';
import type { MaterialLibrary, MaterialRole } from '../materials/library';
import { beamGeometry, MeshBucket, panelGeometry, prismGeometry, splitGroups, toWorld } from '../mesh-bucket';
import { addOpening } from './openings';

export interface RoomInfo {
  readonly id: string;
  readonly name: string;
  readonly levelId: string;
  readonly outdoor: boolean;
  readonly tour: boolean;
  /** Centre de l'étiquette (monde). */
  readonly anchor: THREE.Vector3;
  /** Emprise de la pièce (monde). */
  readonly bounds: THREE.Box3;
  readonly area: number;
}

export interface BuiltLevel {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly floorY: number;
  readonly height: number;
  readonly group: THREE.Group;
  readonly structure: THREE.Group;
  readonly furniture: THREE.Group;
  readonly rooms: readonly RoomInfo[];
  readonly lightAnchors: readonly THREE.Vector3[];
}

export interface BuiltBuilding {
  readonly root: THREE.Group;
  readonly levels: readonly BuiltLevel[];
  readonly roof: THREE.Group;
  readonly bounds: THREE.Box3;
}

type Bucket = MeshBucket<MaterialRole>;

const NO_SHADOW: ReadonlySet<MaterialRole> = new Set(['glass', 'railGlass', 'water', 'lampShade']);
const shadowFor = (role: MaterialRole) => !NO_SHADOW.has(role);

export function buildBuilding(building: Building, lib: MaterialLibrary, baseY: number): BuiltBuilding {
  const root = new THREE.Group();
  root.name = 'batiment';
  const resolve = (role: MaterialRole) => lib.get(role);

  const levels = building.levels.map((level, index) => {
    const floorY = baseY + level.elevation;
    const structure = new MeshBucket<MaterialRole>(resolve);
    const furniture = new MeshBucket<MaterialRole>(resolve);

    if (level.slab) addSlab(structure, level.slab.outline, level.slab.holes ?? [], floorY - building.slabThickness, floorY - 0.012);
    if (index === 0) {
      building.footprint.forEach((r) => structure.box('stairConcrete', r.x0, r.y0, floorY - 0.3, r.x1, r.y1, floorY - 0.012));
    }
    level.rooms.forEach((room) => room.rects.forEach((r) => structure.box(`floor.${room.floor}`, r.x0, r.y0, floorY - 0.012, r.x1, r.y1, floorY)));
    level.walls.forEach((wall) => addWall(structure, level, wall, floorY, index === 0));
    level.curvedWalls?.forEach((wall) => addCurvedWall(structure, level, wall, floorY, index === 0));
    addColumns(structure, level, building.columnSize, floorY);
    level.stairs.forEach((stair) => addStair(structure, stair, floorY));
    level.railings.forEach((railing) => addRailing(structure, railing, floorY));
    level.furniture.forEach((item) => addFurniture(furniture, item, floorY));

    const structureGroup = structure.build(`${level.id}:structure`, {}, shadowFor);
    const furnitureGroup = furniture.build(`${level.id}:mobilier`, {}, shadowFor);
    const group = new THREE.Group();
    group.name = level.id;
    group.add(structureGroup, furnitureGroup);
    root.add(group);

    const rooms = level.rooms.filter((r) => r.name).map((r) => roomInfo(r, level, floorY));
    const lightAnchors = rooms
      .filter((r) => !r.outdoor && r.area >= 6)
      .map((r) => new THREE.Vector3(r.anchor.x, floorY + level.height - 0.45, r.anchor.z));

    return {
      id: level.id,
      name: level.name,
      shortName: level.shortName,
      floorY,
      height: level.height,
      group,
      structure: structureGroup,
      furniture: furnitureGroup,
      rooms,
      lightAnchors,
    } satisfies BuiltLevel;
  });

  const roof = buildRoof(building, lib, baseY);
  root.add(roof);
  const bounds = new THREE.Box3().setFromObject(root);
  return { root, levels, roof, bounds };
}

/* ------------------------------------------------------------------ */

function addSlab(b: Bucket, outline: readonly Vec2[], holes: readonly (readonly Vec2[])[], z0: number, z1: number) {
  const g = prismGeometry(outline, z0, z1, holes);
  if (!g) return;
  const [caps, sides] = splitGroups(g);
  if (caps) b.add('ceiling', caps);
  if (sides) b.add('slabEdge', sides);
  g.dispose();
}

function isIndoor(level: Level, p: Vec2): boolean {
  return level.rooms.some((r) => !r.outdoor && r.rects.some((rc) => rectContains(rc, p)));
}

function roomAt(level: Level, p: Vec2): Room | undefined {
  return level.rooms.find((r) => r.rects.some((rc) => rectContains(rc, p)));
}

const along = (axis: WallAxis, s: number, n: number): Vec2 => (axis.alongX ? [s, axis.center + n] : [axis.center + n, s]);

/** Côté extérieur d'un mur de façade (+1 / -1) par échantillonnage des pièces. */
function outsideSide(level: Level, axis: WallAxis, thickness: number): -1 | 1 {
  let plus = 0;
  let minus = 0;
  const off = thickness / 2 + 0.25;
  for (const t of [0.2, 0.5, 0.8]) {
    const s = axis.start + (axis.end - axis.start) * t;
    if (isIndoor(level, along(axis, s, off))) plus++;
    if (isIndoor(level, along(axis, s, -off))) minus++;
  }
  return plus > minus ? -1 : 1;
}

/** Les portes s'ouvrent vers la pièce nommée la plus petite (jamais vers un dégagement). */
function swingSide(level: Level, axis: WallAxis, from: number, to: number, thickness: number): -1 | 1 {
  const s = (from + to) / 2;
  const off = thickness / 2 + 0.45;
  const plus = roomAt(level, along(axis, s, off));
  const minus = roomAt(level, along(axis, s, -off));
  const score = (r?: Room) => (!r ? -1 : r.name ? 1000 - r.rects.reduce((a, rc) => a + (rc.x1 - rc.x0) * (rc.y1 - rc.y0), 0) : 0);
  return score(plus) >= score(minus) ? 1 : -1;
}

function addWall(b: Bucket, level: Level, wall: Wall, floorY: number, isLowest: boolean) {
  const axis = wallAxis(wall);
  const t = wall.thickness;
  const height = wall.height ?? level.height;
  const pieces = splitWall(axis, height, wall.openings ?? []);
  const exterior = wall.finish !== 'interior';
  const outside = exterior ? outsideSide(level, axis, t) : 0;
  const skin = Math.min(0.1, t * 0.4);
  const outerRole: MaterialRole = wall.finish === 'basement' ? 'stone' : 'facade';

  const box = (role: MaterialRole, s0: number, s1: number, n0: number, n1: number, z0: number, z1: number) => {
    if (axis.alongX) b.box(role, s0, axis.center + n0, floorY + z0, s1, axis.center + n1, floorY + z1);
    else b.box(role, axis.center + n0, s0, floorY + z0, axis.center + n1, s1, floorY + z1);
  };

  for (const p of pieces) {
    if (!exterior) {
      box('interiorWall', p.s0, p.s1, -t / 2, t / 2, p.z0, p.z1);
      continue;
    }
    const face = (outside * t) / 2;
    const inner = face - outside * skin;
    const zBottom = p.z0 === 0 && isLowest ? -0.35 : p.z0;
    box(outerRole, p.s0, p.s1, Math.min(face, inner), Math.max(face, inner), zBottom, p.z1);
    box('interiorWall', p.s0, p.s1, Math.min(inner, -face), Math.max(inner, -face), p.z0, p.z1);
  }

  for (const o of wall.openings ?? []) {
    const resolved = resolveOpening(o, height);
    addOpening(
      b,
      {
        axis,
        thickness: t,
        floorZ: floorY,
        outside: outside as -1 | 0 | 1,
        swing: swingSide(level, axis, resolved.from, resolved.to, t),
      },
      resolved,
    );
  }
}

/** Mur courbe plein : parement de façade côté convexe, enduit intérieur côté concave. */
function addCurvedWall(b: Bucket, level: Level, wall: CurvedWall, floorY: number, isLowest: boolean) {
  const t = wall.thickness;
  const height = wall.height ?? level.height;
  const r0 = wall.radius - t / 2;
  const r1 = wall.radius + t / 2;
  const segments = (from: number, to: number) => curvedWallSegments(wall, from, to);
  if (wall.finish === 'interior') {
    segments(r0, r1).forEach((q) => b.prism('interiorWall', q, floorY, floorY + height));
    return;
  }
  const skin = Math.min(0.1, t * 0.4);
  const outerRole: MaterialRole = wall.finish === 'basement' ? 'stone' : 'facade';
  const zBottom = isLowest ? -0.35 : 0;
  segments(r1 - skin, r1).forEach((q) => b.prism(outerRole, q, floorY + zBottom, floorY + height));
  segments(r0, r1 - skin).forEach((q) => b.prism('interiorWall', q, floorY, floorY + height));
}

function addColumns(b: Bucket, level: Level, size: number, floorY: number) {
  const inWall = (p: Vec2) =>
    level.walls.some((w) => {
      const a = wallAxis(w);
      const s = a.alongX ? p[0] : p[1];
      const n = a.alongX ? p[1] : p[0];
      return s >= a.start - 0.01 && s <= a.end + 0.01 && Math.abs(n - a.center) <= w.thickness / 2 + 0.01;
    });
  level.columns
    .filter((c) => !inWall(c))
    .forEach(([x, y]) => b.box('column', x - size / 2, y - size / 2, floorY, x + size / 2, y + size / 2, floorY + level.height));
}

function addStair(b: Bucket, stair: Stair, floorY: number) {
  const steps = buildStairSteps(stair);
  const floating = stair.style === 'floating';
  steps.forEach((step) => {
    const top = floorY + step.top;
    if (floating) {
      b.prism('stairWood', step.polygon, top - 0.055, top);
    } else {
      const bottom = stair.descending ? floorY - stair.rise - 0.2 : floorY;
      b.prism('stairConcrete', step.polygon, bottom, top);
    }
  });
}

function addRailing(b: Bucket, railing: Railing, floorY: number) {
  const h = railing.height ?? 1.0;
  const pts = railing.path.map(([x, y], i) => toWorld(x, y, floorY + (railing.base?.[i] ?? 0)));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const c = pts[i + 1]!;
    const top = (p: THREE.Vector3, dz: number) => p.clone().add(new THREE.Vector3(0, dz, 0));
    b.add('railMetal', beamGeometry(top(a, h), top(c, h), 0.045, 0.04));
    if (railing.style === 'glass') {
      b.add('railGlass', panelGeometry(a, c, 0.06, h - 0.05));
      b.add('railMetal', beamGeometry(top(a, 0.04), top(c, 0.04), 0.03, 0.03));
    } else {
      [0.12, 0.45, 0.75].forEach((z) => b.add('railMetal', beamGeometry(top(a, z), top(c, z), 0.02, 0.02)));
    }
    const len = a.distanceTo(c);
    const posts = Math.max(1, Math.ceil(len / (railing.style === 'glass' ? 1.6 : 1.1)));
    for (let k = 0; k <= posts; k++) {
      if (k === posts && i < pts.length - 2) continue;
      const p = a.clone().lerp(c, k / posts);
      b.add('railMetal', beamGeometry(p, top(p, h), 0.04, 0.04));
    }
  }
}

function roomInfo(room: Room, level: Level, floorY: number): RoomInfo {
  const box = new THREE.Box3();
  let area = 0;
  room.rects.forEach((r) => {
    box.expandByPoint(toWorld(r.x0, r.y0, floorY));
    box.expandByPoint(toWorld(r.x1, r.y1, floorY + level.height));
    area += (r.x1 - r.x0) * (r.y1 - r.y0);
  });
  const first = room.rects[0]!;
  const [lx, ly] = room.label ?? [(first.x0 + first.x1) / 2, (first.y0 + first.y1) / 2];
  return {
    id: room.id,
    name: room.name,
    levelId: level.id,
    outdoor: room.outdoor ?? false,
    tour: room.tour ?? false,
    anchor: toWorld(lx, ly, floorY + 0.05),
    bounds: box,
    area,
  };
}

/* ------------------------------------------------------------------ */
/*                               Toiture                               */
/* ------------------------------------------------------------------ */

function buildRoof(building: Building, lib: MaterialLibrary, baseY: number): THREE.Group {
  const b = new MeshBucket<MaterialRole>((r) => lib.get(r));
  const roof = building.roof;
  const top = baseY + roof.elevation;
  const outline = roof.slab.outline;

  addSlab(b, outline, [], top - building.slabThickness, top - 0.03);
  const inner = insetOrthogonalPolygon(outline, roof.parapetThickness);
  b.prism('roof', inner, top - 0.03, top + 0.04);
  b.prism('facade', outline, top - 0.03, top + roof.parapetHeight - 0.05, [inner]);
  b.prism('facadeAccent', insetOrthogonalPolygon(outline, -0.025), top + roof.parapetHeight - 0.05, top + roof.parapetHeight, [
    insetOrthogonalPolygon(outline, roof.parapetThickness + 0.025),
  ]);

  addSolarKit(b, top + 0.04);
  if (roof.pergola) addPergola(b, roof.pergola, top - building.slabThickness);

  const group = b.build('toiture', {}, shadowFor);
  group.name = 'toiture';
  return group;
}

function addSolarKit(b: Bucket, z: number) {
  const tilt = (25 * Math.PI) / 180;
  [6.3, 7.45, 8.6].forEach((x) => {
    const panel = new THREE.BoxGeometry(1.05, 0.04, 1.75);
    panel.rotateX(-tilt);
    panel.translate(x, z + 0.55, -1.5);
    b.add('solar', panel);
    b.box('railMetal', x - 0.5, 0.75, z, x - 0.46, 0.79, z + 0.95);
    b.box('railMetal', x + 0.46, 0.75, z, x + 0.5, 0.79, z + 0.95);
    b.box('railMetal', x - 0.5, 2.2, z, x - 0.46, 2.24, z + 0.22);
    b.box('railMetal', x + 0.46, 2.2, z, x + 0.5, 2.24, z + 0.22);
  });
  const tank = new THREE.CylinderGeometry(0.55, 0.55, 1.2, 24);
  tank.translate(10.6, z + 0.75, -1.6);
  b.add('ceramic', tank);
  b.box('railMetal', 10.0, 1.1, z, 11.2, 2.1, z + 0.15);
}

function addPergola(b: Bucket, r: { x0: number; y0: number; x1: number; y1: number }, z: number) {
  // Poutre porteuse sur la file de poteaux, 15 cm en retrait du bord de la pergola.
  const beamX = r.x0 + 0.15;
  b.box('pergola', beamX - 0.08, r.y0, z, beamX + 0.08, r.y1, z + 0.22);
  b.box('pergola', r.x0, r.y1 - 0.15, z, r.x1, r.y1, z + 0.22);
  for (let y = r.y0 + 0.25; y < r.y1 - 0.2; y += 0.42) {
    b.box('pergola', r.x0, y - 0.03, z + 0.22, r.x1 - 0.15, y + 0.03, z + 0.4);
  }
}
