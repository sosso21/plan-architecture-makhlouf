import { describe, expect, it } from 'vitest';
import { building } from '@content/projects/youssef-oued-ksari/building';
import { site } from '@content/projects/youssef-oued-ksari/site';
import project from '@content/projects/youssef-oued-ksari/project';
import { buildRegistry } from '@/features/projects/registry';
import { buildStairSteps, gradedHeight, naturalHeight, polygonArea, wallAxis } from '@/engine/geometry';
import type { ProjectManifest } from '@/domain/project';

describe('Maison Youssef — cohérence des données', () => {
  it('has three levels stacked at 3.06 m', () => {
    expect(building.levels.map((l) => l.elevation)).toEqual([0, 3.06, 6.12]);
    expect(building.roof.elevation).toBeCloseTo(9.18);
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

  it('keeps the garden below the ground floor and the garages at the access level', () => {
    const groundFloor = site.buildingBase + 3.06;
    const around = [[6, -1.2], [-1.6, 5], [14.5, 5], [1, -1]] as const;
    around.forEach((p) => {
      const h = gradedHeight(p, naturalHeight(p, site.contours), site.pads);
      expect(h, JSON.stringify(p)).toBeLessThan(groundFloor - 0.2);
    });
    const forecourt = gradedHeight([6, 12], naturalHeight([6, 12], site.contours), site.pads);
    expect(Math.abs(forecourt - site.buildingBase)).toBeLessThan(0.1);
  });

  it('has a plot of about 1 010 m²', () => {
    expect(Math.abs(polygonArea(site.boundary))).toBeGreaterThan(980);
    expect(Math.abs(polygonArea(site.boundary))).toBeLessThan(1040);
  });
});

describe('buildRegistry', () => {
  const docs = Object.fromEntries(project.documents.map((d) => [`/content/projects/${project.slug}/documents/${d.file}`, `/assets/${d.file}`]));

  it('resolves document URLs', () => {
    const [p] = buildRegistry({ [`/content/projects/${project.slug}/project.ts`]: { default: project } }, docs, {});
    expect(p!.resolvedDocuments).toHaveLength(4);
    expect(p!.resolvedDocuments[0]!.url).toMatch(/^\/assets\//);
  });

  it('rejects a slug that does not match its folder', () => {
    expect(() => buildRegistry({ '/content/projects/autre/project.ts': { default: project } }, docs, {})).toThrow(/dossier/);
  });

  it('rejects reserved slugs', () => {
    const bad: ProjectManifest = { ...project, slug: 'projects', documents: [] };
    expect(() => buildRegistry({ '/content/projects/projects/project.ts': { default: bad } }, {}, {})).toThrow(/réservé/);
  });

  it('rejects missing documents', () => {
    expect(() => buildRegistry({ [`/content/projects/${project.slug}/project.ts`]: { default: project } }, {}, {})).toThrow(/introuvable/);
  });
});
