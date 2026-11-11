import { useMemo } from 'react';
import type { Level, Vec2 } from '@/domain/building';
import { curvedWallSegments, splitWall, wallAxis } from '@/engine/geometry';

/**
 * Plan 2D vectoriel d'un niveau, dessiné à partir des mêmes données que la
 * 3D (murs coupés à 1 m : les ouvertures apparaissent comme sur un plan).
 */
export function PlanSketch({ level, title }: { level: Level; title?: string }) {
  const { rects, arcs, rooms, box } = useMemo(() => planGeometry(level), [level]);
  const pad = 0.8;
  const vb = `${box.x0 - pad} ${-box.y1 - pad} ${box.x1 - box.x0 + pad * 2} ${box.y1 - box.y0 + pad * 2}`;
  return (
    <svg viewBox={vb} role="img" aria-label={title ?? `Plan ${level.name}`}>
      <g fill="currentColor" fillOpacity="0.08">
        {rooms.map((r, i) => (
          <rect key={i} x={r.x0} y={-r.y1} width={r.x1 - r.x0} height={r.y1 - r.y0} />
        ))}
      </g>
      <g fill="currentColor">
        {rects.map((r, i) => (
          <rect key={i} x={r.x0} y={-r.y1} width={r.x1 - r.x0} height={r.y1 - r.y0} />
        ))}
        {arcs.map((q, i) => (
          <polygon key={`arc-${i}`} points={q.map(([x, y]) => `${x},${-y}`).join(' ')} />
        ))}
      </g>
    </svg>
  );
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function planGeometry(level: Level) {
  const rects: Box[] = [];
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const grow = ([x, y]: Vec2) => {
    box.x0 = Math.min(box.x0, x);
    box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x);
    box.y1 = Math.max(box.y1, y);
  };
  level.walls.forEach((w) => {
    const axis = wallAxis(w);
    const t = w.thickness / 2;
    // Plan coupé à 1 m : on garde les tronçons qui traversent cette hauteur.
    splitWall(axis, 2.9, w.openings ?? [])
      .filter((p) => p.z0 <= 1 && p.z1 >= 1)
      .forEach((p) => {
        const r = axis.alongX
          ? { x0: p.s0, x1: p.s1, y0: axis.center - t, y1: axis.center + t }
          : { x0: axis.center - t, x1: axis.center + t, y0: p.s0, y1: p.s1 };
        rects.push(r);
        grow([r.x0, r.y0]);
        grow([r.x1, r.y1]);
      });
  });
  const arcs = (level.curvedWalls ?? []).flatMap((w) => curvedWallSegments(w, w.radius - w.thickness / 2, w.radius + w.thickness / 2));
  arcs.forEach((q) => q.forEach(grow));
  const rooms = level.rooms.flatMap((r) => r.rects);
  rooms.forEach((r) => {
    grow([r.x0, r.y0]);
    grow([r.x1, r.y1]);
  });
  return { rects, arcs, rooms, box };
}
