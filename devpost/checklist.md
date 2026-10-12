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

- [ ] **2. See whether you can enter: an eligibility verdict against your details**
  Becomes usable: A Your details strip (country, age, time zone, INR rate) saved in the browser, and an eligibility block with age, country and special-condition rows plus an overall badge, each row with a receipt.
  Why now: "Can I even enter?" is the second question a student asks. It also exercises the profile to verdict wiring that the saved list reuses.
  PRD ref: `prd.md > Eligibility verdict`, `prd.md > The Core Journey` (step 2, 4.4)
  Spec ref: `spec.md > Judge — src/lib/judge.js`, `spec.md > Decoder — src/lib/extract.js`, `spec.md > Data Model`
  Build: findEligibility in extract.js, src/lib/judge.js, and the profile strip and eligibility block in render.js and app.js. Tests in tests/judge.test.mjs, plus eligibility cases in tests/extract.test.mjs.
  Verify (mechanical): `npm test` passes, with India eligible on a standard Devpost exclusion list, India excluded when listed, US-only fails for India, "age of majority" is 18, and a missing age is "check". In the browser, change the country to "Brazil" and confirm the verdict flips to Not eligible.
  Learner check: Decode the Build With AI rules, enter your age, and see Looks eligible. Then change the country to Brazil and watch it flip, with the receipt showing why.
  Commit: `Add eligibility verdict against your details`

- [ ] **3. Get the submission checklist and the prize in rupees**
  Becomes usable: A tickable checklist (video, repo, license, new-work rule, required files, required tech, description, testing access, English, disclosure) with receipts, a collapsible "Other must lines" group, and the prize pool in USD and INR.
  Why now: Completes the decoded ticket, which is the full answer to "what do I need to submit?" before saving is added.
  PRD ref: `prd.md > Submission checklist`, `prd.md > Prize pool in rupees`
  Spec ref: `spec.md > Decoder — src/lib/extract.js`, `spec.md > Page — index.html, styles.css, src/app.js, src/ui/render.js`
  Build: findRequirements (detector table), findOtherMusts (requirements zone and boilerplate filter) and findPrize in extract.js, plus the checklist and prize UI. Tests in tests/extract.test.mjs.
  Verify (mechanical): `npm test` passes: the video max is 3 min with YouTube/Vimeo, the repo hosts are GitHub/GitLab/Bitbucket, the license is detected (and MIT when named), the required files are scope.md/prd.md/spec.md, and the prize is $2,500 → ₹2,20,000 at 88. In the browser the checklist renders with receipts and ticking works.
  Learner check: Decode the Build With AI rules, read the checklist, and open the "Repo must include" receipt. It should quote the sentence naming scope.md, prd.md and spec.md.
  Commit: `Add submission checklist and INR prize pool`

- [ ] **4. Save hackathons, track progress, and add the deadline to your calendar**
  Becomes usable: Save to My hackathons, a list sorted by real deadline with countdowns, badges and "x/y done", reopening a saved ticket, ticks that persist, remove with confirm, and .ics download with 1-day and 3-hour reminders.
  Why now: This closes the core loop (come back as deadlines approach) once the ticket is complete.
  PRD ref: `prd.md > My hackathons`, `prd.md > Calendar export`, `prd.md > The Core Journey` (steps 6–8)
  Spec ref: `spec.md > Storage — src/lib/store.js`, `spec.md > Calendar — src/lib/ics.js`, `spec.md > Data Model`
  Build: src/lib/store.js, src/lib/ics.js, the My hackathons tab, and the save, tick, remove and download wiring. Tests in tests/store.test.mjs and tests/ics.test.mjs.
  Verify (mechanical): `npm test` passes (upsert without duplicates, sort order, blocked-storage fallback, ICS escaping, folding and alarms). In the browser, save two hackathons, reload, and confirm both are listed in deadline order and ticks persist. Confirm the ICS text has DTSTART 20261026T210000Z.
  Learner check: Save two hackathons, reload the page, open My hackathons, tick an item, reload again, and import the downloaded .ics into Google Calendar.
  Commit: `Save hackathons, track checklist progress, export .ics`

- [ ] **5. Try it without pasting: samples, friendly edge states, and a real-world accuracy check**
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

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [pending]
Route and stops: [pending]
Edit outcome: [pending]
Reflection: [pending]
Activity mode: [pending]

## Revisions

- Slice 1 verification (agent): `npm test` 19/19 passed. In the browser pane, the real *Build With AI: Basics* Rules page (local copy, not committed) decoded to "Tue, 27 Oct 2026 / 2:30 AM IST", "Page says: Oct 26, 2026 @ 5:00pm EDT", with date-shift and late-night notes, a live countdown and receipts. A probe over 12 real rules pages in `_Oct2026_rules/` found the correct deadline in all 12, including PDT/PST across the DST change, MSK, UTC and IST. The browser reported the legacy zone name `Asia/Calcutta`, so `detectTimeZone()` now maps legacy names to canonical ones (`Asia/Kolkata`).
