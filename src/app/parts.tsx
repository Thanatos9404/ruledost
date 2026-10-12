import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../kit";
import { EASE, SPRING_SNAPPY } from "../kit/lib/motion";
import { COUNTRIES } from "../lib/countries.js";
import { COMMON_ZONES } from "../lib/time.js";
import type { Profile } from "../lib/types";

/**
 * Controlled version of the kit's SearchPill (the kit one has no value/onChange).
 * Same size, border, shadow and focus treatment.
 */
export function SearchField({ value, onChange, placeholder = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="hidden h-10 w-[260px] items-center gap-2 rounded-full border border-hair bg-surface px-4 text-[14px] text-muted shadow-[var(--shadow-soft)] focus-within:border-[var(--hair-strong)] lg:flex">
      <Search size={16} strokeWidth={1.7} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-muted hover:text-ink">
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
    </label>
  );
}

/** The kit's AppShell hides its sidebar below md; this is the mobile counterpart. */
export function MobileTabBar({
  items,
  active,
  onNavigate,
}: {
  items: { id: string; label: string; icon: ReactNode; badge?: string }[];
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="App sections" className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <LayoutGroup id="mobile-tabs">
        <ul className="glass mx-auto flex max-w-[420px] items-center justify-between rounded-full p-1.5 shadow-[var(--shadow-lift)]">
          {items.map((it) => {
            const on = it.id === active;
            return (
              <li key={it.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onNavigate(it.id)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex w-full flex-col items-center gap-0.5 rounded-full px-2 py-2 font-display text-[12px] font-semibold transition-colors",
                    on ? "text-paper" : "text-ink-2",
                  )}
                >
                  {on && <motion.span layoutId="mobile-pill" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-ink" />}
                  <span className="relative [&>svg]:size-[18px] [&>svg]:stroke-[1.7]">{it.icon}</span>
                  <span className="relative">
                    {it.label}
                    {it.badge ? ` · ${it.badge}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
      <AnimatePresence>
        {message && (
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-full bg-ink px-4 py-2.5 font-display text-[14px] font-semibold text-paper shadow-[var(--shadow-lift)]"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  "h-10 w-full min-w-0 rounded-[12px] border border-hair bg-paper px-3 text-[14.5px] text-ink outline-none transition-colors placeholder:text-muted hover:border-[var(--hair-strong)] focus:border-ink";

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="t-eyebrow !text-[11px]">{label}</span>
      {children}
    </label>
  );
}

/** Country, age, time zone and rupee rate. Saved in this browser only. */
export function DetailsForm({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const zones = COMMON_ZONES.includes(profile.timeZone) ? COMMON_ZONES : [profile.timeZone, ...COMMON_ZONES];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_0.7fr]">
      <Field label="Country">
        <input
          className={inputCls}
          list="rd-countries"
          value={profile.country}
          autoComplete="off"
          onChange={(e) => onChange({ ...profile, country: e.target.value })}
        />
        <datalist id="rd-countries">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Age">
        <input
          className={inputCls}
          type="number"
          inputMode="numeric"
          min={5}
          max={120}
          placeholder="e.g. 20"
          value={profile.age ?? ""}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ ...profile, age: Number.isFinite(n) && n > 0 ? n : null });
          }}
        />
      </Field>
      <Field label="Time zone">
        <select className={inputCls} value={profile.timeZone} onChange={(e) => onChange({ ...profile, timeZone: e.target.value })}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="₹ per US$">
        <input
          className={inputCls}
          type="number"
          inputMode="decimal"
          min={1}
          step={0.01}
          value={profile.inrPerUsd}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange({ ...profile, inrPerUsd: Number.isFinite(n) && n > 0 ? n : 88 });
          }}
        />
      </Field>
    </div>
  );
}

/** Small decorative ticket used in empty states (pure SVG, no imagery). */
export function TicketArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 96" className={className} aria-hidden>
      <path d="M12 8h136a6 6 0 0 1 6 6v20a14 14 0 0 0 0 28v20a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V62a14 14 0 0 0 0-28V14a6 6 0 0 1 6-6z" fill="var(--surface)" stroke="var(--hair-strong)" />
      <path d="M112 12v72" stroke="var(--hair-strong)" strokeDasharray="4 4" />
      <rect x="22" y="24" width="64" height="8" rx="4" fill="var(--paper-3)" />
      <rect x="22" y="40" width="44" height="14" rx="5" fill="var(--ink)" />
      <rect x="22" y="62" width="74" height="6" rx="3" fill="var(--paper-3)" />
      <path d="M124 48l6 6 12-14" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
