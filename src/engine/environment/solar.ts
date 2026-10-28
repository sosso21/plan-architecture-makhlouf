/**
 * Position apparente du soleil (formules simplifiées, précision ~1°) —
 * suffisante pour une étude d'ensoleillement d'esquisse.
 */

export type Season = 'hiver' | 'equinoxe' | 'ete';

export const SEASON_DAY: Record<Season, number> = { hiver: 355, equinoxe: 80, ete: 172 };
export const SEASON_LABEL: Record<Season, string> = { hiver: 'Hiver · 21 déc.', equinoxe: 'Équinoxe · 21 mars', ete: 'Été · 21 juin' };

/** Latitude approximative d'Oued Ksari (Kabylie). */
export const SITE_LATITUDE = 36.7;

export interface SunPosition {
  /** Hauteur au-dessus de l'horizon, en degrés. */
  readonly altitude: number;
  /** Azimut depuis le nord, sens horaire, en degrés. */
  readonly azimuth: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** `hour` en heure solaire vraie (12 = midi solaire). */
export function sunPosition(dayOfYear: number, hour: number, latitude = SITE_LATITUDE): SunPosition {
  const decl = rad(23.44) * Math.sin(rad((360 / 365) * (284 + dayOfYear)));
  const lat = rad(latitude);
  const h = rad(15 * (hour - 12));
  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let az = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (h > 0) az = 360 - az;
  return { altitude: deg(alt), azimuth: az };
}

/**
 * Vecteur unitaire vers le soleil dans le repère monde (x = est, y = haut,
 * -z = nord du plan).
 */
export function sunDirection(p: SunPosition): [number, number, number] {
  const alt = rad(p.altitude);
  const az = rad(p.azimuth);
  return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
}

/** 1 en plein jour, 0 la nuit, transition douce autour de l'horizon. */
export function daylight(altitudeDeg: number): number {
  const t = Math.max(0, Math.min(1, (altitudeDeg + 5) / 13));
  return t * t * (3 - 2 * t);
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}h${m === 0 ? '' : m.toString().padStart(2, '0')}`;
}
