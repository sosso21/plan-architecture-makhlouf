import { describe, expect, it } from 'vitest';
import { building } from '@content/projects/youcef-oued-ksari-003/building';
import { site } from '@content/projects/youcef-oued-ksari-003/site';
import project from '@content/projects/youcef-oued-ksari-003/project';
import { buildRegistry } from '@/features/projects/registry';
import { buildStairSteps, gradedHeight, naturalHeight, pointInPolygon, polygonArea, wallAxis } from '@/engine/geometry';

describe('Maison Youcef 003 — cohérence des données', () => {
  it('has four levels stacked at 3.06 m', () => {
    expect(building.levels.map((l) => l.id)).toEqual(['sous-sol', 'rdc', 'etage', 'grenier']);
    expect(building.levels.map((l) => l.elevation)).toEqual([0, 3.06, 6.12, 9.18]);
    expect(building.roof.elevation).toBeCloseTo(12.24);
  });

  it('only contains orthogonal walls with openings inside the wall', () => {
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

  it('stacks the central U stair from the ground floor to the attic, under open slab holes', () => {
    const [, rdc, etage, grenier] = building.levels;
    const lower = rdc!.stairs.find((s) => s.id === 'escalier-rdc-etage')!;
    const upper = etage!.stairs.find((s) => s.id === 'escalier-etage-grenier')!;
    expect(upper.runs).toEqual(lower.runs);
    [etage!, grenier!].forEach((level) => {
      const holes = level.slab!.holes!;
      buildStairSteps(lower).forEach((step) => {
        const [cx, cy] = step.polygon.reduce(([x, y], p) => [x + p[0] / step.polygon.length, y + p[1] / step.polygon.length], [0, 0]);
        expect(holes.some((h) => pointInPolygon([cx, cy], h)), `${level.id} ${cx},${cy}`).toBe(true);
      });
    });
  });

  it('keeps every slab hole inside its slab outline', () => {
    building.levels.forEach((level) =>
      (level.slab?.holes ?? []).forEach((hole) =>
        hole.forEach((p) => expect(pointInPolygon(p, level.slab!.outline), `${level.id} ${JSON.stringify(p)}`).toBe(true)),
      ),
    );
  });

  it('keeps the garden below the ground floor and the garages at the access level', () => {
    const groundFloor = site.buildingBase + 3.06;
    const around = [[6, -1.2], [-1.6, 5.5], [14.9, 5], [1, -1]] as const;
    around.forEach((p) => {
      const h = gradedHeight(p, naturalHeight(p, site.contours), site.pads);
      expect(h, JSON.stringify(p)).toBeLessThan(groundFloor - 0.2);
    });
    [[6, 12.5], [4, 16.5]].forEach(([x, y]) => {
      const forecourt = gradedHeight([x!, y!], naturalHeight([x!, y!], site.contours), site.pads);
      expect(Math.abs(forecourt - site.buildingBase), `${x},${y}`).toBeLessThan(0.1);
    });
  });

  it('has a plot of about 1 025 m²', () => {
    expect(Math.abs(polygonArea(site.boundary))).toBeGreaterThan(1000);
    expect(Math.abs(polygonArea(site.boundary))).toBeLessThan(1050);
  });
});

describe('Maison Youcef 003 — registre', () => {
  it('lists every document of the project folder', () => {
    const docs = Object.fromEntries(project.documents.map((d) => [`/content/projects/${project.slug}/documents/${d.file}`, `/assets/${d.file}`]));
    const [p] = buildRegistry({ [`/content/projects/${project.slug}/project.ts`]: { default: project } }, docs, {});
    expect(p!.slug).toBe('youcef-oued-ksari-003');
    expect(p!.resolvedDocuments).toHaveLength(4);
  });
});
