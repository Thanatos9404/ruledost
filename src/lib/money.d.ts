import type { Prize } from "./types";
export function formatMoney(amount: number, currency: "USD" | "INR"): string;
export function convertPrize(prize: Pick<Prize, "amount" | "currency">, inrPerUsd: number): { amount: number; currency: "USD" | "INR" };
