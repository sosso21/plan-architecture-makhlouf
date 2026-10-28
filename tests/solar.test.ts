import { describe, expect, it } from 'vitest';
import { daylight, formatHour, SEASON_DAY, sunDirection, sunPosition } from '@/engine/environment/solar';

describe('sunPosition', () => {
  it('peaks due south at solar noon in summer around 76°', () => {
    const p = sunPosition(SEASON_DAY.ete, 12);
    expect(p.altitude).toBeGreaterThan(74);
    expect(p.altitude).toBeLessThan(78);
    expect(p.azimuth).toBeCloseTo(180, 0);
  });

  it('is low in winter at noon (~30°)', () => {
    const p = sunPosition(SEASON_DAY.hiver, 12);
    expect(p.altitude).toBeGreaterThan(28);
    expect(p.altitude).toBeLessThan(32);
  });

  it('rises in the east and sets in the west', () => {
    expect(sunPosition(SEASON_DAY.equinoxe, 8).azimuth).toBeLessThan(180);
    expect(sunPosition(SEASON_DAY.equinoxe, 16).azimuth).toBeGreaterThan(180);
  });

  it('maps south to +z and up to +y in world space', () => {
    const [x, y, z] = sunDirection({ altitude: 45, azimuth: 180 });
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(Math.SQRT1_2, 6);
    expect(z).toBeCloseTo(Math.SQRT1_2, 6);
  });
});

describe('helpers', () => {
  it('daylight is 0 at night and 1 at day', () => {
    expect(daylight(-20)).toBe(0);
    expect(daylight(30)).toBe(1);
  });

  it('formats hours', () => {
    expect(formatHour(7.5)).toBe('07h30');
    expect(formatHour(18)).toBe('18h');
  });
});
