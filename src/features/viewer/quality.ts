import type { Quality } from '@/engine/types';

export type QualityChoice = Quality | 'auto';

/** Estimation prudente des capacités de l'appareil. */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'balanced';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (memory <= 2 || cores <= 2) return 'low';
  if (coarse || small || memory <= 4) return 'balanced';
  return 'high';
}

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export const QUALITY_LABELS: Record<QualityChoice, string> = {
  auto: 'Auto',
  high: 'Haute',
  balanced: 'Équilibrée',
  low: 'Économie',
};
