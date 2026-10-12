---
doc: spec
status: approved
---
<!-- Approval basis: drafted and approved by Claude Code under Yashvardhan's written delegation brief
     (2026-10-12): stack recommendations were the agent's, made to fit the brief's constraints
     (free static hosting, no paid APIs, never call OpenAI/Anthropic, offline fallback). -->

# RuleDost — Technical Spec

## How This Works, In Plain Language
RuleDost is a static web app: a landing page plus the app itself, built with React and Vite on Yashvardhan's shared design kit, around a handful of plain JavaScript decoder files. There is no server and no database, and no AI model runs at runtime.

1. **The decoder** is a set of plain functions. They take the pasted text and return a *decoded ticket*: name, deadline, key dates, eligibility facts, checklist and prize. Each fact carries the sentence it came from (its *receipt*). The functions find facts with patterns: they look for "Deadline:" lines, "Submission Period: A – B" lines, sentences that say "IS NOT open to", "video … minutes", "repository … public", and so on.
2. **The clock** converts a stated time such as "5:00pm EDT" into one exact moment and then shows that moment in the student's time zone. It uses the browser's built-in time-zone database (`Intl`), so no date library is needed.
3. **The judge** compares the eligibility facts with the student's details (country, age) and produces pass, check or fail rows plus an overall badge.
4. **The app** (React components in `src/app/` and `src/ui/`) draws the ticket, handles clicks, and saves the student's details and saved tickets in `localStorage`, a small notebook the browser keeps for this one site. The **landing page** (`src/landing/`) explains the product using the same components on decoded samples.
5. **The calendar maker** turns a ticket into an `.ics` text file that any calendar app can import.

Why this shape: the core of the app is reading text and doing date maths, and both are pure functions that can be tested in Node without a browser. Without a server, it deploys free as static files, works offline, and nothing pasted ever leaves the page.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. The student pastes text and clicks **Decode** → `decodeText()` in `src/app/RuleDostApp.tsx` calls `decodeRules(text, { now })` in `src/lib/extract.js`.
2. `extract.js` normalises the text with `src/lib/text.js` (quotes, dashes, spaces) and splits it into lines and sentences.
3. Deadline: it finds the best date line → `src/lib/time.js` `parseDateTime()` reads "Oct 26, 2026 @ 5:00pm EDT" as `{y, m, d, hh, mm, zone}` → `toUtc()` returns the instant `2026-10-26T21:00:00Z`. The receipt is the source line with the matched span highlighted.
4. Eligibility facts, requirements and prize are extracted the same way, each with its receipt.
5. The app calls `judge(ticket.eligibility, profile)` from `src/lib/judge.js` → rows and badge.
6. `src/ui/TicketParts.tsx` renders the ticket. React renders pasted text as text only, never as HTML. `formatPieces(utc, profile.timeZone)` gives "Tue, 27 Oct 2026" and "2:30 AM IST", `dateShift()` compares calendar dates, `useNow()` re-renders every second for the countdown, and `src/ui/Receipt.tsx` unfolds each receipt with the matched span in `<mark>`.
7. **Save** → `src/lib/store.js` writes the ticket (without the raw text) into `localStorage["ruledost:v1:saved"]`.
8. **My hackathons** → `store.listSaved()` → sorted with `sortByDeadline()` → rendered as rows in the My hackathons panel. Ticking a checkbox → `store.updateSaved(id, {done})`.
9. **Add to calendar** → `src/lib/ics.js` `buildIcs(ticket)` → a Blob download named `<slug>-deadline.ics`.

## Stack
*Updated 2026-10-13: Yashvardhan asked for the front end to be rebuilt on his shared design kit. The decoder below is unchanged.*

- **Decoder: plain JavaScript (ES modules), zero dependencies.** `src/lib/*.js` and `src/samples.js` are imported directly by the Node tests and by the React app. Type declarations (`*.d.ts`, `src/lib/types.ts`) give the app strict types without touching the tested JS.
- **`Intl.DateTimeFormat`** for time-zone conversion and formatting. It is built into browsers and Node 22 (full ICU). Docs: [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat). `Intl.NumberFormat('en-IN')` handles lakh grouping for INR.
- **`localStorage`** for the profile and saved tickets. Docs: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- **iCalendar (RFC 5545)** text for calendar export. Docs: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
- **Front end: React 18.3.1 + Vite 6.3.5 + TypeScript 5.8 (strict) + Tailwind CSS 4.1.11**, with Motion 12.23.12 (animation), Lenis 1.3.4 (landing-page scrolling only) and lucide-react 0.525.0 icons. Versions are pinned to the shared design system (`_design/DESIGN_SYSTEM.md`). Docs: [React](https://react.dev/), [Vite](https://vite.dev/guide/), [Tailwind CSS v4](https://tailwindcss.com/docs), [Motion](https://motion.dev/docs/react).
- **Shared UI kit** in `src/kit/`, copied unchanged from the design system. Components are composed, not rewritten. The two kit gaps were filled in `src/app/parts.tsx` following kit conventions: a controlled `SearchField` (the kit's `SearchPill` has no value/onChange) and a `MobileTabBar` (the kit's `AppShell` hides its sidebar below 768px).
- **Fonts:** Open Runde, Inter, Instrument Serif, Fragment Mono and Silkscreen, self-hosted via Fontsource (OFL) and bundled. No CDN.
- **Node.js built-in test runner** (`node --test`) for the 54 decoder tests. Docs: [Node test runner](https://nodejs.org/api/test.html). `tsc -b` type-checks the app as part of `npm run build`.
- **Trade-off accepted with the rebuild:** the app now has npm dependencies and a build step, instead of zero-dependency static files. The decoder and its tests stay dependency-free.

## Where It Runs and How Someone Tries It
- **Runtime:** any modern browser. Node 20+ is needed to develop or build (22+ for `npm test`).
- **Develop:** `npm install`, then `npm run dev` (or `npm start`) and open http://localhost:5173. `/` is the landing page and `/#app` is the app. `/#sample=monsoon` or `/#sample=northern` opens a fictional sample.
- **Tests:** `npm test` runs the 54 decoder tests. `npm run build` runs `tsc -b`, then `vite build` → `dist/`, and `npm run preview` serves it.
- **Optional realism check:** `npm run corpus -- <folder-of-rules-.txt-files>`. Real rules pages are used locally and never committed.
- **Demo recording:** run locally, start on the landing page, open the app, paste the real *Build With AI: Basics* Rules tab, then show a sample, Save, My hackathons and Add to calendar.
- **Deployment (optional, prepared, not done):** a static site from `dist/`. `vercel.json` sets `npm run build`, output `dist`, and security headers including a CSP. The CSP was checked against the production build: `font-src` needs `data:` because Vite inlines the smallest font subsets. On Netlify, use build `npm run build` and publish `dist`. `base: "./"` plus hash routing also allows GitHub Pages on a sub-path. No environment variables or keys are needed.

## Look and Feel
Implements `prd.md > Look and Feel` (updated 2026-10-13) using the shared design system's **daylight** theme and RuleDost's palette row: accent `#C9502E` with the default sky. The only project override is `src/styles/project.css`, which sets `--accent`.
- **Tokens** come from `src/kit/styles/tokens.css`: paper `#F9F8F8`, white surfaces, ink `#1A1615`, body `#453F3D`, muted `#757170`, hairlines `rgba(26,22,21,.08)`, a sky gradient behind the landing hero and the feature tiles, and pos/neg tokens for verdicts.
- **Accent discipline:** the accent marks the **receipt highlight** (the `<mark>` in each source sentence), because receipts are the kernel. Elsewhere it appears only in kit-owned spots (the sidebar count badge). Verdicts use the pos/neg tokens, and warnings use paper-2 notes with an ink icon.
- **Type:** Open Runde 600 display (the big deadline is `.t-num`, tabular), Inter body, Fragment Mono for receipts, eyebrows and countdowns, Instrument Serif italic for one or two words per headline, and the Silkscreen pixel wordmark "RULE*dost*".
- **Motion:** kit only, one ease and one spring. The landing uses blur-up reveals, the WordReveal hero, a TiltFrame product shot and Lenis scrolling. The app uses AppShell's blur-fade view transition, and receipts unfold with a height animation. `prefers-reduced-motion` is respected by the kit.
- **Layout:** the app is a 12-column grid with 16px gaps. Four StatTiles sit on top. On desktop the paste and details panels (5 columns) stay sticky beside the ticket panels (7 columns). Every view works at 375px, where a glass bottom tab bar replaces the sidebar.
- **Copy tone:** a helpful senior with short, plain sentences. The greeting is "Namaste". Verdicts say "Looks eligible", "Check these" or "Not eligible", never "guaranteed".

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
*Replaced on 2026-10-13 by the React front end below. The same behaviours, recomposed on the kit.*

### Router — `src/Root.tsx`
Hash routing. `#app`, `#app/saved`, `#app/saved/<id>` and `#sample=<id>` open the app, and anything else shows the landing page.
PRD ref: `prd.md > Screens and Layout`.

### App — `src/app/RuleDostApp.tsx`, `src/app/parts.tsx`
`AppShell` with three views. **Decode** has StatTiles, the paste panel (with fictional-sample chips), *Your details*, and ticket panels. **My hackathons** has StatTiles plus a filterable, searchable list with a segmented Upcoming/Closed/All control. **Saved ticket** is the full ticket with persisted ticks, calendar and remove. State lives in React (profile, current ticket, ticks), and the store persists it. `parts.tsx` holds `SearchField`, `MobileTabBar`, `Toast`, `DetailsForm` and `TicketArt` (the empty-state illustration).
PRD ref: `prd.md > The Core Journey`, `prd.md > My hackathons`, `prd.md > Calendar export`, `prd.md > States and Boundaries`.

### Ticket parts — `src/ui/TicketParts.tsx`, `src/ui/Receipt.tsx`, `src/ui/useNow.ts`
`DeadlineBlock`, `EligibilityRows`, `ChecklistRows`, `KeyDatesList`, `PrizeBlock`, `VerdictBadge`, `Progress`, and `ReceiptToggle`/`Slip` (the receipt with `<mark>`). The app and the landing page use the same components.
PRD ref: `prd.md > Deadline in your time zone`, `prd.md > Eligibility verdict`, `prd.md > Submission checklist`.

### Landing — `src/landing/Landing.tsx`
Built to the design system's landing structure. **Nav**. **Hero**, whose product frame is the live ticket components on the decoded Monsoon sample. A **Marquee** of the real stack. **ScrollWords**: 13 rules pages, seven time-zone labels. **Three FeatureSplits** (Build With AI's own deadline line, the Northern Lights not-eligible receipt, and a tickable checklist). A **Bento** "How it works". **Measured StatTiles** (39/39, 13/13, 54 tests, 0 bytes sent). Then the **CTA** and **footer**.

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
├── index.html              # Vite entry: <div id="root"> + src/main.tsx
├── public/favicon.svg
├── src/
│   ├── main.tsx            # fonts + kit tokens + project accent, renders <Root/>
│   ├── Root.tsx            # hash router: landing vs app
│   ├── styles/project.css  # the one project override: --accent
│   ├── kit/                # shared design kit, copied unchanged (components, tokens, fonts, motion)
│   ├── landing/Landing.tsx # landing page (live ticket components in the hero and feature tiles)
│   ├── app/
│   │   ├── RuleDostApp.tsx # AppShell: Decode, My hackathons, saved-ticket views
│   │   └── parts.tsx       # SearchField, MobileTabBar, Toast, DetailsForm, TicketArt
│   ├── ui/
│   │   ├── TicketParts.tsx # deadline, eligibility, checklist, key dates, prize
│   │   ├── Receipt.tsx     # receipt toggle + slip with <mark>
│   │   └── useNow.ts       # ticking clock for countdowns
│   ├── samples.js (+ .d.ts)# two fictional rules texts
│   └── lib/                # the decoder: plain JS, unchanged, typed by .d.ts files
│       ├── text.js         # normalise, split lines/sentences, makeReceipt
│       ├── time.js         # zone table, date/time parsing, UTC conversion, formatting
│       ├── extract.js      # decodeRules(): name, deadline, key dates, eligibility (calls requirements.js)
│       ├── requirements.js # checklist detectors, other "must" lines, prize
│       ├── countries.js    # country list, aliases, "is X named in this sentence?"
│       ├── judge.js        # eligibility verdict against the profile
│       ├── money.js        # USD/INR formatting and conversion
│       ├── ics.js          # .ics calendar text builder
│       ├── store.js        # localStorage wrapper with in-memory fallback
│       └── types.ts        # shared types for the .d.ts files
├── tests/                  # 54 node --test cases on src/lib + samples (unchanged)
├── scripts/corpus-check.mjs# dev tool: decode every .txt in a folder and print a summary
├── docs/screenshots/       # 1440px and 375px gallery shots
├── devpost/                # Devpost Learn planning workspace (scope, prd, spec, checklist, app map)
├── package.json, package-lock.json, vite.config.ts, tsconfig.json, vercel.json
├── skills-lock.json        # record of the Devpost Learn skill pack installed
├── README.md
└── LICENSE                 # MIT
```

## External Services and Dependencies
None at runtime. There are no network calls, API keys or accounts. The production build loads only its own files: the JS bundle, CSS and font files, some fonts lazily on first use. This was checked in the browser's network log: no pasted text is sent anywhere, and a second decode makes no requests at all. npm packages are listed in `package.json`, pinned to the design system's versions. Optional static hosts (Vercel, Netlify, GitHub Pages) have free tiers and need no keys.

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
- **The one useful unknown** (agent-identified, since there was no live learner interview): *can pattern matching actually handle real rules pages, or is this a toy?* Investigation agreed for the build: run `corpus-check.mjs` over the real rules pages in `_Oct2026_rules/` (13 hackathons) and record how many deadlines, ages and country verdicts are correct. The evidence is the script output, recorded under `checklist.md > Revisions`.
- **Open (from the PRD):** coverage of rules pages from platforms other than Devpost (Unstop, MLH). This doesn't block the build.
- **Front-end rebuild (2026-10-13, Yashvardhan's request):** "the RuleDost logic is good, but the UI must be rebuilt to a premium standard", on his shared design kit with React + Vite, using the default palette (accent #C9502E, default sky), a landing page and the app in AppShell, kept fully offline. The decoder modules and all 54 tests were kept. Trade-off: npm dependencies and a build step (see Stack). It was verified with `tsc -b`, `vite build`, `npm test` (54/54), and browser checks at 1440px and 375px. Details are in `checklist.md > Revisions`.
