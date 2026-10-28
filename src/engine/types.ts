import type { Season } from './environment/solar';

export type LayerId = 'furniture' | 'labels' | 'terrain' | 'vegetation' | 'fence' | 'contours' | 'boundary';
export type Quality = 'high' | 'balanced' | 'low';
export type ViewId = 'ensemble' | 'piste' | 'jardin' | 'est' | 'ouest' | 'aerienne' | 'plan';

export interface ViewerSettings {
  /** 'all' ou identifiant de niveau. */
  readonly level: string;
  /** Hauteur de coupe au-dessus du sol du niveau affiché (m). */
  readonly cut: number;
  readonly exploded: boolean;
  readonly layers: Readonly<Record<LayerId, boolean>>;
  readonly facade: string;
  readonly frame: string | null;
  readonly wall: string | null;
  readonly interior: string;
  readonly accent: string | null;
  readonly season: Season;
  readonly hour: number;
}

export const DEFAULT_LAYERS: Readonly<Record<LayerId, boolean>> = {
  furniture: true,
  labels: true,
  terrain: true,
  vegetation: true,
  fence: true,
  contours: false,
  boundary: false,
};

export const VIEW_LABELS: Readonly<Record<ViewId, string>> = {
  ensemble: "Vue d'ensemble",
  piste: 'Façade piste',
  jardin: 'Façade jardin',
  est: 'Façade est',
  ouest: 'Façade ouest',
  aerienne: 'Aérienne',
  plan: 'Plan (dessus)',
};

export const LAYER_LABELS: Readonly<Record<LayerId, string>> = {
  furniture: 'Mobilier',
  labels: 'Noms des pièces',
  terrain: 'Terrain',
  vegetation: 'Végétation',
  fence: 'Clôture',
  contours: 'Courbes de niveau',
  boundary: 'Limites de parcelle',
};
