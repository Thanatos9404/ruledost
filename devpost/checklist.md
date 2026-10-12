---
doc: checklist
status: approved
---
<!-- Approval basis: build order approved by Claude Code under Yashvardhan's delegation brief (2026-10-12). -->

# Build Checklist

Build mode: fast. Chosen under the delegation brief because the learner is an experienced hackathon builder. The agent verifies and commits each slice. Hands-on checkpoints are reserved for Yashvardhan.

## Slices

- [x] **1. Paste a rules page and see your real deadline in your time zone, with its receipt**
  Becomes usable: A running page where pasting rules text and pressing Decode shows the hackathon name, the deadline converted to the student's time zone (e.g. Tue, 27 Oct 2026, 2:30 AM IST), the page's original wording, date-shift and late-night warnings, a live countdown, key dates, and a receipt for each.
  Why now: This is the kernel (receipts plus your own clock) and the riskiest logic (date parsing and time-zone maths). Bootstrapping the page, server and test runner happens here so every later slice has somewhere to land.
  PRD ref: `prd.md > The Core Journey` (steps 1, 3, 4.1–4.3, 5), `prd.md > Deadline in your time zone`, `prd.md > Decoding pasted rules`
  Spec ref: `spec.md > Clock — src/lib/time.js`, `spec.md > Text utilities — src/lib/text.js`, `spec.md > Decoder — src/lib/extract.js`, `spec.md > Page — index.html, styles.css, src/app.js, src/ui/render.js`, `spec.md > Look and Feel`, `spec.md > File Structure`
  Build: package.json scripts, scripts/serve.mjs, index.html, styles.css, src/app.js, src/ui/render.js, src/lib/text.js, src/lib/time.js, and src/lib/extract.js (name, deadline, key dates). Add a time-zone select in Your details. Tests in tests/time.test.mjs and tests/extract.test.mjs.
  Verify (mechanical): `npm test` passes, including EDT→IST (2026-10-26 17:00 EDT = 2026-10-27 02:30 IST), PT with DST, UTC, MSK and a missing year. Run `npm start`, open http://localhost:5173 in the browser pane, paste a Devpost-style fixture, and confirm the deadline line reads "Tue, 27 Oct 2026, 2:30 AM IST" with a working receipt toggle and a ticking countdown.
  Learner check: Run `npm start`, open http://localhost:5173, paste the Rules tab of Build With AI: Basics, press Decode, and check the deadline says 2:30 AM IST on Tue 27 Oct. Open its receipt.
  Commit: `Decode deadline into your time zone with receipts`

- [x] **2. See whether you can enter: an eligibility verdict against your details**
  Becomes usable: A Your details strip (country, age, time zone, INR rate) saved in the browser, and an eligibility block with age, country and special-condition rows plus an overall badge, each row with a receipt.
  Why now: "Can I even enter?" is the second question a student asks. It also exercises the profile to verdict wiring that the saved list reuses.
  PRD ref: `prd.md > Eligibility verdict`, `prd.md > The Core Journey` (step 2, 4.4)
  Spec ref: `spec.md > Judge — src/lib/judge.js`, `spec.md > Decoder — src/lib/extract.js`, `spec.md > Data Model`
  Build: findEligibility in extract.js, src/lib/judge.js, and the profile strip and eligibility block in render.js and app.js. Tests in tests/judge.test.mjs, plus eligibility cases in tests/extract.test.mjs.
  Verify (mechanical): `npm test` passes, with India eligible on a standard Devpost exclusion list, India excluded when listed, US-only fails for India, "age of majority" is 18, and a missing age is "check". In the browser, change the country to "Brazil" and confirm the verdict flips to Not eligible.
  Learner check: Decode the Build With AI rules, enter your age, and see Looks eligible. Then change the country to Brazil and watch it flip, with the receipt showing why.
  Commit: `Add eligibility verdict against your details`

- [x] **3. Get the submission checklist and the prize in rupees**
  Becomes usable: A tickable checklist (video, repo, license, new-work rule, required files, required tech, description, testing access, English, disclosure) with receipts, a collapsible "Other must lines" group, and the prize pool in USD and INR.
  Why now: Completes the decoded ticket, which is the full answer to "what do I need to submit?" before saving is added.
  PRD ref: `prd.md > Submission checklist`, `prd.md > Prize pool in rupees`
  Spec ref: `spec.md > Decoder — src/lib/extract.js`, `spec.md > Page — index.html, styles.css, src/app.js, src/ui/render.js`
  Build: findRequirements (detector table), findOtherMusts (requirements zone and boilerplate filter) and findPrize in extract.js, plus the checklist and prize UI. Tests in tests/extract.test.mjs.
  Verify (mechanical): `npm test` passes: the video max is 3 min with YouTube/Vimeo, the repo hosts are GitHub/GitLab/Bitbucket, the license is detected (and MIT when named), the required files are scope.md/prd.md/spec.md, and the prize is $2,500 → ₹2,20,000 at 88. In the browser the checklist renders with receipts and ticking works.
  Learner check: Decode the Build With AI rules, read the checklist, and open the "Repo must include" receipt. It should quote the sentence naming scope.md, prd.md and spec.md.
  Commit: `Add submission checklist and INR prize pool`

- [x] **4. Save hackathons, track progress, and add the deadline to your calendar**
  Becomes usable: Save to My hackathons, a list sorted by real deadline with countdowns, badges and "x/y done", reopening a saved ticket, ticks that persist, remove with confirm, and .ics download with 1-day and 3-hour reminders.
  Why now: This closes the core loop (come back as deadlines approach) once the ticket is complete.
  PRD ref: `prd.md > My hackathons`, `prd.md > Calendar export`, `prd.md > The Core Journey` (steps 6–8)
  Spec ref: `spec.md > Storage — src/lib/store.js`, `spec.md > Calendar — src/lib/ics.js`, `spec.md > Data Model`
  Build: src/lib/store.js, src/lib/ics.js, the My hackathons tab, and the save, tick, remove and download wiring. Tests in tests/store.test.mjs and tests/ics.test.mjs.
  Verify (mechanical): `npm test` passes (upsert without duplicates, sort order, blocked-storage fallback, ICS escaping, folding and alarms). In the browser, save two hackathons, reload, and confirm both are listed in deadline order and ticks persist. Confirm the ICS text has DTSTART 20261026T210000Z.
  Learner check: Save two hackathons, reload the page, open My hackathons, tick an item, reload again, and import the downloaded .ics into Google Calendar.
  Commit: `Save hackathons, track checklist progress, export .ics`

- [x] **5. Try it without pasting: samples, friendly edge states, and a real-world accuracy check**
  Becomes usable: Two fictional samples (one global, one US-and-Canada-only), the empty-paste, not-rules, no-deadline and assumed-UTC states, a closed-deadline display, and a corpus-check script with recorded accuracy on real rules pages.
  Why now: Judges and new users need a one-click way in, and the edge states make it a complete product. The corpus check settles the spec's useful unknown.
  PRD ref: `prd.md > Samples`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Samples — src/samples.js`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues`
  Build: src/samples.js, the sample menu, state messages, scripts/corpus-check.mjs, and polish (responsive layout, dark mode, focus states).
  Verify (mechanical): `npm test` passes, including both samples decoding as expected. `npm run corpus -- ../_Oct2026_rules` runs and its results are recorded under Revisions. In the browser, check the empty paste, a random paragraph (not rules), both samples, and a mobile width of 375 px.
  Learner check: Click Try a sample → the US-and-Canada-only challenge and confirm it says Not eligible for India with a receipt. Then try the app on your phone width.
  Commit: `Add samples, edge states and corpus check`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1 (paste the real Build With AI rules and confirm the IST deadline). *Pending: Yashvardhan. The agent ran an automated browser check instead (see Revisions).*
- [ ] Final kick-the-tires exploration and feedback completed. *Pending: Yashvardhan, before recording the video.*

## Final Review

- [ ] Rebuild the UI to a premium standard in React + Vite on the shared design kit, with a landing page plus the app in AppShell, the default palette, and fully offline. The decoder and the 54 tests are kept. *Requested by Yashvardhan on 2026-10-13. Implemented and agent-verified (see Revisions). Waiting for Yashvardhan to retry it.*
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap. *Pending: Yashvardhan (about 5 minutes with `devpost/app-map.html` open beside the editor).*
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate. *Pending: Yashvardhan.*
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse. *Generated from commit 624b2a2 and checked by the agent in the browser (renders offline, paths and function names verified against the source). Not yet shown to Yashvardhan.*

Activity and evidence: Not yet done with the learner. Prepared material: the PRD criterion "Oct 26, 2026 @ 5:00pm EDT → Tue, 27 Oct 2026, 2:30 AM IST" → first test in `tests/time.test.mjs` → browser check. Also the corpus-check findings recorded under Revisions (US-sanctions false positive, "1-minute clip" minimum, other project's MIT licence).
Route and stops: Reference route only (not toured), updated after the React rebuild: `src/app/RuleDostApp.tsx` `decodeText()` → `src/lib/extract.js` `findDeadline()` with `src/lib/time.js` `findDateTimes()`/`toUtc()` → `src/ui/TicketParts.tsx` `DeadlineBlock()` (receipts: `src/ui/Receipt.tsx`).
Edit outcome: Not offered yet.
Reflection: Not offered yet.
Activity mode: Pending. Suggested: guided route with the live app and editor.

## Revisions

- Slice 1 verification (agent): `npm test` 19/19 passed. In the browser pane, the real *Build With AI: Basics* Rules page (local copy, not committed) decoded to "Tue, 27 Oct 2026 / 2:30 AM IST", "Page says: Oct 26, 2026 @ 5:00pm EDT", with date-shift and late-night notes, a live countdown and receipts. A probe over the 13 real Rules pages in `_Oct2026_rules/` found the correct deadline in all 13, including PDT/PST across the DST change, MSK, UTC and IST. The browser reported the legacy zone name `Asia/Calcutta`, so `detectTimeZone()` now maps legacy names to canonical ones (`Asia/Kolkata`).
- Slice 2 verification (agent): `npm test` 30/30 passed. In the browser, the real Build With AI rules showed "Looks eligible" for India at age 20. Changing the country to Brazil flipped it to "Not eligible: Brazil is listed as excluded", and the profile persisted in localStorage. On the real pages the build found what the plan hadn't assumed: (1) Devpost's exclusion sentence mentions "the laws of the United States" and "the U.S. Treasury", which would wrongly exclude US students, so those phrases are now ignored when matching; (2) YouCam excludes Italy and China, and GitLab excludes China, both now caught; (3) prize-category sentences ("Submissions from teams with … a currently enrolled student") were being read as entry conditions and are now skipped; (4) "aged 14 and above" and short "Eligibility: ALL students" lines were added as patterns. The receipt for the excluded-countries row now highlights the list itself.
- Slice 3: the checklist detectors, the other-must sweep and the prize live in a new `src/lib/requirements.js` instead of `extract.js` (which calls them). Money formatting is in `src/lib/money.js`. Checklist items carry `receipts: []` (one or two) instead of a single `receipt`, because a video rule is often split across two sentences (length, then platform). This is an internal change with no effect on what the learner gets.
- Slice 3: the Rules tab alone states only individual cash prizes ("$1,250 USD in cash"). The pool ("$2,500 in prizes") is on the Overview tab. The prize block now shows **Prize pool** when a pool is stated and otherwise **Top prize**, with a hint to paste the Overview too. Rupee pools ("₹ 50,000 in prizes") show the USD equivalent. This changes the PRD's example wording slightly and keeps the same intent (prize in rupees).
- Slice 3 tuning on real pages: a "1-minute clip" minimum (Nebius physical-AI track) was being read as the video limit, so maxima are now preferred and "at least N minutes" is ignored. A gitlab sentence about someone else's MIT-licensed project was taken as the license rule, so sentences about "the repository" now win. Legal and generic boilerplate ("Judges are not required…", "free of charge…", representative clauses) is filtered from the other-must list. Verification (agent): `npm test` 41/41. In the browser, the Build With AI rules show 10 checklist items with receipts, ticks update "x/10 done", and with the Overview pasted too the prize pool reads "$2,500 ≈ ₹2,20,000".
- Slice 4 verification (agent): `npm test` 51/51. In the browser, the agent saved *Life After Code* and *Build With AI: Basics* and reloaded. My hackathons listed them soonest-first (2:30 AM IST before 6:30 PM IST on 27 Oct) with countdowns, "Looks eligible" badges and "2/10 done". Ticks made after saving persisted, opening a card and ticking persisted, and Remove (confirm) removed it and updated the tab count. The captured .ics had `DTSTART:20261026T210000Z`, the summary, and `-P1D`/`-PT3H` alarms. Importing into Google Calendar is left to the learner check.
- Slice 5, the spec's useful unknown ("can pattern matching handle real rules pages?"): `npm run corpus -- ../_Oct2026_rules` decoded 39 real Devpost page copies (Rules, Overview and Dates tabs of 13 hackathons). A deadline was found in 39/39. On the 13 Rules pages, every deadline was checked by hand against the stated time and is correct, including the PDT-to-PST change and MSK, UTC and IST. A minimum age was found on 11/13 Rules pages (the other two state none), and the country exclusion list on all 9 Devpost-template pages, which catch Italy (YouCam) and China (GitLab, YouCam). Video and repo rules were found wherever the page states them (Qloo's Rules page has no video rule). Remaining limit: non-template pages (IEEE's emoji bullet lists) give "Check" rows rather than verdicts, which is the designed fallback.
- Slice 5 bug found: an earlier scripted edit had put two literal backspace characters into the "Eligibility: …" line regex in `extract.js` (a Python `\b` escape). This silently disabled its "criteria/requirements" guard. It is now fixed, and a full scan found no other control characters. Lesson: make regex edits with the editor, not through shell-escaped scripts.
- Slice 5 polish: identical period ranges (Registration = Submission) are merged into one key-date row; the header no longer sticks on screens under 900 px; and "Eligibility: …" lines that are really age or residency rules no longer become duplicate conditions. Verification (agent): `npm test` 54/54. In the browser: empty paste, a non-rules paragraph, no deadline, no time zone (assumed-UTC warning) and a closed deadline ("Closed 279 days ago") all show their PRD states. Both samples work (Monsoon: Sat 21 Nov 3:30 AM IST with date-shift and late-night notes; Northern Lights: Not eligible for India). At 375 px in light mode there is no horizontal scroll.
- Post-build review (agent): in a reopened saved ticket, the "x/y done" counter read a stale copy of the ticks after the second tick. The saved view now mutates one ticks object in place. Verified in the browser (three ticks → 5/10, untick → 2/10, storage matches).
- Ship prep: added a `#sample=<id>` deep link (for example `index.html#sample=northern`) so a deployed demo or the README can open a sample directly. It reuses the existing sample flow and adds no new scope. README screenshots (`docs/`) were taken with local headless Edge from those links. The required-tech detector now also accepts a plain "must use / integrate / leverage …" (the Northern Lights sample's "must use at least one city open-data API" was falling through to other-musts).
- UI rebuild (Yashvardhan's request, 2026-10-13). The vanilla page (`index.html` + `styles.css` + `src/app.js` + `src/ui/render.js` + `scripts/serve.mjs`) was replaced by React 18 + Vite 6 + Tailwind v4 on the shared kit, copied unchanged into `src/kit/`. It has a landing page (`src/landing/`) and the app in `AppShell` (`src/app/`), with shared ticket components in `src/ui/`. The decoder in `src/lib/` is unchanged apart from two wording tweaks in `judge.js` ("Add your age in Your details…", because the details panel is no longer "above"). It is typed for TypeScript through `.d.ts` files, and `npm test` still runs 54/54.

  What the rebuild ran into:
  1. The kit's `SearchPill` is not controlled, and its `AppShell` has no navigation below 768px. Following the kit conventions, I added a controlled `SearchField` and a `MobileTabBar` in `src/app/parts.tsx`.
  2. An editable name input in the Panel title slot forced a 535px layout on phones. It was replaced by a wrapping heading with a rename button.
  3. Testing the CSP against the production build showed that Vite inlines tiny font subsets as `data:` URIs, so `font-src` includes `data:`.
  4. The first decode lazily loads font files from the site itself (the second decode makes 0 requests). So the landing stat says "Sent to a server: 0 bytes" instead of "0 network requests".
  5. Dark mode is dropped, because the design system's daylight theme is light only (`prd.md > Look and Feel` updated).

  Verification (agent):
  - `tsc -b` and `vite build` pass, and `npm test` passes 54/54.
  - In the browser: decode of both samples, Save, ticks persisting after save, rename, My hackathons (filters, search, open, remove), and `.ics` capture (`DTSTART:20261205T075900Z`, both alarms). No horizontal scroll at 375px.
  - Gallery screenshots were saved in `docs/screenshots/` at 1440px and 375px.
