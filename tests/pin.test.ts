import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS, PIN_SHA256, PinGuard, SESSION_TTL_MS, sha256Hex } from '@/features/auth/pin';
import type { KeyValueStore } from '@/lib/storage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('PinGuard', () => {
  let store: ReturnType<typeof memoryStore>;
  let now: number;
  let guard: PinGuard;

  beforeEach(() => {
    store = memoryStore();
    now = 1_700_000_000_000;
    guard = new PinGuard(store, () => now);
  });

  it('stores only the hash of 123456', async () => {
    expect(await sha256Hex('123456')).toBe(PIN_SHA256);
  });

  it('accepts the right code and opens a session', async () => {
    expect(await guard.verify('123456')).toEqual({ status: 'ok' });
    expect(guard.isAuthenticated()).toBe(true);
  });

  it('counts failed attempts and locks after three', async () => {
    expect(await guard.verify('000000')).toEqual({ status: 'wrong', remaining: 2 });
    expect(await guard.verify('111111')).toEqual({ status: 'wrong', remaining: 1 });
    expect(await guard.verify('222222')).toEqual({ status: 'locked' });
    expect(guard.isLocked()).toBe(true);
    expect(guard.failedAttempts()).toBe(MAX_ATTEMPTS);
  });

  it('refuses even the right code once locked', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) await guard.verify('999999');
    expect(await guard.verify('123456')).toEqual({ status: 'locked' });
    expect(guard.isAuthenticated()).toBe(false);
  });

  it('persists attempts in storage across instances', async () => {
    await guard.verify('000000');
    const other = new PinGuard(store, () => now);
    expect(other.remainingAttempts()).toBe(2);
  });

  it('resets the counter after a success', async () => {
    await guard.verify('000000');
    await guard.verify('123456');
    expect(guard.remainingAttempts()).toBe(MAX_ATTEMPTS);
  });

  it('does not consume an attempt on malformed input', async () => {
    expect(await guard.verify('12a')).toEqual({ status: 'invalid' });
    expect(guard.remainingAttempts()).toBe(MAX_ATTEMPTS);
  });

  it('expires the session', async () => {
    await guard.verify('123456');
    now += SESSION_TTL_MS + 1;
    expect(guard.isAuthenticated()).toBe(false);
  });

  it('ignores tampered storage values', () => {
    store.setItem('am:pin:attempts', '{"failed":"lots"}');
    store.setItem('am:pin:session', 'not json');
    expect(guard.remainingAttempts()).toBe(MAX_ATTEMPTS);
    expect(guard.isAuthenticated()).toBe(false);
  });

  it('logs out', async () => {
    await guard.verify('123456');
    guard.logout();
    expect(guard.isAuthenticated()).toBe(false);
  });
});
