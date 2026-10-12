// Storage: the student's details and saved tickets live in localStorage (this browser only).
// If storage is blocked (private mode, strict settings), we fall back to memory and say so.

const PROFILE_KEY = 'ruledost:v1:profile';
const SAVED_KEY = 'ruledost:v1:saved';

/** Same hackathon = same name (case-insensitive) and same deadline instant. */
export function entryKey(ticket) {
  return `${String(ticket.name || '').trim().toLowerCase()}|${ticket.deadline ? ticket.deadline.utc : 'none'}`;
}

/** Upcoming first (soonest first), then closed (most recent first), then no deadline. */
export function sortByDeadline(entries, now = Date.now()) {
  const rank = (e) => (!e.deadline ? 2 : e.deadline.utc >= now ? 0 : 1);
  return [...entries].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a.deadline.utc - b.deadline.utc;
    if (ra === 1) return b.deadline.utc - a.deadline.utc;
    return (b.savedAt || 0) - (a.savedAt || 0);
  });
}

let counter = 0;
const newId = () => `rd-${Date.now().toString(36)}-${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

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

    /** All saved entries (unsorted). */
    listSaved() {
      const list = read(SAVED_KEY);
      return Array.isArray(list) ? list : [];
    },
    getSaved(id) {
      return this.listSaved().find((e) => e.id === id) || null;
    },
    /**
     * Save a decoded ticket (never the raw pasted text). Saving the same hackathon again
     * updates it instead of duplicating. → { entry, created, persisted }
     */
    saveTicket(ticket, done = {}, now = Date.now()) {
      const list = this.listSaved();
      const key = entryKey(ticket);
      const idx = list.findIndex((e) => entryKey(e) === key);
      const { raw, ...clean } = ticket; // defensive: raw text is never stored
      void raw;
      let entry;
      if (idx >= 0) {
        entry = { ...list[idx], ...clean, id: list[idx].id, savedAt: list[idx].savedAt, done: { ...list[idx].done, ...done } };
        list[idx] = entry;
      } else {
        entry = { ...clean, id: newId(), savedAt: now, done: { ...done } };
        list.push(entry);
      }
      const persisted = write(SAVED_KEY, list);
      return { entry, created: idx < 0, persisted };
    },
    /** Shallow-merge changes into a saved entry (e.g. { done }, { name }). */
    updateSaved(id, patch) {
      const list = this.listSaved();
      const idx = list.findIndex((e) => e.id === id);
      if (idx < 0) return null;
      list[idx] = { ...list[idx], ...patch };
      write(SAVED_KEY, list);
      return list[idx];
    },
    removeSaved(id) {
      const list = this.listSaved();
      const next = list.filter((e) => e.id !== id);
      write(SAVED_KEY, next);
      return next.length !== list.length;
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
