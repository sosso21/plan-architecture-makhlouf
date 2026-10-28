/**
 * Accès au stockage navigateur tolérant aux pannes (navigation privée,
 * stockage bloqué) : toute erreur est absorbée et l'appelant reçoit `null`.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const memoryStore: KeyValueStore = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

export function browserStore(): KeyValueStore {
  try {
    const s = globalThis.localStorage;
    const probe = '__am_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStore;
  }
}

export function readJson<T>(store: KeyValueStore, key: string, guard: (v: unknown) => v is T): T | null {
  try {
    const raw = store.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou indisponible : l'état reste en mémoire pour la session */
  }
}

export function remove(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* idem */
  }
}
