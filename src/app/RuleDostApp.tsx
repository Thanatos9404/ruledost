import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  FlaskConical,
  Hourglass,
  Home,
  ListChecks,
  PencilLine,
  ScanText,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppShell, Button, IconButton, Panel, Segmented, StatTile, Wordmark, cn } from "../kit";
import { decodeRules } from "../lib/extract.js";
import { judge } from "../lib/judge.js";
import { BLOCKED_STORAGE, createStore, sortByDeadline, type Store } from "../lib/store.js";
import { buildIcs, slugify } from "../lib/ics.js";
import { countdown, dateShift, detectTimeZone, formatPieces, isLateNight, isValidTimeZone } from "../lib/time.js";
import type { Profile, SavedEntry, Ticket } from "../lib/types";
import { SAMPLES } from "../samples.js";
import { ChecklistRows, DeadlineBlock, EligibilityRows, KeyDatesList, PrizeBlock, Progress, VerdictBadge } from "../ui/TicketParts";
import { useNow } from "../ui/useNow";
import { DetailsForm, MobileTabBar, SearchField, TicketArt, Toast } from "./parts";

type View = "decode" | "saved" | "detail";

function parseRoute(hash: string): { view: View; id?: string; sample?: string } {
  const s = /^#sample=([\w-]+)/.exec(hash);
  if (s) return { view: "decode", sample: s[1] };
  const d = /^#app\/saved\/(.+)$/.exec(hash);
  if (d) return { view: "detail", id: decodeURIComponent(d[1]) };
  if (hash.startsWith("#app/saved")) return { view: "saved" };
  return { view: "decode" };
}

function openStore(): Store {
  let backend: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  try {
    backend = window.localStorage;
  } catch {
    backend = BLOCKED_STORAGE;
  }
  return createStore(backend);
}

const go = (hash: string) => {
  window.location.hash = hash;
};

function shortLeft(target: number, now: number) {
  const cd = countdown(target, now);
  if (cd.past) return "Closed";
  return cd.days > 0 ? `${cd.days}d ${cd.hours}h` : `${cd.hours}h ${cd.minutes}m`;
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RuleDostApp({ hash }: { hash: string }) {
  const store = useMemo(openStore, []);
  const [profile, setProfileState] = useState<Profile>(() => {
    const p = store.loadProfile({ timeZone: detectTimeZone() });
    return isValidTimeZone(p.timeZone) ? p : { ...p, timeZone: detectTimeZone() };
  });
  const [saved, setSaved] = useState<SavedEntry[]>(() => store.listSaved());
  const [rules, setRules] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "closed" | "all">("upcoming");
  const toastTimer = useRef<number | undefined>(undefined);
  const now = useNow(1000);
  const route = parseRoute(hash);

  const refresh = () => setSaved(store.listSaved());
  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  const setProfile = (p: Profile) => {
    setProfileState(p);
    store.saveProfile(p);
  };

  const decodeText = useCallback((text: string) => {
    if (!text.trim()) {
      setError("Paste the rules text first.");
      return;
    }
    const t = decodeRules(text, { now: Date.now() });
    if (!t.found) {
      setError("This doesn't look like a hackathon rules page: no dates or requirements found. Copy the Rules tab, not just the Overview.");
      return;
    }
    setError(null);
    setTicket(t);
    setDone({});
    setSavedId(null);
    if (window.innerWidth < 1024) {
      window.requestAnimationFrame(() => document.getElementById("ticket")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  const loadSample = useCallback(
    (id: string) => {
      const s = SAMPLES.find((x) => x.id === id);
      if (!s) return;
      setRules(s.text);
      decodeText(s.text);
    },
    [decodeText],
  );

  // Deep link: #sample=monsoon opens the app with that sample decoded.
  useEffect(() => {
    if (!route.sample) return;
    loadSample(route.sample);
    window.history.replaceState(null, "", "#app");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [route.sample, loadSample]);

  const save = () => {
    if (!ticket) return;
    const r = store.saveTicket(ticket, done);
    setSavedId(r.entry.id);
    setDone({ ...r.entry.done });
    refresh();
    flash(!r.persisted ? "Couldn't save for later: this browser is blocking storage." : r.created ? "Saved to My hackathons" : "Updated in My hackathons");
  };

  const toCalendar = (t: Pick<Ticket, "name" | "deadline">) => {
    const ics = buildIcs(t, { now: Date.now() });
    if (!ics) return flash("No deadline found, so there's nothing to add to a calendar.");
    download(`${slugify(t.name)}-deadline.ics`, ics);
    flash("Calendar file downloaded, with reminders 1 day and 3 hours before.");
  };

  const remove = (e: SavedEntry) => {
    if (!window.confirm(`Remove "${e.name}" from My hackathons?`)) return;
    store.removeSaved(e.id);
    if (savedId === e.id) setSavedId(null);
    refresh();
    flash("Removed");
    if (route.view === "detail") go("#app/saved");
  };

  const navigate = (id: string) => {
    if (id.startsWith("sample:")) {
      loadSample(id.slice(7));
      go("#app");
    } else if (id === "home") go("");
    else go(id === "saved" ? "#app/saved" : "#app");
  };

  const active = route.view === "detail" ? "saved" : route.view;
  const zoneLabel = formatPieces(now, profile.timeZone).zone;
  const entry = route.view === "detail" ? saved.find((e) => e.id === route.id) ?? null : null;

  let greeting: ReactNode = "Namaste";
  let subtitle: ReactNode = "Paste a rules page. Nothing you paste leaves this browser.";
  let actions: ReactNode = null;
  let content: ReactNode = null;

  if (route.view === "decode") {
    actions = (
      <>
        <IconButton label="Back to the RuleDost site" onClick={() => go("")}>
          <Home />
        </IconButton>
        {ticket ? (
          <Button size="sm" onClick={save}>
            {savedId ? (<><span className="sm:hidden">Update</span><span className="hidden sm:inline">Saved · update</span></>) : (<><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save to My hackathons</span></>)}
          </Button>
        ) : (
          <Button size="sm" onClick={() => loadSample("monsoon")}>
            Try a sample
          </Button>
        )}
      </>
    );
    content = (
      <DecodeView
        {...{ profile, setProfile, rules, setRules, ticket, done, error, now, savedId }}
        onDecode={() => decodeText(rules)}
        onSample={loadSample}
        onToggle={(id, on) => {
          const next = { ...done, [id]: on };
          setDone(next);
          if (savedId) {
            store.updateSaved(savedId, { done: next });
            refresh();
          }
        }}
        onRename={(name) => {
          setTicket((t) => (t ? { ...t, name } : t));
          if (savedId) {
            store.updateSaved(savedId, { name });
            refresh();
          }
        }}
        onCalendar={() => ticket && toCalendar(ticket)}
      />
    );
  } else if (route.view === "saved") {
    greeting = "My hackathons";
    subtitle = `Sorted by your real deadline · times in ${zoneLabel}`;
    actions = (
      <>
        <SearchField value={query} onChange={setQuery} placeholder="Search saved hackathons" />
        <IconButton label="Back to the RuleDost site" onClick={() => go("")}>
          <Home />
        </IconButton>
        <Button size="sm" onClick={() => go("#app")}>
          <span className="sm:hidden">New</span><span className="hidden sm:inline">Decode new rules</span>
        </Button>
      </>
    );
    content = (
      <SavedView
        {...{ saved, profile, now, query, setQuery, filter, setFilter }}
        onOpen={(id) => go(`#app/saved/${encodeURIComponent(id)}`)}
        onCalendar={toCalendar}
        onRemove={remove}
      />
    );
  } else {
    greeting = entry ? entry.name : "Not found";
    subtitle = entry ? "Saved hackathon · ticks are saved as you go" : "This hackathon isn't saved in this browser.";
    actions = (
      <>
        <IconButton label="Back to the RuleDost site" onClick={() => go("")}>
          <Home />
        </IconButton>
        {entry && (
          <Button size="sm" onClick={() => toCalendar(entry)} icon={<CalendarPlus size={15} strokeWidth={1.8} />}>
            <span className="sm:hidden">.ics</span><span className="hidden sm:inline">Add to calendar</span>
          </Button>
        )}
      </>
    );
    content = (
      <div>
        <Button variant="ghost" size="sm" onClick={() => go("#app/saved")} className="-ml-2 mb-4">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft size={15} strokeWidth={1.8} /> All hackathons
          </span>
        </Button>
        {entry ? (
          <TicketPanels
            ticket={entry}
            profile={profile}
            now={now}
            done={entry.done || {}}
            onToggle={(id, on) => {
              const next = { ...(entry.done || {}), [id]: on };
              store.updateSaved(entry.id, { done: next });
              if (savedId === entry.id) setDone(next);
              refresh();
            }}
            onRename={(name) => {
              store.updateSaved(entry.id, { name });
              refresh();
            }}
            footer={
              <>
                <Button variant="ghost" size="sm" className="text-neg" onClick={() => remove(entry)} icon={<Trash2 size={15} strokeWidth={1.8} />}>
                  Remove
                </Button>
              </>
            }
          />
        ) : (
          <EmptyCard title="Not in My hackathons" body="It may have been removed, or saved in a different browser. Saved hackathons live in this browser only.">
            <Button size="sm" onClick={() => go("#app/saved")}>
              Back to My hackathons
            </Button>
          </EmptyCard>
        )}
      </div>
    );
  }

  const navItems = [
    { id: "decode", label: "Decode", icon: <ScanText /> },
    { id: "saved", label: "My hackathons", icon: <Bookmark />, badge: saved.length ? String(saved.length) : undefined },
  ];

  return (
    <>
      <AppShell
        brand={<Wordmark name="RULE" suffix="dost" />}
        nav={[
          { items: navItems },
          { section: "Fictional samples", items: SAMPLES.map((s) => ({ id: `sample:${s.id}`, label: s.title.replace(/ 2026$/, ""), icon: <FlaskConical /> })) },
        ]}
        active={active}
        onNavigate={navigate}
        greeting={greeting}
        subtitle={subtitle}
        actions={actions}
        footer={
          <p className="px-3 text-[12.5px] leading-relaxed text-muted">
            Runs entirely in your browser. Nothing you paste is sent anywhere. Evidence, not legal advice: read the receipts.
          </p>
        }
      >
        <h1 className="sr-only">
          RuleDost: {route.view === "decode" ? "decode a rules page" : route.view === "saved" ? "my hackathons" : entry ? entry.name : "saved hackathon"}
        </h1>
        {content}
        <div className="h-24 md:hidden" aria-hidden />
      </AppShell>
      <MobileTabBar items={[navItems[0], { ...navItems[1], label: "Saved" }, { id: "home", label: "Site", icon: <Home /> }]} active={active} onNavigate={navigate} />
      <Toast message={toast} />
    </>
  );
}

/* ---------------- Decode ---------------- */

function DecodeView(props: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  rules: string;
  setRules: (s: string) => void;
  ticket: Ticket | null;
  done: Record<string, boolean>;
  error: string | null;
  now: number;
  savedId: string | null;
  onDecode: () => void;
  onSample: (id: string) => void;
  onToggle: (id: string, on: boolean) => void;
  onRename: (name: string) => void;
  onCalendar: () => void;
}) {
  const { profile, setProfile, rules, setRules, ticket, done, error, now, onDecode, onSample } = props;
  const tz = profile.timeZone;
  const dl = ticket?.deadline ?? null;
  const pieces = dl ? formatPieces(dl.utc, tz) : null;
  const verdict = ticket ? judge(ticket.eligibility, profile) : null;
  const total = ticket?.requirements.length ?? 0;
  const ticked = ticket ? ticket.requirements.filter((r) => done[r.id]).length : 0;
  const passes = verdict ? verdict.rows.filter((r) => r.status === "ok").length : 0;

  return (
    <>
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={<CalendarClock />}
          label="Your deadline"
          value={pieces ? pieces.time : "—"}
          delta={dl && dateShift(dl.utc, dl.parts, tz).shifted ? "date shifts" : undefined}
          tone="neg"
          hint={pieces ? `${pieces.date} · ${pieces.zone}` : "Paste rules to see it"}
        />
        <StatTile
          icon={<Hourglass />}
          label="Time left"
          value={dl ? shortLeft(dl.utc, now) : "—"}
          delta={dl && isLateNight(dl.utc, tz) ? "late night" : undefined}
          tone="neg"
          hint="until submissions close"
        />
        <StatTile
          icon={<ShieldCheck />}
          label="Can you enter?"
          value={verdict ? (verdict.badge === "ok" ? "Yes" : verdict.badge === "bad" ? "No" : "Check") : "—"}
          delta={verdict ? `${passes}/${verdict.rows.length} pass` : undefined}
          tone={verdict?.badge === "ok" ? "pos" : verdict?.badge === "bad" ? "neg" : "neutral"}
          hint="against your age and country"
        />
        <StatTile
          icon={<ListChecks />}
          label="Checklist"
          value={ticket ? `${ticked}/${total}` : "—"}
          delta={ticket && total ? `${Math.round((ticked / total) * 100)}%` : undefined}
          hint="requirements ticked off"
        />
      </div>

      <div className="grid gap-4 sm:mt-4 lg:grid-cols-12">
        <div className="space-y-4 lg:sticky lg:top-[88px] lg:col-span-5 lg:self-start">
          <Panel title="Paste the rules" description="Open the hackathon's Rules page, press Ctrl+A then Ctrl+C, and paste it here.">
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onDecode();
                }
              }}
              spellCheck={false}
              aria-label="Rules text"
              placeholder={"Deadline: Oct 26, 2026 @ 5:00pm EDT\n…\nThe Hackathon IS NOT open to: …"}
              className="h-56 w-full resize-y rounded-[14px] border border-hair bg-paper px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none transition-colors placeholder:text-muted hover:border-[var(--hair-strong)] focus:border-ink"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={onDecode} icon={<ArrowRight size={16} strokeWidth={1.8} />}>
                Decode rules
              </Button>
              <span className="hidden font-mono text-[11.5px] text-muted sm:inline">or Ctrl + Enter</span>
              {rules && (
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRules("")}>
                  Clear
                </Button>
              )}
            </div>
            {error && (
              <div role="alert" className="mt-4 flex gap-2.5 rounded-[14px] border border-[color-mix(in_oklab,var(--neg)_25%,transparent)] bg-[color-mix(in_oklab,var(--neg)_6%,transparent)] px-3.5 py-3 text-[14px] text-ink-2">
                <AlertCircle size={17} strokeWidth={1.8} className="mt-0.5 shrink-0 text-neg" />
                <span>
                  {error}{" "}
                  <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => onSample("monsoon")}>
                    Try a sample instead
                  </button>
                </span>
              </div>
            )}
            <div className="mt-5 border-t border-hair pt-4">
              <p className="t-eyebrow !text-[11px]">Or try a fictional sample</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSample(s.id)}
                    className="rounded-full border border-hair bg-surface px-3.5 py-2 text-left text-[13px] text-ink-2 shadow-[var(--shadow-soft)] transition hover:-translate-y-px hover:text-ink active:translate-y-0"
                  >
                    <span className="font-display font-semibold text-ink">{s.title}</span>
                    <span className="block text-[12px] text-muted">{s.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Your details" description="Used for the eligibility check and your clock. Saved in this browser only.">
            <DetailsForm profile={profile} onChange={setProfile} />
          </Panel>
        </div>

        <div id="ticket" className="min-w-0 scroll-mt-24 lg:col-span-7">
          {ticket ? (
            <TicketPanels
              ticket={ticket}
              profile={profile}
              now={now}
              done={done}
              onToggle={props.onToggle}
              onRename={props.onRename}
              footer={
                <Button variant="ghost" size="sm" className="border border-hair bg-surface" onClick={props.onCalendar} disabled={!ticket.deadline} icon={<CalendarPlus size={15} strokeWidth={1.8} />}>
                  Add to calendar (.ics)
                </Button>
              }
            />
          ) : (
            <EmptyCard
              title="Your decoded rules appear here"
              body="Paste a rules page (or pick a sample) and you'll get your real deadline, an eligibility check, and a submission checklist. Each answer comes with a receipt: the sentence it came from."
            >
              <Button size="sm" onClick={() => onSample("monsoon")} icon={<ArrowRight size={15} strokeWidth={1.8} />}>
                Try the Monsoon sample
              </Button>
            </EmptyCard>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Ticket ---------------- */

function TicketPanels({
  ticket,
  profile,
  now,
  done,
  onToggle,
  onRename,
  footer,
}: {
  ticket: Ticket;
  profile: Profile;
  now: number;
  done: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
  onRename: (name: string) => void;
  footer?: ReactNode;
}) {
  const verdict = judge(ticket.eligibility, profile);
  const total = ticket.requirements.length;
  const ticked = ticket.requirements.filter((r) => done[r.id]).length;
  return (
    <div className="space-y-4">
      <Panel>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <NameEditor name={ticket.name} onRename={onRename} />
          <span className="shrink-0 pt-1">
            <VerdictBadge verdict={verdict} />
          </span>
        </div>
        <DeadlineBlock deadline={ticket.deadline} timeZone={profile.timeZone} now={now} />
        {footer && <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hair pt-5">{footer}</div>}
      </Panel>

      <Panel title="Can you enter?" description="Checked against your details. Open a receipt to see the exact rule." action={<VerdictBadge verdict={verdict} />}>
        <EligibilityRows verdict={verdict} />
      </Panel>

      <Panel
        title="What you must submit"
        description={total ? `${ticked} of ${total} done` : undefined}
        action={total ? <div className="mt-2 w-24"><Progress done={ticked} total={total} /></div> : undefined}
      >
        <ChecklistRows ticket={ticket} done={done} onToggle={onToggle} />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Key dates" description={`In your time zone (${formatPieces(now, profile.timeZone).zone})`}>
          <KeyDatesList keyDates={ticket.keyDates} timeZone={profile.timeZone} />
        </Panel>
        <Panel title="Prize">
          <PrizeBlock prize={ticket.prize} inrPerUsd={profile.inrPerUsd} />
        </Panel>
      </div>
    </div>
  );
}

/** Hackathon name as a wrapping heading; the pencil swaps in an input (Enter saves, Escape cancels). */
function NameEditor({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const commit = (v: string) => {
    const next = v.trim();
    if (next && next !== name) onRename(next);
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={name}
        aria-label="Hackathon name"
        maxLength={120}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          if (e.key === "Escape") setEditing(false);
        }}
        className="min-w-0 flex-1 basis-[220px] rounded-lg border border-ink bg-paper-2 px-2 py-1 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink outline-none"
      />
    );
  }
  return (
    <div className="flex min-w-0 flex-1 basis-[220px] items-start gap-1.5">
      <h2 className="min-w-0 font-display text-[19px] font-semibold leading-snug tracking-[-0.02em] text-ink [overflow-wrap:anywhere]">{name}</h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Rename this hackathon"
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink active:scale-95"
      >
        <PencilLine size={15} strokeWidth={1.7} />
      </button>
    </div>
  );
}

/* ---------------- Saved ---------------- */

function SavedView({
  saved,
  profile,
  now,
  query,
  setQuery,
  filter,
  setFilter,
  onOpen,
  onCalendar,
  onRemove,
}: {
  saved: SavedEntry[];
  profile: Profile;
  now: number;
  query: string;
  setQuery: (q: string) => void;
  filter: "upcoming" | "closed" | "all";
  setFilter: (f: "upcoming" | "closed" | "all") => void;
  onOpen: (id: string) => void;
  onCalendar: (e: SavedEntry) => void;
  onRemove: (e: SavedEntry) => void;
}) {
  const tz = profile.timeZone;
  const sorted = sortByDeadline(saved, now);
  const upcoming = sorted.filter((e) => e.deadline && e.deadline.utc >= now);
  const next = upcoming[0];
  const eligible = saved.filter((e) => judge(e.eligibility, profile).badge === "ok").length;
  const allReqs = saved.reduce((n, e) => n + e.requirements.length, 0);
  const allDone = saved.reduce((n, e) => n + e.requirements.filter((r) => e.done?.[r.id]).length, 0);

  const q = query.trim().toLowerCase();
  const rows = sorted
    .filter((e) => (filter === "all" ? true : filter === "upcoming" ? !e.deadline || e.deadline.utc >= now : Boolean(e.deadline && e.deadline.utc < now)))
    .filter((e) => !q || e.name.toLowerCase().includes(q));

  if (!saved.length) {
    return (
      <EmptyCard title="Nothing saved yet" body="Decode a rules page and press Save. It shows up here, sorted by your real deadline, with its checklist progress.">
        <Button size="sm" onClick={() => go("#app")} icon={<ArrowRight size={15} strokeWidth={1.8} />}>
          Decode a rules page
        </Button>
        <Button variant="ghost" size="sm" className="border border-hair bg-surface" onClick={() => go("#sample=monsoon")}>
          Try a sample
        </Button>
      </EmptyCard>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={<Bookmark />} label="Saved" value={saved.length} hint="in this browser" />
        <StatTile icon={<Hourglass />} label="Next deadline" value={next ? shortLeft(next.deadline!.utc, now) : "—"} hint={next ? next.name : "nothing upcoming"} />
        <StatTile icon={<ShieldCheck />} label="Looks eligible" value={`${eligible}/${saved.length}`} tone="pos" delta={eligible === saved.length ? "all" : undefined} hint="for your age and country" />
        <StatTile icon={<ListChecks />} label="Checklist" value={`${allDone}/${allReqs}`} delta={allReqs ? `${Math.round((allDone / allReqs) * 100)}%` : undefined} hint="items ticked, all hackathons" />
      </div>

      <Panel
        className="mt-4"
        title="Your hackathons"
        description="Click one to see its full ticket, receipts and checklist."
        action={
          <div className="hidden sm:block">
            <Segmented
            id="saved-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "closed", label: "Closed" },
              { value: "all", label: "All" },
            ]}
          />
          </div>
        }
      >
        <div className="mb-4 sm:hidden">
          <Segmented
            id="saved-filter-mobile"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "closed", label: "Closed" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved hackathons"
          aria-label="Search saved hackathons"
          className="mb-4 h-10 w-full rounded-full border border-hair bg-paper px-4 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink lg:hidden"
        />
        {rows.length === 0 ? (
          <p className="rounded-[14px] bg-paper-2 px-4 py-6 text-center text-[14px] text-ink-2">
            {q ? `No saved hackathon matches "${query}".` : filter === "closed" ? "No closed deadlines yet." : "No upcoming deadlines. Check the Closed tab."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--hair)]">
            {rows.map((e) => {
              const verdict = judge(e.eligibility, profile);
              const total = e.requirements.length;
              const ticked = e.requirements.filter((r) => e.done?.[r.id]).length;
              const p = e.deadline ? formatPieces(e.deadline.utc, tz) : null;
              const cd = e.deadline ? countdown(e.deadline.utc, now) : null;
              return (
                <li key={e.id} className={cn("grid items-center justify-items-start gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_128px_auto]", cd?.past && "opacity-70")}>
                  <button type="button" onClick={() => onOpen(e.id)} className="group min-w-0 text-left">
                    <span className="flex items-center gap-1 font-display text-[15.5px] font-semibold text-ink">
                      <span className="truncate">{e.name}</span>
                      <ChevronRight size={15} strokeWidth={1.8} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="block truncate text-[13px] text-muted">{e.deadline ? `Page says: ${e.deadline.stated}` : "No deadline found"}</span>
                  </button>
                  <div className="text-[13.5px] tabular-nums">
                    <p className="text-ink">{p ? `${p.date}, ${p.time} ${p.zone}` : "—"}</p>
                    {cd && <p className="font-mono text-[12.5px] text-muted">{cd.past ? cd.label : `${cd.label} left`}</p>}
                  </div>
                  <VerdictBadge verdict={verdict} />
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <Progress done={ticked} total={total} />
                      <p className="mt-1 text-[12px] text-muted">
                        {ticked}/{total} done
                      </p>
                    </div>
                    <IconButton label={`Add ${e.name} to calendar`} onClick={() => onCalendar(e)}>
                      <CalendarPlus />
                    </IconButton>
                    <IconButton label={`Remove ${e.name}`} onClick={() => onRemove(e)}>
                      <Trash2 />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyCard({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <section className="surface relative overflow-hidden px-6 py-12 text-center md:px-10 md:py-16">
      <div aria-hidden className="sky absolute inset-x-0 top-0 h-32 opacity-50 [mask-image:linear-gradient(180deg,#000,transparent)]" />
      <TicketArt className="relative mx-auto w-40" />
      <h3 className="t-h3 relative mt-6">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">{body}</p>
      {children && <div className="relative mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </section>
  );
}
