import { describe, expect, it } from 'vitest';
import { building } from '@content/projects/youcef-oued-ksari-002/building';
import { site } from '@content/projects/youcef-oued-ksari-002/site';
import project from '@content/projects/youcef-oued-ksari-002/project';
import { buildRegistry } from '@/features/projects/registry';
import { buildStairSteps, gradedHeight, naturalHeight, pointInPolygon, polygonArea, wallAxis } from '@/engine/geometry';

describe('Maison Youcef 002 — cohérence des données', () => {
  it('has three levels stacked at 3.06 m', () => {
    expect(building.levels.map((l) => l.elevation)).toEqual([0, 3.06, 6.12]);
    expect(building.roof.elevation).toBeCloseTo(9.18);
  });

  it('only contains orthogonal straight walls with openings inside the wall', () => {
    building.levels.forEach((level) =>
      level.walls.forEach((w) => {
        const axis = wallAxis(w);
        (w.openings ?? []).forEach((o) => {
          expect(o.from, `${level.id} ${JSON.stringify(w.a)}`).toBeGreaterThanOrEqual(axis.start - 0.2);
          expect(o.to, `${level.id} ${JSON.stringify(w.a)}`).toBeLessThanOrEqual(axis.end + 0.2);
        });
      }),
    );
  });

  it('uses unique room ids', () => {
    const ids = building.levels.flatMap((l) => l.rooms.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stairs reach the next level with comfortable risers', () => {
    building.levels.forEach((l) =>
      l.stairs.forEach((s) => {
        const steps = buildStairSteps(s);
        const riser = s.rise / (steps.length + 1);
        expect(riser, s.id).toBeGreaterThan(0.12);
        expect(riser, s.id).toBeLessThan(0.2);
      }),
    );
  });

  it('stacks the half-round stair tower on every level', () => {
    const towers = building.levels.map((l) => l.curvedWalls ?? []);
    towers.forEach((t) => expect(t).toHaveLength(1));
    const [first] = towers[0]!;
    towers.forEach(([w]) => {
      expect(w!.center).toEqual(first!.center);
      expect(w!.radius).toBe(first!.radius);
    });
  });

  it('keeps the half-round landing inside the tower and under the upper floor opening', () => {
    const stair = building.levels[1]!.stairs.find((s) => s.id === 'escalier-rdc-etage')!;
    const landing = stair.runs.find((r) => r.kind === 'landing');
    expect(landing?.kind).toBe('landing');
    const tower = building.levels[1]!.curvedWalls![0]!;
    const inner = tower.radius - tower.thickness / 2;
    if (landing?.kind !== 'landing') return;
    landing.polygon.forEach(([x, y]) => {
      expect(Math.hypot(x - tower.center[0], y - tower.center[1])).toBeLessThanOrEqual(inner + 0.06);
    });
    const [hall, stairHole] = building.levels[2]!.slab!.holes!;
    expect(hall).toBeDefined();
    const outline = building.levels[2]!.slab!.outline;
    stairHole!.forEach((p) => expect(pointInPolygon(p, outline), JSON.stringify(p)).toBe(true));
  });

  it('keeps the garden below the ground floor and the garages at the access level', () => {
    const groundFloor = site.buildingBase + 3.06;
    const around = [[6, -1.8], [-1.6, 5], [14.8, 5], [1, -1]] as const;
    around.forEach((p) => {
      const h = gradedHeight(p, naturalHeight(p, site.contours), site.pads);
      expect(h, JSON.stringify(p)).toBeLessThan(groundFloor - 0.2);
    });
    const forecourt = gradedHeight([6, 12.5], naturalHeight([6, 12.5], site.contours), site.pads);
    expect(Math.abs(forecourt - site.buildingBase)).toBeLessThan(0.1);
  });

  it('has a plot of about 1 025 m²', () => {
    expect(Math.abs(polygonArea(site.boundary))).toBeGreaterThan(1000);
    expect(Math.abs(polygonArea(site.boundary))).toBeLessThan(1050);
  });
});

describe('Maison Youcef 002 — registre', () => {
  it('lists every document of the project folder', () => {
    const docs = Object.fromEntries(project.documents.map((d) => [`/content/projects/${project.slug}/documents/${d.file}`, `/assets/${d.file}`]));
    const [p] = buildRegistry({ [`/content/projects/${project.slug}/project.ts`]: { default: project } }, docs, {});
    expect(p!.slug).toBe('youcef-oued-ksari-002');
    expect(p!.resolvedDocuments).toHaveLength(4);
  });
});
