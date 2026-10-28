import { describe, expect, it } from 'vitest';
import { crc32, createZip } from '@/lib/zip';

describe('crc32', () => {
  it('matches the reference value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('createZip', () => {
  it('writes a valid store-only archive', () => {
    const a = new TextEncoder().encode('hello');
    const b = new Uint8Array([1, 2, 3, 4]);
    const zip = createZip([
      { name: 'a.txt', data: a, date: new Date(2026, 9, 28) },
      { name: 'dossier/é.bin', data: b, date: new Date(2026, 9, 28) },
    ]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const centralOffset = view.getUint32(end + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    // Le contenu du premier fichier suit son en-tête local.
    expect(new TextDecoder().decode(zip.slice(30 + 5, 30 + 5 + 5))).toBe('hello');
  });
});
