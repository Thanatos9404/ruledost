import type { Profile, SavedEntry, Ticket } from "./types";
export const DEFAULT_PROFILE: Readonly<Profile>;
export function entryKey(t: Pick<Ticket, "name" | "deadline">): string;
export function sortByDeadline<T extends Pick<Ticket, "deadline"> & { savedAt?: number }>(entries: T[], now?: number): T[];
export type Store = {
  readonly available: boolean;
  loadProfile(defaults?: Partial<Profile>): Profile;
  saveProfile(p: Profile): boolean;
  listSaved(): SavedEntry[];
  getSaved(id: string): SavedEntry | null;
  saveTicket(t: Ticket, done?: Record<string, boolean>, now?: number): { entry: SavedEntry; created: boolean; persisted: boolean };
  updateSaved(id: string, patch: Partial<SavedEntry>): SavedEntry | null;
  removeSaved(id: string): boolean;
};
export function createStore(backend: Pick<Storage, "getItem" | "setItem" | "removeItem">): Store;
export const BLOCKED_STORAGE: Pick<Storage, "getItem" | "setItem" | "removeItem">;
