/**
 * Textures procédurales générées sur <canvas> : aucun fichier image à
 * charger, rendu identique hors-ligne. Les textures « de détail » sont
 * quasi blanches et teintées par la couleur du matériau, ce qui permet de
 * changer de palette sans régénérer d'image.
 */
import * as THREE from 'three';
import { seededRandom } from '../geometry';

export type TextureId =
  | 'plaster'
  | 'parquet'
  | 'largeTile'
  | 'wetTile'
  | 'terracotta'
  | 'deck'
  | 'concrete'
  | 'stoneCladding'
  | 'grass'
  | 'gravel'
  | 'road'
  | 'paving'
  | 'fabric'
  | 'roof'
  | 'woodGrain';

interface TextureSpec {
  /** Taille du motif en mètres (le canvas couvre ce carré). */
  readonly meters: number;
  readonly px: number;
  readonly draw: (ctx: CanvasRenderingContext2D, px: number, rnd: () => number) => void;
}

const gray = (v: number, a = 1) => {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return `rgba(${c},${c},${c},${a})`;
};

function speckle(ctx: CanvasRenderingContext2D, px: number, rnd: () => number, count: number, base: number, spread: number, size: number) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = gray(base + (rnd() - 0.5) * spread, 0.5);
    const s = size * (0.4 + rnd());
    ctx.fillRect(rnd() * px, rnd() * px, s, s);
  }
}

function tiles(ctx: CanvasRenderingContext2D, px: number, rnd: () => number, n: number, grout: number, base: number, spread: number) {
  ctx.fillStyle = gray(base - 60);
  ctx.fillRect(0, 0, px, px);
  const s = px / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = gray(base + (rnd() - 0.5) * spread);
      ctx.fillRect(i * s + grout / 2, j * s + grout / 2, s - grout, s - grout);
    }
  }
}

const SPECS: Record<TextureId, TextureSpec> = {
  plaster: {
    meters: 2,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(244);
      ctx.fillRect(0, 0, px, px);
      speckle(ctx, px, rnd, 9000, 236, 22, 3);
    },
  },
  parquet: {
    meters: 2.4,
    px: 1024,
    draw: (ctx, px, rnd) => {
      const rows = 13;
      const h = px / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * px * 0.4;
        while (x < px) {
          const w = px * (0.35 + rnd() * 0.25);
          const tone = 205 + rnd() * 45;
          ctx.fillStyle = gray(tone);
          ctx.fillRect(x, r * h, w, h);
          for (let g = 0; g < 7; g++) {
            ctx.strokeStyle = gray(tone - 18 - rnd() * 14, 0.35);
            ctx.lineWidth = 1 + rnd();
            const y = r * h + rnd() * h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + w * 0.3, y + (rnd() - 0.5) * 6, x + w * 0.6, y + (rnd() - 0.5) * 6, x + w, y);
            ctx.stroke();
          }
          ctx.fillStyle = gray(150, 0.9);
          ctx.fillRect(x, r * h, 2, h);
          x += w;
        }
        ctx.fillStyle = gray(150, 0.9);
        ctx.fillRect(0, r * h, px, 2);
      }
    },
  },
  largeTile: {
    meters: 1.2,
    px: 512,
    draw: (ctx, px, rnd) => {
      tiles(ctx, px, rnd, 2, 3, 238, 10);
      speckle(ctx, px, rnd, 3000, 225, 30, 2);
    },
  },
  wetTile: {
    meters: 0.9,
    px: 512,
    draw: (ctx, px, rnd) => tiles(ctx, px, rnd, 3, 4, 240, 12),
  },
  terracotta: {
    meters: 0.8,
    px: 512,
    draw: (ctx, px, rnd) => {
      tiles(ctx, px, rnd, 4, 6, 225, 40);
      speckle(ctx, px, rnd, 2500, 210, 40, 2);
    },
  },
  deck: {
    meters: 1.4,
    px: 512,
    draw: (ctx, px, rnd) => {
      const n = 10;
      const h = px / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = gray(200 + rnd() * 50);
        ctx.fillRect(0, i * h, px, h - 4);
        ctx.fillStyle = gray(90);
        ctx.fillRect(0, i * h + h - 4, px, 4);
        for (let g = 0; g < 5; g++) {
          ctx.fillStyle = gray(170, 0.25);
          ctx.fillRect(0, i * h + rnd() * (h - 6), px, 1);
        }
      }
    },
  },
  concrete: {
    meters: 3,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(232);
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = gray(215 + rnd() * 30, 0.18);
        ctx.beginPath();
        ctx.arc(rnd() * px, rnd() * px, 20 + rnd() * 70, 0, Math.PI * 2);
        ctx.fill();
      }
      speckle(ctx, px, rnd, 5000, 220, 40, 2);
    },
  },
  stoneCladding: {
    meters: 2,
    px: 1024,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(120);
      ctx.fillRect(0, 0, px, px);
      let y = 0;
      while (y < px) {
        const h = px * (0.06 + rnd() * 0.06);
        let x = -rnd() * 60;
        while (x < px) {
          const w = px * (0.08 + rnd() * 0.16);
          ctx.fillStyle = gray(190 + rnd() * 60);
          const r = 6;
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 3, w - 6, h - 6, r);
          ctx.fill();
          x += w;
        }
        y += h;
      }
      speckle(ctx, px, rnd, 9000, 200, 60, 2);
    },
  },
  grass: {
    meters: 6,
    px: 1024,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = '#7d8f55';
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < 160; i++) {
        const hue = 70 + rnd() * 25;
        ctx.fillStyle = `hsla(${hue}, ${28 + rnd() * 20}%, ${32 + rnd() * 18}%, 0.25)`;
        ctx.beginPath();
        ctx.arc(rnd() * px, rnd() * px, 30 + rnd() * 120, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 26000; i++) {
        const hue = 60 + rnd() * 40;
        ctx.strokeStyle = `hsla(${hue}, 35%, ${25 + rnd() * 35}%, 0.55)`;
        const x = rnd() * px;
        const yy = rnd() * px;
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + (rnd() - 0.5) * 4, yy - 3 - rnd() * 6);
        ctx.stroke();
      }
    },
  },
  gravel: {
    meters: 2,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = '#b9ad98';
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < 14000; i++) {
        const l = 50 + rnd() * 35;
        ctx.fillStyle = `hsl(${30 + rnd() * 15}, ${8 + rnd() * 10}%, ${l}%)`;
        ctx.beginPath();
        ctx.arc(rnd() * px, rnd() * px, 0.8 + rnd() * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  road: {
    meters: 4,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = '#a79a84';
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = `hsla(32, ${10 + rnd() * 12}%, ${45 + rnd() * 30}%, 0.6)`;
        ctx.fillRect(rnd() * px, rnd() * px, 1 + rnd() * 3, 1 + rnd() * 3);
      }
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = 'rgba(80,70,55,0.08)';
        ctx.beginPath();
        ctx.arc(rnd() * px, rnd() * px, 20 + rnd() * 60, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  paving: {
    meters: 1.6,
    px: 512,
    draw: (ctx, px, rnd) => {
      tiles(ctx, px, rnd, 4, 6, 232, 22);
      speckle(ctx, px, rnd, 4000, 215, 40, 2);
    },
  },
  fabric: {
    meters: 0.4,
    px: 256,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(236);
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < px; i += 2) {
        ctx.fillStyle = gray(222 + rnd() * 20, 0.6);
        ctx.fillRect(i, 0, 1, px);
        ctx.fillStyle = gray(222 + rnd() * 20, 0.6);
        ctx.fillRect(0, i, px, 1);
      }
    },
  },
  roof: {
    meters: 3,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(226);
      ctx.fillRect(0, 0, px, px);
      speckle(ctx, px, rnd, 16000, 205, 70, 2.5);
    },
  },
  woodGrain: {
    meters: 1,
    px: 512,
    draw: (ctx, px, rnd) => {
      ctx.fillStyle = gray(232);
      ctx.fillRect(0, 0, px, px);
      for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = gray(200 + rnd() * 30, 0.4);
        ctx.lineWidth = 1 + rnd() * 2;
        const y = rnd() * px;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(px * 0.3, y + (rnd() - 0.5) * 20, px * 0.7, y + (rnd() - 0.5) * 20, px, y);
        ctx.stroke();
      }
    },
  },
};

export class TextureFactory {
  private readonly cache = new Map<TextureId, THREE.CanvasTexture>();

  constructor(private readonly anisotropy: number) {}

  /** Texture répétée, échelle exprimée en mètres (UV du moteur = mètres). */
  get(id: TextureId): THREE.CanvasTexture {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const spec = SPECS[id];
    const canvas = document.createElement('canvas');
    canvas.width = spec.px;
    canvas.height = spec.px;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    spec.draw(ctx, spec.px, seededRandom(hash(id)));
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / spec.meters, 1 / spec.meters);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.anisotropy;
    tex.name = id;
    this.cache.set(id, tex);
    return tex;
  }

  dispose(): void {
    this.cache.forEach((t) => t.dispose());
    this.cache.clear();
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
