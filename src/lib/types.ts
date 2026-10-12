// Shared shapes produced by the decoder (plain JS modules in this folder).
// The .d.ts files next to each .js module use these so the React app is typed.

export type Receipt = { quote: string; mark: [number, number] | null };

export type Zone = { offset?: number; iana?: string; label: string };

export type Parts = { y: number; m: number; d: number; hh: number; mm: number };

export type DateFact = {
  label: string;
  utc: number;
  stated: string;
  zone: string | null;
  zoneAssumed: boolean;
  timeAssumed: boolean;
  yearAssumed: boolean;
  parts: Parts;
  receipt: Receipt;
};

export type KeyDate = { label: string; from: DateFact; to: DateFact | null; receipt: Receipt };

export type Eligibility = {
  minAge: { value: number; note: string; receipt: Receipt } | null;
  excluded: { receipt: Receipt } | null;
  restrictedTo: { receipt: Receipt } | null;
  conditions: { text: string; receipt: Receipt }[];
  overviewNote: { receipt: Receipt } | null;
};

export type Requirement = { id: string; title: string; detail: string; receipts: Receipt[] };

export type Prize = { kind: "pool" | "top"; amount: number; currency: "USD" | "INR"; plus: boolean; receipt: Receipt };

export type Ticket = {
  v: 1;
  name: string;
  deadline: DateFact | null;
  keyDates: KeyDate[];
  eligibility: Eligibility;
  requirements: Requirement[];
  otherMusts: { text: string; receipt: Receipt }[];
  prize: Prize | null;
  found: number;
};

export type Profile = { country: string; age: number | null; timeZone: string; inrPerUsd: number };

export type SavedEntry = Ticket & { id: string; savedAt: number; done: Record<string, boolean> };

export type Status = "ok" | "check" | "bad";

export type VerdictRow = { id: string; status: Status; title: string; detail: string; receipt: Receipt | null };

export type Verdict = { badge: Status; label: string; rows: VerdictRow[] };
