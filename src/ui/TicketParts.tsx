import { motion } from "motion/react";
import { CalendarDays, Check, CheckCircle2, CircleHelp, Clock3, Globe2, Hourglass, MoonStar, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, cn } from "../kit";
import { EASE } from "../kit/lib/motion";
import { countdown, dateShift, formatPieces, isLateNight } from "../lib/time.js";
import { convertPrize, formatMoney } from "../lib/money.js";
import type { DateFact, KeyDate, Prize, Requirement, Status, Ticket, Verdict } from "../lib/types";
import { ReceiptToggle } from "./Receipt";

/* ---------- status ---------- */

export function StatusIcon({ status }: { status: Status }) {
  const common = { size: 20, strokeWidth: 1.7 } as const;
  if (status === "ok") return <CheckCircle2 {...common} className="text-pos" aria-label="Passes" />;
  if (status === "bad") return <XCircle {...common} className="text-neg" aria-label="Fails" />;
  return <CircleHelp {...common} className="text-muted" aria-label="Check" />;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const tone = verdict.badge === "ok" ? "pos" : verdict.badge === "bad" ? "neg" : "neutral";
  return (
    <Badge tone={tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {verdict.label}
    </Badge>
  );
}

/* ---------- deadline ---------- */

function Note({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 rounded-[14px] border border-hair bg-paper-2 px-3.5 py-3 text-[14px] leading-snug text-ink-2">
      <span className="mt-0.5 text-ink [&>svg]:size-4 [&>svg]:stroke-[1.7]">{icon}</span>
      <span>
        <span className="font-semibold text-ink">{title} </span>
        {children}
      </span>
    </li>
  );
}

/** Big local deadline, the page's wording, live countdown, warnings and receipt. */
export function DeadlineBlock({ deadline, timeZone, now, compact }: { deadline: DateFact | null; timeZone: string; now: number; compact?: boolean }) {
  if (!deadline) {
    return (
      <div>
        <p className="t-eyebrow">Your deadline</p>
        <p className="t-num mt-3 text-[30px] leading-tight text-muted">No deadline found</p>
        <p className="mt-2 text-[14px] text-ink-2">Search the rules for "Submission Period" or "Deadline". Everything else below still applies.</p>
      </div>
    );
  }
  const p = formatPieces(deadline.utc, timeZone);
  const cd = countdown(deadline.utc, now);
  const shift = dateShift(deadline.utc, deadline.parts, timeZone);
  const late = isLateNight(deadline.utc, timeZone);
  return (
    <div>
      <p className="t-eyebrow">Your deadline</p>
      <p className={cn("t-num mt-3 leading-[1.02] text-ink", compact ? "text-[30px]" : "text-[clamp(34px,4vw,46px)]")}>{p.date}</p>
      <p className={cn("t-num mt-1.5 text-ink", compact ? "text-[20px]" : "text-[26px]")}>
        {p.time} <span className="text-muted">{p.zone}</span>
      </p>
      <p className="mt-3 text-[14px] text-muted">
        Page says: <span className="text-ink-2">{deadline.stated}</span>
      </p>
      <p
        className={cn(
          "mt-4 inline-flex items-center gap-2 rounded-full border border-hair px-3 py-1.5 font-mono text-[13px] tabular-nums",
          cd.past ? "bg-paper-3 text-muted" : "bg-surface text-ink",
        )}
      >
        <Hourglass size={14} strokeWidth={1.7} aria-hidden />
        {cd.past ? cd.label : `${cd.label} left`}
      </p>
      {(shift.shifted || late || deadline.zoneAssumed || deadline.timeAssumed) && (
        <ul className="mt-4 space-y-2">
          {shift.shifted && (
            <Note icon={<CalendarDays />} title="Date shift:">
              the page says {shift.statedDate}, but for you it's {shift.localDate}.
            </Note>
          )}
          {late && (
            <Note icon={<MoonStar />} title="Late-night deadline:">
              {p.time} your time. Plan to submit the evening before.
            </Note>
          )}
          {deadline.zoneAssumed && (
            <Note icon={<Globe2 />} title="Time zone not stated:">
              assumed UTC. Double-check the rules.
            </Note>
          )}
          {deadline.timeAssumed && (
            <Note icon={<Clock3 />} title="No time stated:">
              assumed 11:59 PM on that date.
            </Note>
          )}
        </ul>
      )}
      <ReceiptToggle receipts={[deadline.receipt]} />
    </div>
  );
}

/* ---------- key dates ---------- */

function when(f: DateFact, tz: string) {
  const p = formatPieces(f.utc, tz);
  return f.timeAssumed ? `${p.date} (no time stated)` : `${p.date}, ${p.time} ${p.zone}`;
}

export function KeyDatesList({ keyDates, timeZone }: { keyDates: KeyDate[]; timeZone: string }) {
  if (!keyDates.length) return <p className="text-[14px] text-muted">No other dates found.</p>;
  return (
    <ul className="divide-y divide-[var(--hair)]">
      {keyDates.map((k) => (
        <li key={k.label} className="py-3 first:pt-0 last:pb-0">
          <p className="font-display text-[14.5px] font-semibold text-ink">{k.label}</p>
          <p className="mt-0.5 text-[13.5px] tabular-nums text-ink-2">
            {k.to ? `${when(k.from, timeZone)} → ${when(k.to, timeZone)}` : when(k.from, timeZone)}
          </p>
          <ReceiptToggle receipts={[k.from.receipt]} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- eligibility ---------- */

export function EligibilityRows({ verdict, defaultOpenId }: { verdict: Verdict; defaultOpenId?: string }) {
  return (
    <ul className="divide-y divide-[var(--hair)]">
      {verdict.rows.map((r) => (
        <li key={r.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
          <span className="mt-0.5 shrink-0">
            <StatusIcon status={r.status} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold text-ink">{r.title}</p>
            <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{r.detail}</p>
            <ReceiptToggle receipts={[r.receipt]} defaultOpen={r.id === defaultOpenId} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- checklist ---------- */

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress">
      <motion.div className="h-full rounded-full bg-ink" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: EASE }} />
    </div>
  );
}

function CheckRow({ req, checked, onToggle }: { req: Requirement; checked: boolean; onToggle?: (on: boolean) => void }) {
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <label className="relative mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle?.(e.target.checked)}
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border border-[var(--hair-strong)] bg-surface transition-colors checked:border-ink checked:bg-ink hover:border-ink"
          aria-label={req.title}
        />
        <Check size={13} strokeWidth={2.4} className="pointer-events-none absolute text-paper opacity-0 transition-opacity peer-checked:opacity-100" />
      </label>
      <div className="min-w-0 flex-1">
        <p className={cn("font-display text-[15px] font-semibold transition-colors", checked ? "text-muted line-through decoration-[var(--hair-strong)]" : "text-ink")}>{req.title}</p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{req.detail}</p>
        <ReceiptToggle receipts={req.receipts} />
      </div>
    </li>
  );
}

/** Tickable submission checklist plus the remaining "must" lines. */
export function ChecklistRows({
  ticket,
  done,
  onToggle,
  limit,
  showOthers = true,
}: {
  ticket: Ticket;
  done: Record<string, boolean>;
  onToggle?: (id: string, on: boolean) => void;
  limit?: number;
  showOthers?: boolean;
}) {
  const reqs = limit ? ticket.requirements.slice(0, limit) : ticket.requirements;
  if (!ticket.requirements.length) {
    return <p className="text-[14px] text-ink-2">No standard submission requirements recognised. Check the "must" lines below and the rules' Requirements section.</p>;
  }
  return (
    <>
      <ul className="divide-y divide-[var(--hair)]">
        {reqs.map((r) => (
          <CheckRow key={r.id} req={r} checked={Boolean(done[r.id])} onToggle={(on) => onToggle?.(r.id, on)} />
        ))}
      </ul>
      {showOthers && ticket.otherMusts.length > 0 && (
        <details className="group mt-5 rounded-[14px] border border-hair bg-paper-2 px-4 py-3">
          <summary className="cursor-pointer list-none font-display text-[14px] font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            Other "must" lines from the rules ({ticket.otherMusts.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {ticket.otherMusts.map((o, i) => (
              <li key={i} className="text-[14px] leading-snug text-ink-2">
                {o.text}
                <ReceiptToggle receipts={[o.receipt]} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

/* ---------- prize ---------- */

export function PrizeBlock({ prize, inrPerUsd }: { prize: Prize | null; inrPerUsd: number }) {
  if (!prize) return <p className="text-[14px] text-muted">No prize amount found in the pasted text.</p>;
  const other = convertPrize(prize, inrPerUsd);
  return (
    <div>
      <p className="t-eyebrow">{prize.kind === "pool" ? "Prize pool" : "Top prize"}</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="t-num text-[34px] leading-none text-ink">
          {formatMoney(prize.amount, prize.currency)}
          {prize.plus ? "+" : ""}
        </span>
        <span className="t-num text-[20px] text-ink-2">≈ {formatMoney(other.amount, other.currency)}</span>
      </p>
      <p className="mt-2 text-[13px] text-muted">
        At ₹{inrPerUsd} per US$.{prize.kind === "top" ? " Paste the Overview page too to see the whole pool." : ""}
      </p>
      <ReceiptToggle receipts={[prize.receipt]} />
    </div>
  );
}
