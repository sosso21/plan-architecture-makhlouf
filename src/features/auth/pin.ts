/**
 * Verrou par code PIN de l'espace « projets ».
 *
 * ⚠️ Protection côté client uniquement : elle évite l'accès fortuit à la
 * liste et aux téléchargements, mais ne remplace pas une authentification
 * serveur (Cloudflare Access par exemple) pour des données confidentielles.
 * Le code n'est jamais stocké en clair : on compare son empreinte SHA-256.
 */
import { browserStore, readJson, remove, writeJson, type KeyValueStore } from '@/lib/storage';

/** SHA-256 de « 123456 ». Pour changer de code : `printf 'NOUVEAU' | sha256sum`. */
export const PIN_SHA256 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
export const PIN_LENGTH = 6;
export const MAX_ATTEMPTS = 3;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const ATTEMPTS_KEY = 'am:pin:attempts';
const SESSION_KEY = 'am:pin:session';

interface AttemptsRecord {
  readonly failed: number;
}
interface SessionRecord {
  readonly expiresAt: number;
}

const isAttempts = (v: unknown): v is AttemptsRecord =>
  typeof v === 'object' && v !== null && Number.isInteger((v as AttemptsRecord).failed) && (v as AttemptsRecord).failed >= 0;
const isSession = (v: unknown): v is SessionRecord =>
  typeof v === 'object' && v !== null && typeof (v as SessionRecord).expiresAt === 'number';

export type PinResult = { status: 'ok' } | { status: 'wrong'; remaining: number } | { status: 'locked' } | { status: 'invalid' };

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class PinGuard {
  constructor(
    private readonly store: KeyValueStore = browserStore(),
    private readonly now: () => number = Date.now,
    private readonly expectedHash: string = PIN_SHA256,
  ) {}

  failedAttempts(): number {
    return readJson(this.store, ATTEMPTS_KEY, isAttempts)?.failed ?? 0;
  }

  remainingAttempts(): number {
    return Math.max(0, MAX_ATTEMPTS - this.failedAttempts());
  }

  isLocked(): boolean {
    return this.remainingAttempts() === 0;
  }

  isAuthenticated(): boolean {
    const session = readJson(this.store, SESSION_KEY, isSession);
    if (!session) return false;
    if (session.expiresAt <= this.now()) {
      remove(this.store, SESSION_KEY);
      return false;
    }
    return true;
  }

  async verify(pin: string): Promise<PinResult> {
    if (this.isLocked()) return { status: 'locked' };
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return { status: 'invalid' };
    const hash = await sha256Hex(pin);
    if (timingSafeEqual(hash, this.expectedHash)) {
      writeJson(this.store, ATTEMPTS_KEY, { failed: 0 } satisfies AttemptsRecord);
      writeJson(this.store, SESSION_KEY, { expiresAt: this.now() + SESSION_TTL_MS } satisfies SessionRecord);
      return { status: 'ok' };
    }
    const failed = this.failedAttempts() + 1;
    writeJson(this.store, ATTEMPTS_KEY, { failed } satisfies AttemptsRecord);
    const remaining = Math.max(0, MAX_ATTEMPTS - failed);
    return remaining === 0 ? { status: 'locked' } : { status: 'wrong', remaining };
  }

  logout(): void {
    remove(this.store, SESSION_KEY);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Instance partagée par l'application. */
export const pinGuard = new PinGuard();
