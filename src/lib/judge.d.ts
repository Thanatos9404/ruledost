import type { Eligibility, Profile, Verdict } from "./types";
export function judge(elig: Eligibility, profile: Pick<Profile, "country" | "age">): Verdict;
