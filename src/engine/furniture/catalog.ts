/**
 * Catalogue de mobilier paramétrique. Chaque objet est décrit dans un repère
 * local plan : x = largeur, y = profondeur (la face avant regarde -y),
 * z = hauteur depuis le sol. Les matériaux sont désignés par rôle.
 */
import * as THREE from 'three';
import type { FurnitureItem, FurnitureType, Vec2 } from '@/domain/building';
import type { MaterialRole } from '../materials/library';
import type { MeshBucket } from '../mesh-bucket';

type R = MaterialRole;

export class FurnitureContext {
  private readonly parts: { role: R; geometry: THREE.BufferGeometry }[] = [];

  box(role: R, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    const w = Math.abs(x1 - x0);
    const d = Math.abs(y1 - y0);
    const h = Math.abs(z1 - z0);
    if (w < 1e-4 || d < 1e-4 || h < 1e-4) return;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
    this.parts.push({ role, geometry: g });
  }

  /** Boîte centrée (cx, cy) de taille w × d, de z0 à z1. */
  cbox(role: R, cx: number, cy: number, w: number, d: number, z0: number, z1: number): void {
    this.box(role, cx - w / 2, cy - d / 2, z0, cx + w / 2, cy + d / 2, z1);
  }

  cyl(role: R, cx: number, cy: number, r: number, z0: number, z1: number, seg = 20, rTop = r): void {
    const g = new THREE.CylinderGeometry(rTop, r, z1 - z0, seg);
    g.translate(cx, (z0 + z1) / 2, -cy);
    this.parts.push({ role, geometry: g });
  }

  /** Roue / cylindre couché selon l'axe x. */
  wheel(role: R, cx: number, cy: number, cz: number, r: number, width: number): void {
    const g = new THREE.CylinderGeometry(r, r, width, 20);
    g.rotateZ(Math.PI / 2);
    g.translate(cx, cz, -cy);
    this.parts.push({ role, geometry: g });
  }

  sphere(role: R, cx: number, cy: number, cz: number, r: number, squash = 1): void {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1, squash, 1);
    g.translate(cx, cz, -cy);
    this.parts.push({ role, geometry: g });
  }

  flush(bucket: MeshBucket<R>, matrix: THREE.Matrix4): void {
    this.parts.forEach(({ role, geometry }) => bucket.add(role, geometry, matrix));
    this.parts.length = 0;
  }
}

type Builder = (c: FurnitureContext, w: number, d: number, variant?: string) => void;

const DEFAULT_SIZES: Record<FurnitureType, Vec2> = {
  doubleBed: [1.6, 2.1], singleBed: [0.95, 2.0], nightstand: [0.48, 0.4], wardrobe: [2.0, 0.6],
  sofa: [2.2, 0.92], cornerSofa: [2.8, 1.9], armchair: [0.82, 0.82], coffeeTable: [1.1, 0.6],
  tvUnit: [1.8, 0.42], diningTable: [2.0, 0.95], kitchenRun: [2.4, 0.62], kitchenIsland: [2.0, 0.8],
  fridge: [0.7, 0.7], desk: [1.25, 0.6], bookshelf: [1.4, 0.36], toilet: [0.4, 0.62], vanity: [0.8, 0.5],
  shower: [0.9, 0.9], bathtub: [1.7, 0.75], washer: [0.6, 0.6], plant: [0.5, 0.5], rug: [2.0, 1.4],
  car: [1.82, 4.45], outdoorLounge: [2.6, 2.2], outdoorDining: [1.6, 0.9], shelving: [1.8, 0.5], floorLamp: [0.4, 0.4],
};

const bed: Builder = (c, w, d) => {
  const hw = w / 2;
  const hd = d / 2;
  c.box('wood', -hw, -hd, 0.08, hw, hd - 0.05, 0.32);
  c.box('woodDark', -hw + 0.05, -hd + 0.05, 0, hw - 0.05, hd - 0.1, 0.08);
  c.box('linen', -hw + 0.03, -hd + 0.03, 0.32, hw - 0.03, hd - 0.1, 0.55);
  c.box('cushion', -hw + 0.02, -hd + 0.02, 0.55, hw - 0.02, hd - 0.62, 0.6);
  c.box('fabricAccent', -hw + 0.01, -hd + 0.01, 0.6, hw - 0.01, -hd + 0.45, 0.62);
  const pw = (w - 0.2) / (w > 1.2 ? 2 : 1);
  for (let i = 0; i < (w > 1.2 ? 2 : 1); i++) {
    const x = -hw + 0.1 + i * (pw + 0.0) + pw / 2;
    c.cbox('linen', x, hd - 0.38, pw - 0.06, 0.4, 0.55, 0.7);
  }
  c.box('fabric', -hw - 0.05, hd - 0.1, 0, hw + 0.05, hd, 1.1);
};

const nightstand: Builder = (c, w, d) => {
  c.cbox('wood', 0, 0, w, d, 0.06, 0.5);
  c.cbox('woodDark', 0, 0, w - 0.04, d - 0.04, 0, 0.06);
  c.cyl('metal', 0.05, 0.02, 0.07, 0.5, 0.52);
  c.cyl('metal', 0.05, 0.02, 0.012, 0.52, 0.8);
  c.cyl('lampShade', 0.05, 0.02, 0.13, 0.72, 0.92, 20, 0.09);
};

const wardrobe: Builder = (c, w, d) => {
  c.cbox('cabinet', 0, 0, w, d, 0.05, 2.25);
  c.cbox('woodDark', 0, 0.02, w - 0.04, d - 0.04, 0, 0.05);
  const doors = Math.max(2, Math.round(w / 0.6));
  for (let i = 1; i < doors; i++) {
    const x = -w / 2 + (w * i) / doors;
    c.box('woodDark', x - 0.004, -d / 2 - 0.004, 0.08, x + 0.004, -d / 2 + 0.01, 2.2);
  }
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / doors + (i % 2 === 0 ? 0.2 : -0.2) * (w / doors);
    c.box('metal', x - 0.01, -d / 2 - 0.03, 0.95, x + 0.01, -d / 2, 1.35);
  }
};

const sofaBody = (c: FurnitureContext, x0: number, y0: number, x1: number, y1: number, backSide: 'back' | 'none') => {
  c.box('fabric', x0, y0, 0.12, x1, y1, 0.42);
  c.box('cushion', x0 + 0.04, y0 + 0.02, 0.42, x1 - 0.04, y1 - (backSide === 'back' ? 0.22 : 0.04), 0.5);
};

const sofa: Builder = (c, w, d) => {
  const hw = w / 2;
  const hd = d / 2;
  sofaBody(c, -hw + 0.18, -hd, hw - 0.18, hd, 'back');
  c.box('fabric', -hw + 0.18, hd - 0.24, hw - 0.18, hd, 0.42, 0.86);
  c.box('fabric', -hw, -hd, 0.12, -hw + 0.18, hd, 0.64);
  c.box('fabric', hw - 0.18, -hd, 0.12, hw, hd, 0.64);
  c.cbox('fabricAccent', -hw + 0.45, hd - 0.38, 0.42, 0.14, 0.5, 0.88);
  c.cbox('fabricAccent', hw - 0.45, hd - 0.38, 0.42, 0.14, 0.5, 0.88);
  [[-hw + 0.08, -hd + 0.08], [hw - 0.08, -hd + 0.08], [-hw + 0.08, hd - 0.08], [hw - 0.08, hd - 0.08]].forEach(([x, y]) =>
    c.cyl('metal', x!, y!, 0.02, 0, 0.12, 8),
  );
};

const cornerSofa: Builder = (c, w, d) => {
  const hw = w / 2;
  const hd = d / 2;
  const depth = 0.95;
  // Assise principale le long du dossier (+y), méridienne à gauche vers l'avant.
  sofaBody(c, -hw, hd - depth, hw - 0.18, hd, 'back');
  sofaBody(c, -hw, -hd, -hw + depth, hd - depth, 'none');
  c.box('fabric', -hw, hd - 0.24, hw - 0.18, hd, 0.42, 0.86);
  c.box('fabric', hw - 0.18, hd - depth, hw, hd, 0.12, 0.64);
  c.box('fabric', -hw - 0.0, -hd, -hw + 0.2, hd - 0.24, 0.42, 0.62);
  c.cbox('fabricAccent', -hw + 0.4, hd - 0.38, 0.42, 0.14, 0.5, 0.88);
  c.cbox('fabricAccent', 0.1, hd - 0.38, 0.42, 0.14, 0.5, 0.88);
  c.cbox('cushion', hw - 0.55, hd - 0.38, 0.42, 0.14, 0.5, 0.86);
};

const armchair: Builder = (c, w, d) => {
  const hw = w / 2;
  const hd = d / 2;
  c.box('fabricAccent', -hw + 0.12, -hd, 0.18, hw - 0.12, hd, 0.44);
  c.box('cushion', -hw + 0.14, -hd + 0.02, 0.44, hw - 0.14, hd - 0.2, 0.5);
  c.box('fabricAccent', -hw + 0.12, hd - 0.18, 0.44, hw - 0.12, hd, 0.9);
  c.box('fabricAccent', -hw, -hd + 0.05, 0.18, -hw + 0.12, hd, 0.62);
  c.box('fabricAccent', hw - 0.12, -hd + 0.05, 0.18, hw, hd, 0.62);
  [[-hw + 0.06, -hd + 0.08], [hw - 0.06, -hd + 0.08], [-hw + 0.06, hd - 0.06], [hw - 0.06, hd - 0.06]].forEach(([x, y]) =>
    c.cyl('wood', x!, y!, 0.022, 0, 0.18, 8),
  );
};

const coffeeTable: Builder = (c, w, d) => {
  c.cbox('wood', 0, 0, w, d, 0.34, 0.39);
  c.cbox('woodDark', 0, 0, w - 0.1, d - 0.1, 0.12, 0.14);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => c.cbox('metal', (sx! * (w - 0.08)) / 2, (sy! * (d - 0.08)) / 2, 0.03, 0.03, 0, 0.34));
  c.cyl('ceramic', w * 0.2, 0, 0.08, 0.39, 0.5, 16, 0.06);
  c.cbox('fabricAccent', -w * 0.2, 0.02, 0.28, 0.2, 0.39, 0.44);
};

const tvUnit: Builder = (c, w, d) => {
  c.cbox('woodDark', 0, 0, w, d, 0.1, 0.48);
  c.cbox('metal', 0, 0, w - 0.1, d - 0.08, 0, 0.1);
  for (let i = 1; i < 3; i++) c.box('wood', -w / 2 + (w * i) / 3 - 0.004, -d / 2 - 0.004, 0.12, -w / 2 + (w * i) / 3 + 0.004, -d / 2 + 0.01, 0.46);
  const tw = Math.min(1.45, w * 0.8);
  c.cbox('screen', 0, d / 2 - 0.08, tw, 0.04, 0.62, 0.62 + tw * 0.57);
  c.cbox('metal', 0, d / 2 - 0.08, 0.3, 0.12, 0.48, 0.64);
  c.cyl('leaf', w / 2 - 0.15, 0, 0.1, 0.48, 0.66, 10, 0.1);
};

const chair = (c: FurnitureContext, x: number, y: number, facing: 'n' | 's' | 'e' | 'w') => {
  c.cbox('wood', x, y, 0.44, 0.44, 0.44, 0.48);
  const back = { n: [x, y - 0.2, 0.42, 0.04], s: [x, y + 0.2, 0.42, 0.04], e: [x - 0.2, y, 0.04, 0.42], w: [x + 0.2, y, 0.04, 0.42] }[facing];
  c.cbox('wood', back[0]!, back[1]!, back[2]!, back[3]!, 0.48, 0.9);
  c.cbox('cushion', x, y, 0.4, 0.4, 0.48, 0.52);
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([dx, dy]) => c.cyl('woodDark', x + dx!, y + dy!, 0.018, 0, 0.44, 8));
};

const diningTable: Builder = (c, w, d, variant) => {
  c.cbox('wood', 0, 0, w, d, 0.71, 0.76);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => c.cbox('woodDark', (sx! * (w - 0.12)) / 2, (sy! * (d - 0.12)) / 2, 0.06, 0.06, 0, 0.71));
  if (variant === 'two') {
    chair(c, 0, -d / 2 - 0.3, 'n');
    chair(c, 0, d / 2 + 0.3, 's');
    return;
  }
  const n = Math.max(1, Math.floor(w / 0.65));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    chair(c, x, -d / 2 - 0.28, 'n');
    chair(c, x, d / 2 + 0.28, 's');
  }
  if (w > 1.7) {
    chair(c, -w / 2 - 0.3, 0, 'e');
    chair(c, w / 2 + 0.3, 0, 'w');
  }
  c.cyl('ceramic', 0, 0, 0.12, 0.76, 0.8, 18, 0.16);
  c.sphere('leaf', 0, 0, 0.86, 0.1);
};

const kitchenRun: Builder = (c, w, d, variant) => {
  const hw = w / 2;
  const hd = d / 2;
  c.box('woodDark', -hw + 0.02, -hd + 0.06, 0, hw - 0.02, hd, 0.1);
  c.box('cabinet', -hw, -hd + 0.02, 0.1, hw, hd, 0.86);
  c.box('counter', -hw, -hd, 0.86, hw, hd, 0.9);
  const doors = Math.max(1, Math.round(w / 0.6));
  for (let i = 1; i < doors; i++) {
    const x = -hw + (w * i) / doors;
    c.box('woodDark', x - 0.003, -hd + 0.015, 0.12, x + 0.003, -hd + 0.025, 0.84);
  }
  c.box('chrome', -hw + 0.05, -hd + 0.005, 0.78, hw - 0.05, -hd + 0.02, 0.8);
  if (variant === 'plain') return;
  // Évier ou plaque selon la variante.
  if (variant === 'hob') {
    c.cbox('screen', 0, 0, 0.6, 0.5, 0.9, 0.905);
    c.cbox('appliance', 0, hd - 0.2, 0.7, 0.4, 1.6, 1.9);
    c.cbox('appliance', 0, hd - 0.12, 0.2, 0.2, 1.9, 2.4);
  } else {
    c.cbox('chrome', -w * 0.15, 0, 0.6, 0.42, 0.86, 0.905);
    c.cyl('chrome', -w * 0.15, hd - 0.08, 0.015, 0.9, 1.2, 8);
  }
  c.box('cabinet', -hw, hd - 0.35, 1.45, hw, hd, 2.15);
  for (let i = 1; i < doors; i++) {
    const x = -hw + (w * i) / doors;
    c.box('woodDark', x - 0.003, hd - 0.36, 1.47, x + 0.003, hd - 0.34, 2.13);
  }
  c.box('lampShade', -hw + 0.05, hd - 0.33, 1.43, hw - 0.05, hd - 0.05, 1.45);
};

const kitchenIsland: Builder = (c, w, d) => {
  c.box('cabinet', -w / 2 + 0.05, -d / 2 + 0.05, 0.08, w / 2 - 0.05, d / 2 - 0.25, 0.9);
  c.box('woodDark', -w / 2 + 0.08, -d / 2 + 0.08, 0, w / 2 - 0.08, d / 2 - 0.28, 0.08);
  c.cbox('counter', 0, 0, w, d, 0.9, 0.94);
  const n = Math.max(2, Math.floor(w / 0.6));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    c.cyl('fabricAccent', x, d / 2 + 0.22, 0.19, 0.66, 0.72, 16);
    c.cyl('metal', x, d / 2 + 0.22, 0.025, 0, 0.66, 8);
    c.cyl('metal', x, d / 2 + 0.22, 0.17, 0.25, 0.27, 16);
  }
  c.cyl('lampShade', -w / 4, 0, 0.13, 1.85, 2.05, 18, 0.06);
  c.cyl('lampShade', w / 4, 0, 0.13, 1.85, 2.05, 18, 0.06);
  c.cyl('metal', -w / 4, 0, 0.006, 2.05, 2.9, 6);
  c.cyl('metal', w / 4, 0, 0.006, 2.05, 2.9, 6);
};

const fridge: Builder = (c, w, d) => {
  c.cbox('appliance', 0, 0, w, d, 0, 1.95);
  c.box('screen', -w / 2 + 0.02, -d / 2 - 0.004, 1.2, w / 2 - 0.02, -d / 2 + 0.004, 1.21);
  c.box('chrome', w / 2 - 0.08, -d / 2 - 0.04, 0.85, w / 2 - 0.06, -d / 2, 1.6);
};

const desk: Builder = (c, w, d) => {
  c.cbox('wood', 0, 0, w, d, 0.72, 0.76);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => c.cbox('metal', (sx! * (w - 0.06)) / 2, (sy! * (d - 0.06)) / 2, 0.03, 0.03, 0, 0.72));
  c.cbox('screen', 0, d / 2 - 0.15, 0.55, 0.03, 0.85, 1.18);
  c.cbox('metal', 0, d / 2 - 0.15, 0.04, 0.04, 0.76, 0.85);
  c.cbox('appliance', -0.05, -0.05, 0.4, 0.14, 0.76, 0.775);
  c.cyl('fabricAccent', 0, -d / 2 - 0.3, 0.24, 0.42, 0.5, 16);
  c.cbox('fabricAccent', 0, -d / 2 - 0.52, 0.42, 0.06, 0.5, 0.95);
  c.cyl('metal', 0, -d / 2 - 0.3, 0.025, 0.05, 0.42, 8);
  c.cyl('metal', 0, -d / 2 - 0.3, 0.26, 0, 0.05, 5);
  c.cyl('metal', w / 2 - 0.15, d / 2 - 0.12, 0.01, 0.76, 1.15, 6);
  c.cyl('lampShade', w / 2 - 0.15, d / 2 - 0.2, 0.08, 1.08, 1.18, 14, 0.05);
};

const bookshelf: Builder = (c, w, d) => {
  const h = 2.0;
  c.box('wood', -w / 2, -d / 2, 0, -w / 2 + 0.03, d / 2, h);
  c.box('wood', w / 2 - 0.03, -d / 2, 0, w / 2, d / 2, h);
  c.box('wood', -w / 2, d / 2 - 0.02, 0, w / 2, d / 2, h);
  const roles: R[] = ['fabricAccent', 'woodDark', 'cushion', 'rug', 'fabric'];
  for (let s = 0; s < 5; s++) {
    const z = 0.04 + s * 0.4;
    c.box('wood', -w / 2, -d / 2, z - 0.03, w / 2, d / 2, z);
    let x = -w / 2 + 0.05;
    let k = s * 3;
    while (x < w / 2 - 0.25) {
      const bw = 0.03 + ((k * 37) % 5) * 0.012;
      const bh = 0.2 + ((k * 13) % 4) * 0.035;
      if ((k * 7) % 9 !== 0) c.box(roles[k % roles.length]!, x, -d / 2 + 0.05, z, x + bw, d / 2 - 0.04, z + bh);
      x += bw + 0.004;
      k++;
    }
  }
};

const toilet: Builder = (c, w, d) => {
  c.cyl('ceramic', 0, -0.05, 0.18, 0, 0.4, 20, 0.2);
  c.cbox('ceramic', 0, d / 2 - 0.1, w * 0.95, 0.18, 0.3, 0.78);
  c.cyl('ceramic', 0, -0.05, 0.2, 0.4, 0.42, 20);
};

const vanity: Builder = (c, w, d, variant) => {
  c.cbox('wood', 0, 0, w, d, 0.35, 0.8);
  c.cbox('counter', 0, 0, w + 0.02, d + 0.02, 0.8, 0.83);
  const basins = variant === 'double' ? [-w / 4, w / 4] : [0];
  basins.forEach((x) => {
    c.cyl('ceramic', x, -0.02, 0.17, 0.83, 0.95, 24, 0.19);
    c.cyl('chrome', x, d / 2 - 0.06, 0.012, 0.83, 1.05, 8);
  });
  c.box('chrome', -w / 2 + 0.02, d / 2 - 0.02, 1.1, w / 2 - 0.02, d / 2, 1.85);
  c.box('lampShade', -w / 2 + 0.05, d / 2 - 0.05, 1.9, w / 2 - 0.05, d / 2 - 0.01, 1.94);
};

const shower: Builder = (c, w, d) => {
  c.cbox('ceramic', 0, 0, w, d, 0, 0.05);
  c.box('railGlass', -w / 2, -d / 2, 0.05, w / 2 - 0.25, -d / 2 + 0.01, 2.0);
  c.box('chrome', -w / 2, -d / 2, 1.98, w / 2 - 0.25, -d / 2 + 0.015, 2.0);
  c.cyl('chrome', w / 2 - 0.12, d / 2 - 0.04, 0.012, 0.9, 2.05, 8);
  c.cyl('chrome', w / 2 - 0.12, d / 2 - 0.18, 0.1, 2.0, 2.02, 16);
};

const bathtub: Builder = (c, w, d) => {
  c.cbox('ceramic', 0, 0, w, d, 0, 0.56);
  c.cbox('water', 0, 0, w - 0.12, d - 0.12, 0.5, 0.565);
  c.cyl('chrome', w / 2 - 0.1, 0, 0.015, 0.56, 0.8, 8);
};

const washer: Builder = (c, w, d, variant) => {
  c.cbox('appliance', 0, 0, w, d, 0, 0.85);
  c.box('ceramic', -w / 2 + 0.02, -d / 2 - 0.005, 0.72, w / 2 - 0.02, -d / 2 + 0.005, 0.82);
  c.cbox(variant === 'dryer' ? 'chrome' : 'screen', 0, -d / 2 - 0.004, 0.32, 0.01, 0.38, 0.62);
};

const plant: Builder = (c, w, _d, variant) => {
  const big = variant === 'olive';
  const r = big ? 0.3 : w * 0.35;
  c.cyl('pot', 0, 0, r * 0.75, 0, big ? 0.55 : 0.42, 18, r);
  if (big) {
    c.cyl('woodDark', 0, 0, 0.04, 0.5, 1.4, 8, 0.03);
    c.sphere('leaf', 0, 0, 1.6, 0.45, 0.8);
    c.sphere('leaf', 0.25, 0.1, 1.45, 0.3, 0.8);
    c.sphere('leaf', -0.22, -0.12, 1.5, 0.32, 0.8);
  } else {
    c.sphere('leaf', 0, 0, 0.75, r * 1.25, 1.3);
    c.sphere('leaf', r * 0.5, 0, 0.98, r * 0.8, 1.2);
    c.sphere('leaf', -r * 0.4, r * 0.3, 1.05, r * 0.7, 1.3);
  }
};

const rug: Builder = (c, w, d, variant) => {
  c.cbox(variant === 'flat' ? 'fabric' : 'rug', 0, 0, w, d, 0, 0.012);
  if (variant !== 'flat') c.cbox('cushion', 0, 0, w - 0.25, d - 0.25, 0.012, 0.014);
};

const car: Builder = (c, w, d, variant) => {
  const paint: R = variant === 'pearl' ? 'carPearl' : 'carGraphite';
  const hw = w / 2;
  const hd = d / 2;
  c.box(paint, -hw, -hd + 0.05, 0.3, hw, hd - 0.05, 0.78);
  c.box(paint, -hw + 0.05, -hd, 0.36, hw - 0.05, hd, 0.7);
  c.box('carGlass', -hw + 0.12, -hd + 1.05, 0.78, hw - 0.12, hd - 0.75, 1.3);
  c.box(paint, -hw + 0.16, -hd + 1.35, 1.3, hw - 0.16, hd - 0.95, 1.38);
  c.box('chrome', -hw + 0.15, -hd - 0.01, 0.6, -hw + 0.45, -hd + 0.05, 0.68);
  c.box('chrome', hw - 0.45, -hd - 0.01, 0.6, hw - 0.15, -hd + 0.05, 0.68);
  c.box('lampShade', -hw + 0.12, hd - 0.04, 0.62, -hw + 0.4, hd + 0.005, 0.7);
  c.box('lampShade', hw - 0.4, hd - 0.04, 0.62, hw - 0.12, hd + 0.005, 0.7);
  [[-hw + 0.1, -hd + 0.8], [hw - 0.1, -hd + 0.8], [-hw + 0.1, hd - 0.8], [hw - 0.1, hd - 0.8]].forEach(([x, y]) => {
    c.wheel('tire', x!, y!, 0.33, 0.33, 0.24);
    c.wheel('chrome', x! + (x! > 0 ? 0.121 : -0.121), y!, 0.33, 0.2, 0.01);
  });
};

const outdoorLounge: Builder = (c, w, d) => {
  const hw = w / 2;
  const hd = d / 2;
  // Banquette le long de l'arrière, deux fauteuils face à face, table basse.
  c.box('wood', -hw + 0.2, hd - 0.85, 0, hw - 0.2, hd, 0.36);
  c.box('linen', -hw + 0.22, hd - 0.83, 0.36, hw - 0.22, hd - 0.15, 0.48);
  c.box('linen', -hw + 0.22, hd - 0.2, 0.36, hw - 0.22, hd - 0.02, 0.8);
  c.cbox('fabricAccent', -0.4, hd - 0.3, 0.45, 0.14, 0.42, 0.78);
  c.cbox('fabricAccent', 0.45, hd - 0.3, 0.45, 0.14, 0.42, 0.78);
  [-1, 1].forEach((s) => {
    const x = s * (hw - 0.45);
    c.cbox('wood', x, -hd + 0.75, 0.8, 0.8, 0, 0.36);
    c.cbox('linen', x, -hd + 0.75, 0.76, 0.76, 0.36, 0.47);
  });
  c.cbox('wood', 0, -0.1, 1.0, 0.6, 0.3, 0.36);
  c.cbox('woodDark', 0, -0.1, 0.9, 0.5, 0, 0.3);
  c.cyl('ceramic', 0.2, -0.1, 0.1, 0.36, 0.44, 16, 0.12);
};

const outdoorDining: Builder = (c, w, d) => {
  c.cbox('wood', 0, 0, w, d, 0.71, 0.75);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => c.cbox('metal', (sx! * (w - 0.1)) / 2, (sy! * (d - 0.1)) / 2, 0.04, 0.04, 0, 0.71));
  const n = Math.max(1, Math.floor(w / 0.7));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    chair(c, x, -d / 2 - 0.3, 'n');
    chair(c, x, d / 2 + 0.3, 's');
  }
  c.cyl('metal', 0, 0, 0.02, 0.75, 2.2, 8);
  c.cyl('linen', 0, 0, 1.2, 2.2, 2.45, 8, 0.05);
};

const shelving: Builder = (c, w, d, variant) => {
  if (variant === 'dressing') {
    c.box('wood', -w / 2, d / 2 - 0.02, 0, w / 2, d / 2, 2.2);
    c.box('wood', -w / 2, -d / 2, 1.95, w / 2, d / 2, 1.98);
    c.box('wood', -w / 2, -d / 2, 0.35, w / 2, d / 2, 0.38);
    c.box('chrome', -w / 2, -0.01, 1.85, w / 2, 0.01, 1.87);
    const roles: R[] = ['fabric', 'fabricAccent', 'linen', 'woodDark', 'cushion'];
    for (let i = 0; i < Math.floor(w / 0.09); i++) {
      c.cbox(roles[i % roles.length]!, -w / 2 + 0.08 + i * 0.09, 0, 0.03, d * 0.8, 1.05 + (i % 3) * 0.1, 1.84);
    }
    for (let i = 0; i < Math.floor(w / 0.32); i++) c.cbox('woodDark', -w / 2 + 0.18 + i * 0.32, -0.05, 0.22, 0.28, 0.38, 0.5);
    return;
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => c.cbox('metal', (sx! * (w - 0.04)) / 2, (sy! * (d - 0.04)) / 2, 0.035, 0.035, 0, 2.0));
  for (let s = 0; s < 4; s++) {
    const z = 0.15 + s * 0.6;
    c.cbox('wood', 0, 0, w, d, z, z + 0.025);
    for (let i = 0; i < Math.floor(w / 0.45); i++) {
      if ((i + s) % 3 === 2) continue;
      c.cbox(i % 2 ? 'cushion' : 'fabric', -w / 2 + 0.25 + i * 0.45, 0, 0.36, d * 0.7, z + 0.025, z + 0.3);
    }
  }
};

const floorLamp: Builder = (c) => {
  c.cyl('metal', 0, 0, 0.16, 0, 0.03, 18);
  c.cyl('metal', 0, 0, 0.012, 0.03, 1.5, 8);
  c.cyl('lampShade', 0, 0, 0.22, 1.42, 1.72, 22, 0.17);
};

const BUILDERS: Record<FurnitureType, Builder> = {
  doubleBed: bed, singleBed: bed, nightstand, wardrobe, sofa, cornerSofa, armchair, coffeeTable, tvUnit,
  diningTable, kitchenRun, kitchenIsland, fridge, desk, bookshelf, toilet, vanity, shower, bathtub, washer,
  plant, rug, car, outdoorLounge, outdoorDining, shelving, floorLamp,
};

/** Place un objet du catalogue dans le seau de géométries. */
export function addFurniture(bucket: MeshBucket<R>, item: FurnitureItem, floorZ: number): void {
  const [w, d] = item.size ?? DEFAULT_SIZES[item.type];
  const ctx = new FurnitureContext();
  BUILDERS[item.type](ctx, w, d, item.variant);
  const m = new THREE.Matrix4()
    .makeTranslation(item.at[0], floorZ, -item.at[1])
    .multiply(new THREE.Matrix4().makeRotationY(((item.rot ?? 0) * Math.PI) / 180));
  ctx.flush(bucket, m);
}

export const furnitureTypes = Object.keys(BUILDERS) as FurnitureType[];
