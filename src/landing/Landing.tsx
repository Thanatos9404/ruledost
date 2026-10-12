import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ClipboardPaste,
  FileSearch,
  Globe2,
  HardDrive,
  ListChecks,
  ReceiptText,
  ScanText,
  ShieldCheck,
  Sparkles,
  Bookmark,
  Timer,
} from "lucide-react";
import {
  Bento,
  BentoCard,
  Button,
  CTASection,
  FeatureSplit,
  FooterCard,
  Hero,
  Marquee,
  Nav,
  ScrollWords,
  SectionHeader,
  SmoothScroll,
  StatTile,
  Wordmark,
} from "../kit";
import { decodeRules } from "../lib/extract.js";
import { judge } from "../lib/judge.js";
import type { Profile } from "../lib/types";
import { SAMPLES } from "../samples.js";
import { ChecklistRows, DeadlineBlock, EligibilityRows, VerdictBadge } from "../ui/TicketParts";
import { useNow } from "../ui/useNow";

const REPO = "https://github.com/Thanatos9404/ruledost";

// Previews use a fixed student profile so the page shows the Indian-student case.
const PREVIEW: Profile = { country: "India", age: 20, timeZone: "Asia/Kolkata", inrPerUsd: 88 };
const sampleText = (id: string) => SAMPLES.find((s) => s.id === id)!.text;

export function Landing() {
  const now = useNow(1000);
  const monsoon = useMemo(() => decodeRules(sampleText("monsoon")), []);
  const northern = useMemo(() => decodeRules(sampleText("northern")), []);
  // The one real line used on this page: Build With AI: Basics' own deadline header.
  const buildWithAi = useMemo(() => decodeRules("Build With AI: Basics\nDeadline: Oct 26, 2026 @ 5:00pm EDT"), []);
  const [ticks, setTicks] = useState<Record<string, boolean>>({ video: true });

  return (
    <SmoothScroll>
      <Nav
        brand={<Wordmark name="RULE" suffix="dost" />}
        links={[
          { label: "Receipts", href: "#receipts" },
          { label: "How it works", href: "#how" },
          { label: "Results", href: "#results" },
          { label: "Open source", href: "#oss" },
        ]}
        cta={{ label: "Open the app", href: "#app" }}
      />

      <Hero
        eyebrow={
          <>
            <ReceiptText size={14} strokeWidth={1.8} className="text-accent" /> Hackathon rules decoder · Built for Build With AI: Basics
          </>
        }
        title="Hackathon fine print, decoded with *receipts*."
        subtitle="Paste any rules page. See when it's really due on your clock, whether you can enter, and what to submit, with every answer quoting its source."
        primary={{ label: "Open the app", href: "#app" }}
        secondary={{ label: "Try a sample", href: "#sample=monsoon" }}
        product={<AppPreview now={now} ticket={monsoon} />}
      />

      <section className="section-y !pb-0">
        <div className="container-x">
          <p className="t-eyebrow mb-6 text-center">Built with</p>
          <Marquee
            items={[
              "Intl time zones",
              "iCalendar · RFC 5545",
              "localStorage",
              "React 18",
              "Vite",
              "Tailwind v4",
              "Motion",
              "Lucide",
              "Node test runner",
              "Devpost Learn skill pack",
              "Claude Code",
            ]}
          />
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <ScrollWords text="Thirteen hackathons on one student's list this month. Their deadlines were written in *seven* different time-zone labels." />
          <p className="t-body mx-auto mt-6 max-w-[52ch] text-center text-muted">
            MSK, EDT, EST, PDT, PST, UTC and IST, across the 13 rules pages saved for October 2026. Oct 26, 5:00 pm EDT is 2:30 AM on the 27th in Jaipur.
          </p>
        </div>
      </section>

      <section id="receipts" className="section-y !pt-0">
        <div className="container-x space-y-28">
          <FeatureSplit
            eyebrow="Your clock"
            title="The deadline, in the time zone you live in."
            body="RuleDost finds the submission deadline, converts it, and counts down. When the date on the page isn't your date, or the deadline lands at 2 AM, it says so."
            bullets={[
              { icon: <Globe2 size={16} />, label: "DST-aware" },
              { icon: <Timer size={16} />, label: "Live countdown" },
              { icon: <CalendarPlus size={16} />, label: ".ics reminders" },
              { icon: <ReceiptText size={16} />, label: "Source quoted" },
            ]}
            visual={
              <div className="surface p-5 text-left md:p-6">
                <p className="mb-4 font-display text-[16px] font-semibold text-ink">{buildWithAi.name}</p>
                <DeadlineBlock deadline={buildWithAi.deadline} timeZone={PREVIEW.timeZone} now={now} compact />
              </div>
            }
          />
          <FeatureSplit
            flip
            eyebrow="Receipts"
            title={
              <>
                Every answer shows its <span className="t-serif">source</span>.
              </>
            }
            body="Eligibility is read from the actual exclusion or residency sentence, with the deciding phrase highlighted. If RuleDost gets it wrong, you'll see why in one click."
            action={
              <Button href="#sample=northern" icon={<ArrowRight size={16} strokeWidth={1.8} />}>
                See a "Not eligible" sample
              </Button>
            }
            visual={
              <div className="surface p-5 text-left md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-display text-[16px] font-semibold text-ink">{northern.name}</p>
                  <VerdictBadge verdict={judge(northern.eligibility, PREVIEW)} />
                </div>
                <EligibilityRows verdict={judge(northern.eligibility, PREVIEW)} defaultOpenId="country-only" />
                <p className="mt-4 text-[12px] text-muted">Fictional sample · checked for a 20-year-old in India</p>
              </div>
            }
          />
          <FeatureSplit
            eyebrow="Checklist"
            title="What to submit, as a list you can tick."
            body="Video length and platform, repo host and licence, required files, required tech: pulled from the rules, each with its receipt, saved as you tick."
            visual={
              <div className="surface p-5 text-left md:p-6">
                <p className="mb-4 font-display text-[16px] font-semibold text-ink">What you must submit</p>
                <ChecklistRows ticket={monsoon} done={ticks} onToggle={(id, on) => setTicks((t) => ({ ...t, [id]: on }))} limit={4} showOthers={false} />
              </div>
            }
          />
        </div>
      </section>

      <section id="how" className="section-y bg-paper !pt-0">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Five small parts, no server" lead="Everything runs in your browser, so nothing you paste is sent anywhere." />
          <Bento className="mt-14">
            <BentoCard
              span={7}
              icon={<ClipboardPaste size={18} />}
              title="Paste the Rules tab"
              body="Ctrl+A, Ctrl+C on the hackathon's rules page, paste, Decode. No account, no upload, no link to share."
              visual={<Pipeline />}
            />
            <BentoCard
              span={5}
              icon={<FileSearch size={18} />}
              title="Patterns, not a chatbot"
              body="Deterministic rules read dates, zones, age limits, country lists and every 'must' sentence. They can't invent a requirement, and each answer carries its source."
            />
            <BentoCard span={4} icon={<Globe2 size={18} />} title="Daylight saving, handled" body="An explicit 'EDT' is taken literally. 'Pacific Time' follows the real switch for that date." />
            <BentoCard span={4} icon={<HardDrive size={18} />} title="Saved in your browser" body="Your details and saved hackathons stay in this browser's storage. There's no account to make." />
            <BentoCard span={4} icon={<CalendarPlus size={18} />} title="Calendar in one click" body="Download an .ics file with reminders a day and three hours before the deadline." />
          </Bento>
        </div>
      </section>

      <section id="results" className="section-y !pt-0">
        <div className="container-x">
          <SectionHeader eyebrow="Results" title="Measured, not guessed" align="left" lead="Checked against real rules pages saved during the build. Those pages stay out of the repo." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<FileSearch />} label="Deadlines found" value="39/39" hint="real Devpost page copies, scripts/corpus-check.mjs" />
            <StatTile icon={<CheckCircle2 />} label="Hand-checked" value="13/13" delta="correct" tone="pos" hint="Rules-page deadlines vs. stated time and zone" />
            <StatTile icon={<ListChecks />} label="Unit tests" value="54" delta="passing" tone="pos" hint="node --test, no test dependencies" />
            <StatTile icon={<ShieldCheck />} label="Sent to a server" value="0 bytes" hint="pasted text never leaves the page; only the site's own files load (network log)" />
          </div>
        </div>
      </section>

      <CTASection
        title={
          <>
            Read the <span className="t-serif">receipts</span>, not the fine print.
          </>
        }
        lead="Free and open source. Nothing you paste leaves your browser."
        action={
          <Button href="#app" size="lg" icon={<ArrowRight size={17} strokeWidth={1.8} />}>
            Open the app
          </Button>
        }
      />
      <div id="oss">
        <FooterCard
          brand={<Wordmark name="RULE" suffix="dost" />}
          blurb="A hackathon rules decoder for students, built by Yashvardhan Thanvi for Build With AI: Basics on Devpost (October 2026). Planned with the Devpost Learn skill pack."
          columns={[
            {
              title: "Product",
              links: [
                { label: "Open the app", href: "#app" },
                { label: "Try a sample", href: "#sample=monsoon" },
                { label: "How it works", href: "#how" },
              ],
            },
            {
              title: "Project",
              links: [
                { label: "Source on GitHub", href: REPO },
                { label: "Planning docs", href: `${REPO}/tree/main/devpost` },
                { label: "MIT licence", href: `${REPO}/blob/main/LICENSE` },
              ],
            },
          ]}
          legal={<span>MIT licence · Fonts are OFL and self-hosted · Samples are fictional · Evidence, not legal advice: read the receipts.</span>}
        />
      </div>
    </SmoothScroll>
  );
}

/** Hero product frame: the real ticket components on a fictional sample. */
function AppPreview({ now, ticket }: { now: number; ticket: ReturnType<typeof decodeRules> }) {
  const verdict = judge(ticket.eligibility, PREVIEW);
  return (
    <div className="grid text-left md:grid-cols-[200px_1fr]">
      <div className="hidden border-r border-hair bg-paper-2/60 p-4 md:block">
        <Wordmark name="RULE" suffix="dost" />
        <div className="mt-6 space-y-1">
          {[
            { label: "Decode", icon: <ScanText size={16} strokeWidth={1.6} />, on: true },
            { label: "My hackathons", icon: <Bookmark size={16} strokeWidth={1.6} /> },
          ].map((l) => (
            <div key={l.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 font-display text-[13.5px] ${l.on ? "bg-paper-3 text-ink" : "text-ink-2"}`}>
              {l.icon}
              {l.label}
            </div>
          ))}
        </div>
        <p className="t-eyebrow mt-6 !text-[10.5px]">Fictional samples</p>
        <div className="mt-2 space-y-1 text-[13px] text-ink-2">
          {SAMPLES.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5">
              <Sparkles size={14} strokeWidth={1.6} />
              {s.title.replace(/ 2026$/, "")}
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-[17px] font-semibold tracking-[-0.02em]">Namaste</p>
            <p className="text-[12.5px] text-muted">Fictional sample · times in IST</p>
          </div>
          <VerdictBadge verdict={verdict} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-hair bg-surface p-4">
            <p className="mb-3 font-display text-[15px] font-semibold">{ticket.name}</p>
            <DeadlineBlock deadline={ticket.deadline} timeZone={PREVIEW.timeZone} now={now} compact />
          </div>
          <div className="rounded-[18px] border border-hair bg-surface p-4">
            <p className="mb-3 font-display text-[15px] font-semibold">Can you enter?</p>
            <EligibilityRows verdict={verdict} defaultOpenId="country-excluded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bento diagram: paste → patterns → ticket with receipts. */
function Pipeline() {
  const steps = [
    { icon: <ClipboardPaste size={16} strokeWidth={1.7} />, label: "Rules page", sub: "pasted text" },
    { icon: <FileSearch size={16} strokeWidth={1.7} />, label: "Patterns", sub: "dates · zones · musts" },
    { icon: <ReceiptText size={16} strokeWidth={1.7} />, label: "Ticket", sub: "every row + receipt" },
  ];
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-center gap-2 sm:flex-col sm:items-stretch">
          <div className="flex flex-1 items-center gap-2.5 rounded-[14px] border border-hair bg-surface px-3.5 py-3 shadow-[var(--shadow-soft)]">
            <span className="grid size-8 place-items-center rounded-full bg-paper-2 text-ink">{s.icon}</span>
            <span>
              <span className="block font-display text-[14px] font-semibold text-ink">{s.label}</span>
              <span className="block text-[12px] text-muted">{s.sub}</span>
            </span>
          </div>
          {i < steps.length - 1 && <ArrowRight aria-hidden size={16} strokeWidth={1.7} className="mx-auto hidden shrink-0 text-muted sm:hidden" />}
        </div>
      ))}
    </div>
  );
}
