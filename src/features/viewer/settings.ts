/**
 * Réglages de la visionneuse ⇄ paramètres d'URL : une vue configurée se
 * partage par simple copie du lien. Toute valeur inconnue est ignorée.
 */
import { SEASON_DAY, type Season } from '@/engine/environment/solar';
import { DEFAULT_FACADE, DEFAULT_INTERIOR, FACADE_PALETTES, INTERIOR_STYLES, isHexColor } from '@/engine/materials/palettes';
import { DEFAULT_LAYERS, type LayerId, type ViewerSettings } from '@/engine/types';

export const HOUR_MIN = 5;
export const HOUR_MAX = 21.5;
export const CUT_MIN = 0.4;
export const CUT_MAX = 2.9;

export const DEFAULT_SETTINGS: ViewerSettings = {
  level: 'all',
  cut: 1.6,
  exploded: false,
  layers: DEFAULT_LAYERS,
  facade: DEFAULT_FACADE,
  frame: null,
  wall: null,
  interior: DEFAULT_INTERIOR,
  accent: null,
  season: 'equinoxe',
  hour: 16,
};

const LAYER_IDS = Object.keys(DEFAULT_LAYERS) as LayerId[];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hex = (v: string | null) => (v && isHexColor(`#${v}`) ? `#${v}` : null);

/** `levelIds` = null : niveaux pas encore connus, tout identifiant bien formé est accepté. */
export function parseSettings(params: URLSearchParams, levelIds: readonly string[] | null): ViewerSettings {
  const s = { ...DEFAULT_SETTINGS, layers: { ...DEFAULT_LAYERS } };
  const level = params.get('niveau');
  if (level && (level === 'all' || (levelIds ? levelIds.includes(level) : /^[a-z0-9-]{1,40}$/.test(level)))) s.level = level;
  const cut = Number(params.get('coupe'));
  if (params.has('coupe') && Number.isFinite(cut)) s.cut = clamp(cut, CUT_MIN, CUT_MAX);
  s.exploded = params.get('eclate') === '1';
  const facade = params.get('facade');
  if (facade && FACADE_PALETTES.some((p) => p.id === facade)) s.facade = facade;
  const interior = params.get('interieur');
  if (interior && INTERIOR_STYLES.some((p) => p.id === interior)) s.interior = interior;
  s.frame = hex(params.get('menuiserie'));
  s.wall = hex(params.get('mur'));
  s.accent = hex(params.get('accent'));
  const season = params.get('saison');
  if (season && season in SEASON_DAY) s.season = season as Season;
  const hour = Number(params.get('heure'));
  if (params.has('heure') && Number.isFinite(hour)) s.hour = clamp(hour, HOUR_MIN, HOUR_MAX);
  const hidden = params.get('masquer');
  const shown = params.get('afficher');
  hidden?.split(',').forEach((id) => LAYER_IDS.includes(id as LayerId) && (s.layers[id as LayerId] = false));
  shown?.split(',').forEach((id) => LAYER_IDS.includes(id as LayerId) && (s.layers[id as LayerId] = true));
  return s;
}

export function serializeSettings(s: ViewerSettings): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_SETTINGS;
  if (s.level !== d.level) p.set('niveau', s.level);
  if (s.cut !== d.cut) p.set('coupe', s.cut.toFixed(2));
  if (s.exploded) p.set('eclate', '1');
  if (s.facade !== d.facade) p.set('facade', s.facade);
  if (s.interior !== d.interior) p.set('interieur', s.interior);
  if (s.frame) p.set('menuiserie', s.frame.slice(1));
  if (s.wall) p.set('mur', s.wall.slice(1));
  if (s.accent) p.set('accent', s.accent.slice(1));
  if (s.season !== d.season) p.set('saison', s.season);
  if (s.hour !== d.hour) p.set('heure', String(s.hour));
  const hidden = LAYER_IDS.filter((id) => DEFAULT_LAYERS[id] && !s.layers[id]);
  const shown = LAYER_IDS.filter((id) => !DEFAULT_LAYERS[id] && s.layers[id]);
  if (hidden.length) p.set('masquer', hidden.join(','));
  if (shown.length) p.set('afficher', shown.join(','));
  return p;
}
