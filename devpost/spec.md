---
doc: spec
status: approved
---
<!-- Approval basis: drafted and approved by Claude Code under Yashvardhan's written delegation brief
     (2026-10-12): stack recommendations were the agent's, made to fit the brief's constraints
     (free static hosting, no paid APIs, never call OpenAI/Anthropic, offline fallback). -->

# RuleDost — Technical Spec

## How This Works, In Plain Language
RuleDost is one web page plus a handful of JavaScript files. There is no server and no database, and no AI model runs at runtime.

1. **The decoder** is a set of plain functions. They take the pasted text and return a *decoded ticket*: name, deadline, key dates, eligibility facts, checklist and prize. Each fact carries the sentence it came from (its *receipt*). The functions find facts with patterns: they look for "Deadline:" lines, "Submission Period: A – B" lines, sentences that say "IS NOT open to", "video … minutes", "repository … public", and so on.
2. **The clock** converts a stated time such as "5:00pm EDT" into one exact moment and then shows that moment in the student's time zone. It uses the browser's built-in time-zone database (`Intl`), so no date library is needed.
3. **The judge** compares the eligibility facts with the student's details (country, age) and produces pass, check or fail rows plus an overall badge.
4. **The page** (HTML, CSS and one `app.js`) draws the ticket, handles clicks, and saves the student's details and saved tickets in `localStorage`, a small notebook the browser keeps for this one site.
5. **The calendar maker** turns a ticket into an `.ics` text file that any calendar app can import.

Why this shape: the core of the app is reading text and doing date maths, and both are pure functions that can be tested in Node without a browser. Without a server, it deploys free as static files, works offline, and nothing pasted ever leaves the page.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. The student pastes text and clicks **Decode** → `app.js` calls `decodeRules(text, { now })` in `src/lib/extract.js`.
2. `extract.js` normalises the text with `src/lib/text.js` (quotes, dashes, spaces) and splits it into lines and sentences.
3. Deadline: it finds the best date line → `src/lib/time.js` `parseDateTime()` reads "Oct 26, 2026 @ 5:00pm EDT" as `{y, m, d, hh, mm, zone}` → `toUtc()` returns the instant `2026-10-26T21:00:00Z`. The receipt is the source line with the matched span highlighted.
4. Eligibility facts, requirements and prize are extracted the same way, each with its receipt.
5. `app.js` calls `judge(ticket.eligibility, profile)` from `src/lib/judge.js` → rows and badge.
6. `src/ui/render.js` builds the DOM with `textContent` only (pasted text is untrusted and is never inserted as HTML). `formatInZone(utc, profile.timeZone)` gives "Tue, 27 Oct 2026, 2:30 AM IST". `dateShift()` compares calendar dates. A 1-second timer updates the countdown.
7. **Save** → `src/lib/store.js` writes the ticket (without the raw text) into `localStorage["ruledost:v1:saved"]`.
8. **My hackathons** → `store.listSaved()` → sorted with `sortByDeadline()` → rendered as cards. Ticking a checkbox → `store.updateSaved(id, {done})`.
9. **Add to calendar** → `src/lib/ics.js` `buildIcs(ticket)` → a Blob download named `<slug>-deadline.ics`.

## Stack
- **HTML + CSS + vanilla JavaScript (ES modules)** with no framework and no build step. A framework would add setup without helping prove the kernel. Native modules run in every current browser. Docs: [MDN JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).
- **`Intl.DateTimeFormat`** for time-zone conversion and formatting. It is built into browsers and Node 22 (full ICU). Docs: [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat). `Intl.NumberFormat('en-IN')` handles lakh grouping for INR.
- **`localStorage`** for the profile and saved tickets. Docs: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- **iCalendar (RFC 5545)** text for calendar export. Docs: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
- **Node.js 20+ built-in test runner** (`node --test`) for unit tests, with zero dependencies. Docs: [Node test runner](https://nodejs.org/api/test.html).
- **A tiny Node static server** (`scripts/serve.mjs`) for local runs. ES modules don't load from `file://` URLs, so a local server is needed.
- Runtime dependencies: none. Dev dependencies: none.
- **Verify early (agent assumption):** Node's `--test` glob support needs Node 21+. Node 22.17 is installed. The README states Node 20+ for running the app and 22+ for running the tests.

## Where It Runs and How Someone Tries It
- **Runtime:** any modern browser. Locally it is served by `node scripts/serve.mjs` (Node 20+).
- **Start:** `npm start`, then open http://localhost:5173.
- **Tests:** `npm test`.
- **Optional realism check:** `npm run corpus -- <folder-of-rules-.txt-files>` prints what the decoder finds in each file. Yashvardhan's `_Oct2026_rules/` folder is used locally. The real rules pages are not committed.
- **Demo recording:** run locally, paste the real *Build With AI: Basics* Rules tab, then show the samples, Save, My hackathons and Add to calendar.
- **Deployment (optional, prepared but not done):** this is a static site with the repo root as the publish directory. Vercel: "Other" framework preset, no build command, output directory `.`. Netlify: publish directory `.`, no build command. GitHub Pages would also work. No environment variables or keys are needed. Submission still requires the video and the public repo.

## Look and Feel
Implements `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.
- **CSS custom properties** on `:root`: `--paper #FBF8F1`, `--ink #1C1B19`, `--muted #6B665C`, `--line #E4DDCC`, `--accent #E8A317`, `--accent-ink #5A3B00`, `--ok #2F7D4F`, `--warn #B7791F`, `--bad #B42318`, `--slip #F4EFE2`. Dark values sit under `@media (prefers-color-scheme: dark)`.
- **Type:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` for UI, and `ui-monospace, "Cascadia Mono", Consolas, monospace` for receipts. The deadline uses `font-variant-numeric: tabular-nums` at about 2.25rem and weight 750.
- **Ticket card:** a white or paper card with an 8 px radius, a 1 px line border and a "perforation" (a dashed border between the deadline stub and the body). Receipts use the `--slip` background with a dashed top border and a monospace 0.85rem font, and the matched phrase sits in `<mark>` with a marigold tint.
- **Verdict pills:** coloured dot plus word (Looks eligible / Check these / Not eligible). Colour is never the only signal.
- **Layout:** CSS grid with two columns at 900 px and above, single column below. Max width 1200 px and 16 px side gutters on mobile.
- **Focus rings** use the accent colour. `<details>/<summary>` handle the receipts, so they work without extra JS and are keyboard-accessible.

## Components

### Text utilities — `src/lib/text.js`
Normalises curly quotes, en/em dashes and non-breaking spaces. Splits text into lines and into sentences (on `. ` / `; ` / line breaks, keeping list items whole). `makeReceipt(sentence, matchText)` returns `{ quote, mark: [start, end] }`, trimming quotes longer than about 320 characters around the match with "…".
PRD ref: `prd.md > Decoding pasted rules`.

### Clock — `src/lib/time.js`
- `ZONES`: the abbreviation and wording table. Explicit standard/daylight abbreviations (EDT, PST, …) map to **fixed offsets**. Generic wordings (ET, "Eastern Time", PT, …) map to **IANA zones** (America/New_York, …) so daylight saving is applied for the actual date. IST is read as India (+05:30), CST as US Central, and BST as British Summer Time.
- `findDateTimes(line, { defaultYear })` returns every `{ y, m, d, hh, mm, zone, index, length, text }` in a line. It handles "October 26, 2026 (5:00 pm Eastern Time)", "Oct 26, 2026 @ 5:00pm EDT", "Sep 29, 2026(12:00 pm Eastern Time)", "November 4th (2:00 pm Eastern Time)" (year inferred), "22nd September 2026", "2026-10-26 17:00 UTC", "11:59 PM PT on October 26, 2026" and "September 24, 2026 at 10:00:00 AM PT".
- `toUtc(parts)` returns epoch milliseconds, using an Intl offset lookup for IANA zones.
- `formatInZone(ms, tz)`, `zoneAbbrev(ms, tz)`, `dateShift(ms, statedParts, tz)`, `isLateNight(ms, tz)`, `countdown(ms, now)`.
PRD ref: `prd.md > Deadline in your time zone`.

### Decoder — `src/lib/extract.js`
`decodeRules(text, { now })` returns a **DecodedTicket** (see Data Model). Its sub-extractors are `findName`, `findDeadline`, `findKeyDates`, `findEligibility`, `findRequirements`, `findOtherMusts` and `findPrize`. Each returns its receipt(s). Requirement detectors are a table of `{ id, title, test(sentence), detail(sentence, ctx) }`, so adding one is a single entry.
PRD ref: `prd.md > Decoding pasted rules`, `prd.md > Eligibility verdict`, `prd.md > Submission checklist`, `prd.md > Prize pool in rupees`.

### Judge — `src/lib/judge.js`
`judge(eligibility, profile)` returns `{ badge: 'ok'|'check'|'bad', rows: [{ id, status, title, detail, receipt }] }`. Country matching is case-insensitive, matches whole words, and checks aliases (e.g. "United States" ↔ "USA", "U.S.").
PRD ref: `prd.md > Eligibility verdict`.

### Calendar — `src/lib/ics.js`
`buildIcs(ticket, { now })` returns RFC 5545 text with CRLF line endings, escaping (`\\ \; \, \n`), lines folded at 75 octets, and two `VALARM`s (`-P1D`, `-PT3H`). `slugify(name)` produces the filename.
PRD ref: `prd.md > Calendar export`.

### Storage — `src/lib/store.js`
Wraps `localStorage` in try/catch and falls back to in-memory storage when blocked. Its functions are `loadProfile`, `saveProfile`, `listSaved`, `saveTicket` (an upsert keyed by name and deadline), `updateSaved`, `removeSaved` and `sortByDeadline`. It reports `available: false` so the UI can show the storage-blocked message.
PRD ref: `prd.md > My hackathons`, `prd.md > States and Boundaries`.

### Samples — `src/samples.js`
Two original, fictional rules texts ("Monsoon Build Sprint 2026", global; "Northern Lights Civic Challenge", US and Canada only). Each is labelled fictional in its first line.
PRD ref: `prd.md > Samples`.

### Page — `index.html`, `styles.css`, `src/app.js`, `src/ui/render.js`
- `index.html`: semantic layout (header, tabs, Decode section, My hackathons section, footer) and a strict Content-Security-Policy meta (`default-src 'self'`).
- `render.js`: `renderTicket(ticket, verdict, ctx)`, `renderSavedList(entries, ctx)` and an `el()` helper that builds DOM nodes with `textContent`.
- `app.js`: state (profile, current ticket, current saved id), event wiring, the countdown timer, tab switching and downloads.
PRD ref: `prd.md > Screens and Layout`, `prd.md > The Core Journey`.

## Data Model
```js
Receipt       = { quote: string, mark: [start, end] | null }
DateFact      = { label, utc: number|null, stated: string, zone: string|null,
                  zoneAssumed: boolean, parts: {y,m,d,hh,mm}, receipt }
DecodedTicket = {
  v: 1,
  name: string,
  deadline: DateFact | null,
  keyDates: DateFact[],
  eligibility: {
    minAge: { value: number, note: string, receipt } | null,
    excluded: { receipt } | null,           // sentence listing excluded places
    restrictedTo: { receipt } | null,       // "open only to residents of …"
    conditions: [{ text, receipt }],        // membership/enrollment/employment
    overviewNote: { receipt } | null        // "excluding standard exceptions"
  },
  requirements: [{ id, title, detail, receipt }],
  otherMusts:   [{ text, receipt }],
  prize: { usd: number, receipt } | null,
  found: number                              // count of facts; 0 → "doesn't look like rules"
}
Profile    = { country: 'India', age: number|null, timeZone: string, inrPerUsd: 88 }
SavedEntry = DecodedTicket & { id, savedAt, done: { [requirementId]: boolean } }
```
- **Profile** lives in `localStorage["ruledost:v1:profile"]`. It is updated on every change in *Your details*, and when the student comes back the page loads it, falling back to defaults.
- **Saved entries** live in `localStorage["ruledost:v1:saved"]` as a JSON array. They are updated on Save, on a tick and on Remove, and the list reloads on page open.
- **The current (unsaved) ticket** is held only in memory and is lost on reload. Ticks on an unsaved ticket are copied into the entry when it is saved.
- **Pasted raw text** is never stored.

## File Structure
```
Devpost_BuildWithAI_Basics/
├── index.html              # the single page: header, tabs, Decode + My hackathons sections
├── styles.css              # paper/ink/marigold theme, ticket + receipt styles, dark mode
├── src/
│   ├── app.js              # wiring: events, state, countdown timer, downloads
│   ├── samples.js          # two fictional rules texts for "Try a sample"
│   ├── ui/
│   │   └── render.js       # DOM builders (textContent only) for ticket and saved list
│   └── lib/
│       ├── text.js         # normalise, split lines/sentences, makeReceipt
│       ├── time.js         # zone table, date/time parsing, UTC conversion, formatting
│       ├── extract.js      # decodeRules(): name, deadline, key dates, eligibility, checklist, prize
│       ├── judge.js        # eligibility verdict against the profile
│       ├── ics.js          # .ics calendar text builder
│       └── store.js        # localStorage wrapper with in-memory fallback
├── tests/
│   ├── time.test.mjs       # zone + date parsing + conversion
│   ├── extract.test.mjs    # decoder on synthetic Devpost-style fixtures and samples
│   ├── judge.test.mjs      # verdict rules
│   ├── ics.test.mjs        # escaping, folding, alarms
│   └── store.test.mjs      # upsert, sort, blocked-storage fallback
├── scripts/
│   ├── serve.mjs           # zero-dependency static server (npm start)
│   └── corpus-check.mjs    # dev tool: decode every .txt in a folder and print a summary
├── devpost/                # Devpost Learn planning workspace (scope, prd, spec, checklist, app map)
├── package.json            # scripts only: start, test, corpus; no dependencies
├── skills-lock.json        # record of the Devpost Learn skill pack installed
├── README.md
└── LICENSE                 # MIT
```

## External Services and Dependencies
None at runtime. There are no network calls, API keys or accounts. The only "external" pieces are the browser's built-in `Intl` time-zone data (updated with the browser) and, optionally, a static host for deployment (Vercel, Netlify or GitHub Pages free tiers; nothing needs configuring).

## Important Failure Modes
- **An unusual rules format means the deadline isn't found.** The deadline block says "No deadline found. Search the rules for 'Submission Period'", the rest of the ticket still renders, and saving is allowed (sorted last).
- **A pattern misreads a sentence** (wrong age or wrong country verdict). Every row shows its receipt, so the student can see the source sentence and catch the mistake. Verdict wording is "looks", never a guarantee.
- **Storage is blocked** (private mode or a strict setting). The store falls back to memory and the UI shows "Couldn't save: your browser is blocking storage." Decoding still works.
- **A time zone is missing or unknown.** UTC is assumed and the ticket shows a visible "assumed UTC" warning.

## What Was Simplified and Why
- **Pattern extraction** instead of an LLM. It is checkable, offline and free, and it gives receipts by construction. The fuller version would add an optional LLM fallback behind a server with an API key, constrained to cite sentences.
- **Paste** instead of fetching a URL. Fetching needs a proxy server because of CORS. The fuller version would add a small serverless function.
- **`localStorage`** instead of accounts and a database. The fuller version would add auth plus a hosted database for cross-device sync.
- **A fixed, editable INR rate** instead of live FX. Live rates need a network call and an API. The fuller version would fetch a daily rate.
- **Fictional samples** instead of bundled real rules pages. Real pages are other people's copyrighted text. Real pages are tested locally with `corpus-check.mjs` and not committed.

## Decisions and Open Issues
- **The stack (vanilla JS, no build, Node test runner, static hosting)** was recommended by the agent and accepted under the delegation brief. Reasons: no install step, free hosting, and the kernel is pure functions. Trade-off: no component framework, so the UI code is hand-written DOM.
- **No runtime LLM**, an agent decision under the brief. The brief allowed Nebius Token Factory with an offline fallback, or no LLM. "No LLM" was chosen because receipts are the kernel. Trade-off: lower coverage for non-Devpost formats.
- **Fixed offsets for explicit abbreviations, IANA zones for generic wording.** If a page says "EST" for a summer date, RuleDost honours the literal abbreviation, which is the stated rule.
- **Ambiguous abbreviations:** IST is read as India (+05:30), CST as US Central (−06:00) and BST as British Summer Time (+01:00). Documented in `time.js`.
- **The one useful unknown** (agent-identified, since there was no live learner interview): *can pattern matching actually handle real rules pages, or is this a toy?* Investigation agreed for the build: run `corpus-check.mjs` over the 11 real rules pages in `_Oct2026_rules/` and record how many deadlines, ages and country verdicts are correct. The evidence is the script output, recorded under `checklist.md > Revisions`.
- **Open (from the PRD):** coverage of rules pages from platforms other than Devpost (Unstop, MLH). This doesn't block the build.
