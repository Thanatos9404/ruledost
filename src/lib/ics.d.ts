import type { Ticket } from "./types";
export function buildIcs(t: Pick<Ticket, "name" | "deadline">, opts?: { now?: number }): string | null;
export function slugify(name: string): string;
