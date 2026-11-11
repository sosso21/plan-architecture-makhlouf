/**
 * Géométrie 2D pure (aucune dépendance à three) : découpe des murs autour
 * des ouvertures, marches d'escalier, interpolation du terrain.
 * Ces fonctions sont couvertes par les tests unitaires.
 */
import type { CurvedWall, Opening, OpeningKind, Rect, Stair, Vec2, Wall } from '@/domain/building';
import type { Contour, GradingPad } from '@/domain/site';

export const OPENING_DEFAULTS: Record<OpeningKind, { sill: number; head: number }> = {
  window: { sill: 0.95, head: 2.2 },
  highWindow: { sill: 1.55, head: 2.1 },
  door: { sill: 0, head: 2.1 },
  entryDoor: { sill: 0, head: 2.25 },
  slidingDoor: { sill: 0, head: 2.25 },
  garageDoor: { sill: 0, head: 2.4 },
  passage: { sill: 0, head: 2.2 },
};

export interface WallAxis {
  /** true si le mur suit l'axe x du plan. */
  readonly alongX: boolean;
  readonly start: number;
  readonly end: number;
  /** Coordonnée de l'axe médian du mur (y pour un mur horizontal). */
  readonly center: number;
}

export function wallAxis(wall: Wall): WallAxis {
  const [ax, ay] = wall.a;
  const [bx, by] = wall.b;
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  if (dx > 1e-6 && dy > 1e-6) {
    throw new Error(`Mur non orthogonal : (${ax}, ${ay}) → (${bx}, ${by})`);
  }
  const alongX = dx >= dy;
  return alongX
    ? { alongX, start: Math.min(ax, bx), end: Math.max(ax, bx), center: ay }
    : { alongX, start: Math.min(ay, by), end: Math.max(ay, by), center: ax };
}

/** Tronçon de mur plein : intervalle le long de l'axe × intervalle vertical. */
export interface WallPiece {
  readonly s0: number;
  readonly s1: number;
  readonly z0: number;
  readonly z1: number;
}

export interface ResolvedOpening extends Opening {
  readonly sill: number;
  readonly head: number;
}

export function resolveOpening(opening: Opening, wallHeight: number): ResolvedOpening {
  const d = OPENING_DEFAULTS[opening.kind];
  const sill = opening.sill ?? d.sill;
  const head = Math.min(opening.head ?? d.head, wallHeight);
  return { ...opening, from: Math.min(opening.from, opening.to), to: Math.max(opening.from, opening.to), sill, head };
}

const EPS = 1e-4;

/**
 * Découpe un mur en blocs pleins autour de ses ouvertures (allège, linteau,
 * trumeaux). Les ouvertures hors du mur sont rognées ; les ouvertures qui se
 * chevauchent sont traitées dans l'ordre.
 */
export function splitWall(axis: WallAxis, height: number, openings: readonly Opening[]): WallPiece[] {
  const resolved = openings
    .map((o) => resolveOpening(o, height))
    .map((o) => ({ ...o, from: Math.max(o.from, axis.start), to: Math.min(o.to, axis.end) }))
    .filter((o) => o.to - o.from > EPS)
    .sort((p, q) => p.from - q.from);

  const pieces: WallPiece[] = [];
  const push = (s0: number, s1: number, z0: number, z1: number) => {
    if (s1 - s0 > EPS && z1 - z0 > EPS) pieces.push({ s0, s1, z0, z1 });
  };
  let cursor = axis.start;
  for (const o of resolved) {
    const from = Math.max(o.from, cursor);
    push(cursor, from, 0, height);
    push(from, o.to, 0, o.sill);
    push(from, o.to, o.head, height);
    cursor = Math.max(cursor, o.to);
  }
  push(cursor, axis.end, 0, height);
  return pieces;
}

/* ------------------------------------------------------------------ */
/*                              Polygones                              */
/* ------------------------------------------------------------------ */

export function polygonArea(points: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/**
 * Décale un polygone orthogonal vers l'intérieur de `d` (négatif = extérieur).
 * Exact pour des arêtes perpendiculaires, ce qui est le cas des contours de
 * dalle et d'acrotère.
 */
export function insetOrthogonalPolygon(poly: readonly Vec2[], d: number): Vec2[] {
  const ccw = polygonArea(poly) > 0 ? 1 : -1;
  const n = poly.length;
  const inward = (a: Vec2, b: Vec2): Vec2 => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(-(b[1] - a[1]) / len) * ccw, ((b[0] - a[0]) / len) * ccw];
  };
  return poly.map((p, i) => {
    const n1 = inward(poly[(i + n - 1) % n]!, p);
    const n2 = inward(p, poly[(i + 1) % n]!);
    const dot = n1[0] * n2[0] + n1[1] * n2[1];
    if (dot > 0.99) return [p[0] + d * n1[0], p[1] + d * n1[1]] as Vec2;
    return [p[0] + d * (n1[0] + n2[0]), p[1] + d * (n1[1] + n2[1])] as Vec2;
  });
}

export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const rectContains = (r: Rect, p: Vec2, margin = 0): boolean =>
  p[0] >= r.x0 - margin && p[0] <= r.x1 + margin && p[1] >= r.y0 - margin && p[1] <= r.y1 + margin;

/** Découpe de Sutherland–Hodgman d'un polygone par un rectangle. */
export function clipPolygonToRect(poly: readonly Vec2[], r: Rect): Vec2[] {
  type Edge = (p: Vec2) => number;
  const edges: Edge[] = [(p) => p[0] - r.x0, (p) => r.x1 - p[0], (p) => p[1] - r.y0, (p) => r.y1 - p[1]];
  let out: Vec2[] = [...poly];
  for (const inside of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      const dc = inside(cur);
      const dp = inside(prev);
      if (dc >= 0) {
        if (dp < 0) out.push(lerp2(prev, cur, dp / (dp - dc)));
        out.push(cur);
      } else if (dp >= 0) {
        out.push(lerp2(prev, cur, dp / (dp - dc)));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

export function distanceToPolyline(p: Vec2, line: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) best = Math.min(best, distanceToSegment(p, line[i]!, line[i + 1]!));
  return best;
}

/* ------------------------------------------------------------------ */
/*                              Escaliers                              */
/* ------------------------------------------------------------------ */

export interface StairStep {
  /** Polygone de la marche (repère plan). */
  readonly polygon: readonly Vec2[];
  /** Altitude du dessus de la marche, relative au niveau de départ. */
  readonly top: number;
}

/**
 * Génère les marches d'un escalier dans l'ordre de la montée. Le nombre de
 * hauteurs est le nombre de marches + 1 (la dernière arrive sur le palier).
 * Un escalier `descending` part du niveau et descend (perron extérieur).
 */
export function buildStairSteps(stair: Stair): StairStep[] {
  const polygons: Vec2[][] = [];
  for (const run of stair.runs) {
    if (run.kind === 'straight') {
      polygons.push(...straightTreads(run.rect, run.dir, run.count));
    } else if (run.kind === 'winder') {
      polygons.push(...winderTreads(run.rect, run.pivot, run.fromDeg, run.toDeg, run.count));
    } else {
      polygons.push([...run.polygon]);
    }
  }
  const risers = polygons.length + 1;
  const riser = stair.rise / risers;
  if (stair.descending) {
    // Marche 0 = la plus proche du niveau, juste sous celui-ci.
    return polygons.map((polygon, i) => ({ polygon, top: -riser * (i + 1) }));
  }
  return polygons.map((polygon, i) => ({ polygon, top: riser * (i + 1) }));
}

function straightTreads(r: Rect, dir: 'N' | 'S' | 'E' | 'W', count: number): Vec2[][] {
  const out: Vec2[][] = [];
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    let tread: Rect;
    switch (dir) {
      case 'E': tread = { x0: r.x0 + (r.x1 - r.x0) * t0, x1: r.x0 + (r.x1 - r.x0) * t1, y0: r.y0, y1: r.y1 }; break;
      case 'W': tread = { x0: r.x1 - (r.x1 - r.x0) * t1, x1: r.x1 - (r.x1 - r.x0) * t0, y0: r.y0, y1: r.y1 }; break;
      case 'N': tread = { y0: r.y0 + (r.y1 - r.y0) * t0, y1: r.y0 + (r.y1 - r.y0) * t1, x0: r.x0, x1: r.x1 }; break;
      case 'S': tread = { y0: r.y1 - (r.y1 - r.y0) * t1, y1: r.y1 - (r.y1 - r.y0) * t0, x0: r.x0, x1: r.x1 }; break;
    }
    out.push(rectPolygon(tread));
  }
  return out;
}

function winderTreads(r: Rect, pivot: Vec2, fromDeg: number, toDeg: number, count: number): Vec2[][] {
  const reach = 2 * Math.hypot(r.x1 - r.x0, r.y1 - r.y0) + 1;
  const out: Vec2[][] = [];
  for (let i = 0; i < count; i++) {
    const a0 = ((fromDeg + ((toDeg - fromDeg) * i) / count) * Math.PI) / 180;
    const a1 = ((fromDeg + ((toDeg - fromDeg) * (i + 1)) / count) * Math.PI) / 180;
    const am = (a0 + a1) / 2;
    const sector: Vec2[] = [
      pivot,
      [pivot[0] + reach * Math.cos(a0), pivot[1] + reach * Math.sin(a0)],
      [pivot[0] + reach * Math.cos(am), pivot[1] + reach * Math.sin(am)],
      [pivot[0] + reach * Math.cos(a1), pivot[1] + reach * Math.sin(a1)],
    ];
    const clipped = clipPolygonToRect(polygonArea(sector) < 0 ? [...sector].reverse() : sector, r);
    if (clipped.length >= 3 && Math.abs(polygonArea(clipped)) > 1e-4) out.push(clipped);
  }
  return out;
}

export const rectPolygon = (r: Rect): Vec2[] => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];

/* ------------------------------------------------------------------ */
/*                                 Arcs                                */
/* ------------------------------------------------------------------ */

/**
 * Pas angulaire maximal des arcs : au-dessous de 8°, `insetOrthogonalPolygon`
 * traite deux segments consécutifs comme alignés, ce qui garde un acrotère
 * régulier sur une dalle arrondie.
 */
const ARC_STEP_DEG = 7.5;

/** Points d'un arc de `fromDeg` à `toDeg` (degrés, sens trigonométrique), extrémités comprises. */
export function arcPoints(center: Vec2, radius: number, fromDeg: number, toDeg: number): Vec2[] {
  const n = Math.max(2, Math.ceil(Math.abs(toDeg - fromDeg) / ARC_STEP_DEG));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / n) * Math.PI) / 180;
    return [center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)] as Vec2;
  });
}

/** Quadrilatères approchant la couronne d'un mur courbe entre les rayons `r0` et `r1`. */
export function curvedWallSegments(wall: CurvedWall, r0: number, r1: number): Vec2[][] {
  const inner = arcPoints(wall.center, r0, wall.fromDeg, wall.toDeg);
  const outer = arcPoints(wall.center, r1, wall.fromDeg, wall.toDeg);
  return inner.slice(1).map((p, i) => [inner[i]!, outer[i]!, outer[i + 1]!, p]);
}

/* ------------------------------------------------------------------ */
/*                               Terrain                               */
/* ------------------------------------------------------------------ */

/**
 * Altitude du terrain naturel par pondération inverse des distances aux
 * courbes de niveau (poids 1/d²). Entre deux courbes voisines, l'altitude
 * varie quasi linéairement ; au-delà de la dernière courbe elle se stabilise.
 */
export function naturalHeight(p: Vec2, contours: readonly Contour[]): number {
  let num = 0;
  let den = 0;
  for (const c of contours) {
    const d = distanceToPolyline(p, c.points);
    if (d < 1e-3) return c.height;
    const w = 1 / (d * d);
    num += w * c.height;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** Distance d'un point à un rectangle (0 à l'intérieur). */
export function distanceToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.x0 - p[0], 0, p[0] - r.x1);
  const dy = Math.max(r.y0 - p[1], 0, p[1] - r.y1);
  return Math.hypot(dx, dy);
}

export function padHeightAt(pad: GradingPad, p: Vec2): number {
  const r = pad.rect;
  const t =
    pad.axis === 'x'
      ? (Math.max(r.x0, Math.min(r.x1, p[0])) - r.x0) / Math.max(r.x1 - r.x0, 1e-6)
      : (Math.max(r.y0, Math.min(r.y1, p[1])) - r.y0) / Math.max(r.y1 - r.y0, 1e-6);
  return pad.heightStart + (pad.heightEnd - pad.heightStart) * t;
}

/** Altitude finale : terrain naturel modifié par les plateformes de terrassement. */
export function gradedHeight(p: Vec2, natural: number, pads: readonly GradingPad[]): number {
  let h = natural;
  for (const pad of pads) {
    const d = distanceToRect(p, pad.rect);
    if (d >= pad.feather) continue;
    const w = 1 - smoothstep(d / pad.feather);
    h = h + (padHeightAt(pad, p) - h) * w;
  }
  return h;
}

/* ------------------------------------------------------------------ */
/*                         Aléatoire déterministe                      */
/* ------------------------------------------------------------------ */

/** Générateur pseudo-aléatoire mulberry32 — même graine, même paysage. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
