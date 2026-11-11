import { describe, expect, it } from 'vitest';
import { rect, type Stair } from '@/domain/building';
import {
  arcPoints,
  buildStairSteps,
  clipPolygonToRect,
  curvedWallSegments,
  gradedHeight,
  insetOrthogonalPolygon,
  naturalHeight,
  pointInPolygon,
  polygonArea,
  seededRandom,
  splitWall,
  wallAxis,
} from '@/engine/geometry';

describe('wallAxis', () => {
  it('detects horizontal and vertical walls', () => {
    expect(wallAxis({ a: [0, 2], b: [5, 2], thickness: 0.3, finish: 'exterior' })).toEqual({ alongX: true, start: 0, end: 5, center: 2 });
    expect(wallAxis({ a: [1, 6], b: [1, 0], thickness: 0.1, finish: 'interior' })).toEqual({ alongX: false, start: 0, end: 6, center: 1 });
  });

  it('rejects oblique walls', () => {
    expect(() => wallAxis({ a: [0, 0], b: [1, 1], thickness: 0.2, finish: 'interior' })).toThrow(/orthogonal/);
  });
});

describe('splitWall', () => {
  const axis = { alongX: true, start: 0, end: 4, center: 0 };

  it('returns the full wall when there is no opening', () => {
    expect(splitWall(axis, 2.9, [])).toEqual([{ s0: 0, s1: 4, z0: 0, z1: 2.9 }]);
  });

  it('creates piers, sill and lintel around a window', () => {
    const pieces = splitWall(axis, 2.9, [{ kind: 'window', from: 1, to: 2, sill: 1, head: 2.2 }]);
    expect(pieces).toEqual([
      { s0: 0, s1: 1, z0: 0, z1: 2.9 },
      { s0: 1, s1: 2, z0: 0, z1: 1 },
      { s0: 1, s1: 2, z0: 2.2, z1: 2.9 },
      { s0: 2, s1: 4, z0: 0, z1: 2.9 },
    ]);
  });

  it('clamps openings to the wall and caps the head to the wall height', () => {
    const pieces = splitWall(axis, 2.0, [{ kind: 'garageDoor', from: -1, to: 1.5 }]);
    expect(pieces).toEqual([{ s0: 1.5, s1: 4, z0: 0, z1: 2.0 }]);
  });

  it('keeps total solid area equal to wall minus openings', () => {
    const openings = [
      { kind: 'door' as const, from: 0.5, to: 1.4 },
      { kind: 'window' as const, from: 2, to: 3.2 },
    ];
    const area = splitWall(axis, 2.9, openings).reduce((a, p) => a + (p.s1 - p.s0) * (p.z1 - p.z0), 0);
    const expected = 4 * 2.9 - 0.9 * 2.1 - 1.2 * (2.2 - 0.95);
    expect(area).toBeCloseTo(expected, 6);
  });
});

describe('polygons', () => {
  const square = [[0, 0], [2, 0], [2, 2], [0, 2]] as const;

  it('computes signed area', () => {
    expect(polygonArea(square)).toBe(4);
    expect(polygonArea([...square].reverse())).toBe(-4);
  });

  it('tests point inclusion', () => {
    expect(pointInPolygon([1, 1], square)).toBe(true);
    expect(pointInPolygon([3, 1], square)).toBe(false);
  });

  it('clips a polygon to a rectangle', () => {
    const clipped = clipPolygonToRect([[-1, -1], [3, -1], [3, 3], [-1, 3]], rect(0, 0, 1, 1));
    expect(Math.abs(polygonArea(clipped))).toBeCloseTo(1, 6);
  });

  it('insets an L-shaped orthogonal polygon', () => {
    const l = [[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]] as const;
    const inner = insetOrthogonalPolygon(l, 0.5);
    expect(inner[0]).toEqual([0.5, 0.5]);
    expect(inner[3]).toEqual([1.5, 1.5]);
    expect(Math.abs(polygonArea(inner))).toBeCloseTo(5, 6);
  });
});

describe('buildStairSteps', () => {
  const stair: Stair = {
    id: 's',
    rise: 3.06,
    runs: [
      { kind: 'straight', rect: rect(0, 0, 3, 1), dir: 'E', count: 10 },
      { kind: 'winder', rect: rect(3, 0, 4, 1), pivot: [3, 1], fromDeg: -90, toDeg: 0, count: 3 },
      { kind: 'straight', rect: rect(3, 1, 4, 2), dir: 'N', count: 3 },
    ],
  };

  it('produces one step per tread with an even riser height', () => {
    const steps = buildStairSteps(stair);
    expect(steps).toHaveLength(16);
    const riser = 3.06 / 17;
    steps.forEach((s, i) => expect(s.top).toBeCloseTo(riser * (i + 1), 6));
  });

  it('orders straight treads in the climbing direction', () => {
    const steps = buildStairSteps(stair);
    const firstX = Math.min(...steps[0]!.polygon.map((p) => p[0]));
    const lastStraightX = Math.min(...steps[9]!.polygon.map((p) => p[0]));
    expect(firstX).toBeCloseTo(0);
    expect(lastStraightX).toBeCloseTo(2.7);
  });

  it('winder treads exactly cover their box', () => {
    const steps = buildStairSteps(stair).slice(10, 13);
    const area = steps.reduce((a, s) => a + Math.abs(polygonArea(s.polygon)), 0);
    expect(area).toBeCloseTo(1, 6);
  });

  it('descending stairs go below the level', () => {
    const steps = buildStairSteps({ id: 'p', rise: 0.7, descending: true, runs: [{ kind: 'straight', rect: rect(0, 0, 1.5, 1), dir: 'W', count: 6 }] });
    expect(steps[0]!.top).toBeCloseTo(-0.1);
    expect(steps[5]!.top).toBeCloseTo(-0.6);
  });
});

describe('arcs and curved walls', () => {
  it('samples an arc with its end points included', () => {
    const pts = arcPoints([0, 0], 2, 0, 90);
    expect(pts[0]![0]).toBeCloseTo(2);
    expect(pts[0]![1]).toBeCloseTo(0);
    expect(pts[pts.length - 1]![0]).toBeCloseTo(0);
    expect(pts[pts.length - 1]![1]).toBeCloseTo(2);
    pts.forEach((p) => expect(Math.hypot(p[0], p[1])).toBeCloseTo(2, 6));
  });

  it('keeps arc segments small enough for slab offsets (≤ 7.5°)', () => {
    expect(arcPoints([0, 0], 1, 180, 360).length).toBeGreaterThanOrEqual(25);
  });

  it('covers the ring sector of a half-round wall', () => {
    const quads = curvedWallSegments({ center: [0, 0], radius: 1.5, fromDeg: 180, toDeg: 360, thickness: 0.3, finish: 'exterior' }, 1.35, 1.65);
    const area = quads.reduce((a, q) => a + Math.abs(polygonArea(q)), 0);
    const ring = (Math.PI / 2) * (1.65 ** 2 - 1.35 ** 2);
    expect(area).toBeCloseTo(ring, 1);
    expect(area).toBeLessThanOrEqual(ring);
  });
});

describe('landing runs', () => {
  it('turn a free polygon into a single step between two flights', () => {
    const half = arcPoints([1, 0], 1, 180, 360);
    const steps = buildStairSteps({
      id: 'u',
      rise: 1.8,
      runs: [
        { kind: 'straight', rect: rect(0, 0, 1, 2), dir: 'S', count: 4 },
        { kind: 'landing', polygon: half },
        { kind: 'straight', rect: rect(1, 0, 2, 2), dir: 'N', count: 4 },
      ],
    });
    expect(steps).toHaveLength(9);
    expect(steps[4]!.polygon).toEqual(half);
    expect(steps[4]!.top).toBeCloseTo(0.9);
    expect(Math.max(...steps[0]!.polygon.map((p) => p[1]))).toBeCloseTo(2);
  });
});

describe('terrain', () => {
  const contours = [
    { height: 0, points: [[-50, 0], [50, 0]] as [number, number][] },
    { height: 1, points: [[-50, 10], [50, 10]] as [number, number][] },
  ];

  it('returns the contour height on the line', () => {
    expect(naturalHeight([0, 0], contours)).toBe(0);
    expect(naturalHeight([3, 10], contours)).toBe(1);
  });

  it('interpolates between two contours', () => {
    expect(naturalHeight([0, 5], contours)).toBeCloseTo(0.5, 6);
    const h = naturalHeight([0, 2], contours);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(0.5);
  });

  it('flattens the ground on a grading pad and blends on its feather', () => {
    const pad = { id: 'p', rect: rect(-2, 2, 2, 6), axis: 'y' as const, heightStart: 0.2, heightEnd: 0.2, feather: 2, surface: 'paving' as const };
    expect(gradedHeight([0, 4], 0.9, [pad])).toBeCloseTo(0.2);
    expect(gradedHeight([0, 9], 0.9, [pad])).toBeCloseTo(0.9);
    const mid = gradedHeight([3, 4], 0.9, [pad]);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.9);
  });
});

describe('seededRandom', () => {
  it('is deterministic', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
