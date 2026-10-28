/** Menuiseries : fenêtres, baies, portes intérieures, porte d'entrée, portes de garage. */
import type { MaterialRole } from '../materials/library';
import type { MeshBucket } from '../mesh-bucket';
import type { ResolvedOpening, WallAxis } from '../geometry';

type Bucket = MeshBucket<MaterialRole>;

export interface OpeningContext {
  readonly axis: WallAxis;
  readonly thickness: number;
  /** Altitude du sol fini. */
  readonly floorZ: number;
  /** +1 si l'extérieur est du côté +perpendiculaire, -1 sinon, 0 si cloison. */
  readonly outside: -1 | 0 | 1;
  /** Côté d'ouverture des portes (+1 / -1). */
  readonly swing: -1 | 1;
}

const PROFILE = 0.055;
const FRAME_DEPTH = 0.07;

/**
 * Boîte exprimée dans le repère du mur : s le long de l'axe, n perpendiculaire
 * (0 = axe du mur), z altitude relative au sol.
 */
function wbox(b: Bucket, c: OpeningContext, role: MaterialRole, s0: number, s1: number, n0: number, n1: number, z0: number, z1: number) {
  const a = c.axis;
  const zz0 = c.floorZ + z0;
  const zz1 = c.floorZ + z1;
  if (a.alongX) b.box(role, s0, a.center + n0, zz0, s1, a.center + n1, zz1);
  else b.box(role, a.center + n0, s0, zz0, a.center + n1, s1, zz1);
}

function frameRing(b: Bucket, c: OpeningContext, o: ResolvedOpening, n: number) {
  const d0 = n - FRAME_DEPTH / 2;
  const d1 = n + FRAME_DEPTH / 2;
  wbox(b, c, 'frame', o.from, o.from + PROFILE, d0, d1, o.sill, o.head);
  wbox(b, c, 'frame', o.to - PROFILE, o.to, d0, d1, o.sill, o.head);
  wbox(b, c, 'frame', o.from, o.to, d0, d1, o.head - PROFILE, o.head);
  if (o.sill > 0) wbox(b, c, 'frame', o.from, o.to, d0, d1, o.sill, o.sill + PROFILE);
}

function glazing(b: Bucket, c: OpeningContext, o: ResolvedOpening, n: number, panes: number) {
  frameRing(b, c, o, n);
  const width = o.to - o.from;
  for (let i = 1; i < panes; i++) {
    const s = o.from + (width * i) / panes;
    wbox(b, c, 'frame', s - PROFILE / 2, s + PROFILE / 2, n - FRAME_DEPTH / 2, n + FRAME_DEPTH / 2, o.sill, o.head);
  }
  wbox(b, c, 'glass', o.from + PROFILE, o.to - PROFILE, n - 0.006, n + 0.006, o.sill + (o.sill > 0 ? PROFILE : 0), o.head - PROFILE);
}

function sillStone(b: Bucket, c: OpeningContext, o: ResolvedOpening) {
  if (c.outside === 0 || o.sill <= 0) return;
  const face = (c.outside * c.thickness) / 2;
  const n0 = c.outside > 0 ? face - 0.12 : face - 0.04;
  const n1 = c.outside > 0 ? face + 0.04 : face + 0.12;
  wbox(b, c, 'facadeAccent', o.from - 0.04, o.to + 0.04, Math.min(n0, n1), Math.max(n0, n1), o.sill - 0.05, o.sill);
}

function interiorDoor(b: Bucket, c: OpeningContext, o: ResolvedOpening) {
  const t = c.thickness;
  // Chambranles des deux côtés.
  [-1, 1].forEach((side) => {
    const f = (side * t) / 2;
    const n0 = Math.min(f, f + side * 0.015);
    const n1 = Math.max(f, f + side * 0.015);
    wbox(b, c, 'door', o.from - 0.06, o.from, n0, n1, 0, o.head + 0.06);
    wbox(b, c, 'door', o.to, o.to + 0.06, n0, n1, 0, o.head + 0.06);
    wbox(b, c, 'door', o.from - 0.06, o.to + 0.06, n0, n1, o.head, o.head + 0.06);
  });
  // Vantail ouvert à ~90°, articulé côté `from`.
  const leaf = o.to - o.from - 0.02;
  const base = (c.swing * t) / 2;
  const n0 = Math.min(base, base + c.swing * leaf);
  const n1 = Math.max(base, base + c.swing * leaf);
  wbox(b, c, 'door', o.from + 0.01, o.from + 0.05, n0, n1, 0.01, o.head - 0.01);
  wbox(b, c, 'chrome', o.from + 0.05, o.from + 0.07, base + c.swing * (leaf - 0.1) - 0.06, base + c.swing * (leaf - 0.1) + 0.06, 1.0, 1.03);
}

function entryDoor(b: Bucket, c: OpeningContext, o: ResolvedOpening) {
  const n = c.outside === 0 ? 0 : (c.outside * c.thickness) / 4;
  frameRing(b, c, { ...o, sill: 0 }, n);
  const mid = (o.from + o.to) / 2;
  const leafs = o.to - o.from > 1.05 ? [[o.from + PROFILE, mid], [mid, o.to - PROFILE]] : [[o.from + PROFILE, o.to - PROFILE]];
  leafs.forEach(([s0, s1]) => {
    wbox(b, c, 'entryDoor', s0! + 0.004, s1! - 0.004, n - 0.025, n + 0.025, 0, o.head - PROFILE);
    // Imposte vitrée étroite.
    wbox(b, c, 'glass', s0! + 0.12, s0! + 0.2, n - 0.03, n + 0.03, 0.3, o.head - 0.3);
  });
  const hs = leafs.length === 2 ? mid : o.to - 0.15;
  wbox(b, c, 'chrome', hs - 0.03, hs + 0.03, n - 0.08, n + 0.08, 0.95, 1.45);
}

function garageDoor(b: Bucket, c: OpeningContext, o: ResolvedOpening) {
  const n = c.outside === 0 ? 0 : (c.outside * c.thickness) / 3;
  frameRing(b, c, { ...o, sill: 0 }, n);
  const panels = 5;
  const h = o.head - PROFILE;
  for (let i = 0; i < panels; i++) {
    const z0 = (h * i) / panels + 0.006;
    const z1 = (h * (i + 1)) / panels - 0.006;
    wbox(b, c, 'garageDoor', o.from + PROFILE, o.to - PROFILE, n - 0.02, n + 0.02, z0, z1);
  }
  wbox(b, c, 'frame', o.from + PROFILE, o.to - PROFILE, n - 0.015, n + 0.015, 0, h);
}

export function addOpening(b: Bucket, c: OpeningContext, o: ResolvedOpening): void {
  switch (o.kind) {
    case 'window':
    case 'highWindow': {
      const width = o.to - o.from;
      glazing(b, c, o, 0, Math.max(1, Math.ceil(width / 1.25)));
      sillStone(b, c, o);
      return;
    }
    case 'slidingDoor':
      glazing(b, c, o, 0, Math.max(2, Math.ceil((o.to - o.from) / 1.2)));
      return;
    case 'door':
      interiorDoor(b, c, o);
      return;
    case 'entryDoor':
      entryDoor(b, c, o);
      return;
    case 'garageDoor':
      garageDoor(b, c, o);
      return;
    case 'passage':
      return;
  }
}
