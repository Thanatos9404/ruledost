// Storage: the student's details and saved tickets live in localStorage (this browser only).
// If storage is blocked (private mode, strict settings), we fall back to memory and say so.

const PROFILE_KEY = 'ruledost:v1:profile';

export const DEFAULT_PROFILE = Object.freeze({ country: 'India', age: null, timeZone: 'Asia/Kolkata', inrPerUsd: 88 });

/** Create a store over a Storage-like object (window.localStorage in the browser). */
export function createStore(backend) {
  const memory = new Map();
  let available = true;
  try {
    const probe = '__ruledost_probe__';
    backend.setItem(probe, '1');
    backend.removeItem(probe);
  } catch {
    available = false;
  }

  function read(key) {
    try {
      const raw = available ? backend.getItem(key) : memory.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function write(key, value) {
    const raw = JSON.stringify(value);
    if (available) {
      try {
        backend.setItem(key, raw);
        return true;
      } catch {
        available = false;
      }
    }
    memory.set(key, raw);
    return false;
  }

  return {
    get available() { return available; },

    loadProfile(defaults = {}) {
      const saved = read(PROFILE_KEY) || {};
      return { ...DEFAULT_PROFILE, ...defaults, ...saved };
    },
    saveProfile(profile) {
      return write(PROFILE_KEY, profile);
    },
  };
}

/** A Storage-like object that always throws: used in tests to simulate blocked storage. */
export const BLOCKED_STORAGE = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

/** A simple in-memory Storage-like object (tests). */
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
