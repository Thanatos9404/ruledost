---
doc: prd
status: approved
---
<!-- Approval basis: drafted and approved by Claude Code under Yashvardhan's written delegation brief
     (2026-10-12). Product choices below are labelled as agent decisions made under that brief. -->

# RuleDost — Product Requirements

RuleDost is a one-page web app for Indian students who enter online hackathons. They paste a hackathon's rules page and get their real local deadline, an eligibility verdict and a submission checklist, each with a receipt from the rules. Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. **Arrive.** The student opens RuleDost. The header shows the name, the line "Reads the fine print so you don't miss the deadline", and two tabs: **Decode** and **My hackathons (n)**.
2. **Your details.** A compact strip shows *Country* (default "India"), *Age* (empty on first visit), *Time zone* (detected from the browser, e.g. "Asia/Kolkata (IST)") and *INR per USD* (default 88). Changes save immediately and re-check the current result.
3. **Paste.** A large text box says: *"Open the hackathon's Rules page → Ctrl+A → Ctrl+C → paste here."* Below it are **Decode rules** (also Ctrl+Enter) and **Try a sample** (two fictional samples).
4. **Decode.** Within a second, a result "ticket" appears next to the input on desktop, or below it on mobile:
   1. **Name**, editable.
   2. **Deadline block** with a big local date and time, the original wording ("Page says: Oct 26, 2026 @ 5:00pm EDT"), a live countdown, and warnings when the calendar date shifts or the time falls late at night.
   3. **Key dates**: submissions open, judging, winners, converted to local time.
   4. **Eligibility verdict** with one row each for age, country and special conditions.
   5. **Submission checklist** with tickable rows.
   6. **Prize pool** in USD and INR.
   7. Actions: **Save to My hackathons** and **Add to calendar**.
5. **Check a receipt.** Every row has a **receipt** toggle. Opening it shows the exact sentence from the pasted rules, with the phrase that produced the answer highlighted.
6. **Save.** A confirmation appears and the tab count goes up by one. Saving the same hackathon again (same name and deadline) updates the saved entry instead of duplicating it.
7. **Come back.** **My hackathons** lists saved entries sorted by deadline, soonest first, with closed ones at the bottom. Each card shows name, local deadline, countdown, eligibility badge and checklist progress ("3/7 done"). Clicking a card reopens its full ticket, receipts included.
8. **Make progress.** Ticking checklist items on a saved ticket persists. **Add to calendar** downloads an `.ics` file for the deadline with reminders 1 day and 3 hours before.

Success: the student knows when it's really due, whether they can enter, and what to submit, and can show where each answer came from.

## Screens and Layout
A single page with two tabs and no routing beyond them.
- **Decode tab.** On wide screens it has two columns: on the left, *Your details* and the paste box with buttons; on the right, the result ticket. On narrow screens they stack in that order. Before any decode, the right column shows a short "what you'll get" explainer with three bullets.
- **My hackathons tab.** A single column of saved cards. Clicking a card opens its ticket in the same view, with a "← All hackathons" back link.
- The footer says: "Runs entirely in your browser. Nothing you paste leaves this page." There's also a link to the source repository.

## Look and Feel
Carries forward `scope.md > Inspiration & Identity`.
- **Metaphor.** The result is a *ticket / admit card*. The deadline is the largest thing on screen, in big tabular numerals. Receipts are styled like printed slips: monospace text, a pale background and a dashed top edge.
- **Palette (light).** Paper background (#FBF8F1), ink text (#1C1B19), marigold accent (#E8A317) for primary actions and highlights. Verdict colours are leaf green (eligible), amber (check) and brick red (not eligible). Highlights inside receipts use a soft marigold background.
- **Dark mode** follows the system setting, with the same hues adjusted for contrast.
- **Type.** The system UI sans-serif for everything, plus a monospace font for receipts. No web fonts, so it stays fast and works offline.
- **Copy tone.** A helpful senior: short, plain sentences. Verdicts say "Looks eligible" or "Check these", never "Guaranteed".
- **Avoid:** purple gradients, glassmorphism, emoji walls, and generic "AI app" styling.

## Features and Behavior

### Decoding pasted rules
- As a student, I want to paste a rules page and get the key facts so that I don't have to read 30 KB of legal text.
  - [ ] Pasting the real *Build With AI: Basics* rules page and pressing Decode shows the name "Build With AI: Basics".
  - [ ] The input handles text copied from a browser page, including navigation clutter, curly quotes, en dashes and non-breaking spaces.
  - [ ] Decoding happens in the browser with no network request.

### Deadline in your time zone
Kernel. See `scope.md > The Unique Kernel`.
- As an Indian student, I want the deadline in IST so that I don't miss it by a day.
  - [ ] For "Deadline: Oct 26, 2026 @ 5:00pm EDT" and the time zone Asia/Kolkata, the ticket shows **Tue, 27 Oct 2026, 2:30 AM IST**.
  - [ ] The original wording appears under it ("Page says: …").
  - [ ] When the calendar date differs between the page and the student's zone, a warning names both dates.
  - [ ] When the local deadline falls between midnight and 6 AM, a "late-night deadline" note suggests finishing the evening before.
  - [ ] A live countdown shows days, hours, minutes and seconds. After the deadline it shows "Closed N days ago".
  - [ ] Supported zone wordings: ET/EDT/EST/"Eastern Time", PT/PDT/PST/"Pacific Time", CT/CDT/CST, MT/MDT/MST, UTC/GMT (including offsets like UTC+5:30), IST, BST, CET/CEST, MSK, SGT, HKT, JST, KST, AEST/AEDT.
  - [ ] The deadline source is chosen in this order: a "Deadline:" line, then the end of the "Submission Period", then a sentence containing "deadline" or "due" with a date.
- **Key dates.** Each "… Period: start – end" line and the "Winners Announced" line is listed with its local time and a receipt.

### Eligibility verdict
- As a student, I want to know if I can even enter before I spend a weekend building.
  - [ ] **Age:** "age of majority" is read as 18 (the age of majority in India; the note says it varies by country). Explicit numbers are read directly ("at least eighteen years", "18+", "at least 13 years old"). With the student's age entered, the row passes or fails. Without it, the row says "Add your age to check".
  - [ ] **Country (excluded list):** if the student's country is named in the sentence listing excluded places, the row fails ("India is listed as excluded"). Otherwise it passes ("India isn't in the excluded list").
  - [ ] **Country (restricted to):** if a sentence says entry is open only to residents or citizens of named places and the student's country isn't named, the row fails.
  - [ ] **Special conditions:** "open only to members of …", "registered with …", "employed by …" and student-enrollment conditions each become a "Check" row quoting the condition.
  - [ ] **Overall badge:** any fail gives **Not eligible**, any check gives **Check these**, and otherwise it's **Looks eligible**.
  - [ ] If no country rules are found, the country row is "Check" ("No country rules found. Read the Eligibility section.").

### Submission checklist
- As a student, I want every requirement as a tickable list so that nothing surprises me at 2 AM.
  - [ ] Recognised items, each shown with a short title, detail and receipt:
    - **Demo video:** maximum length, allowed platforms, and whether it must be public.
    - **Code repository:** allowed hosts, and whether it must be public.
    - **Open-source license:** license type if named (e.g. MIT), and whether it must be visible in the About section.
    - **New work rule:** "new projects only" (with the start date when known) or "new or significantly updated".
    - **Required files:** for example "scope.md, prd.md, spec.md".
    - **Required tools/tech:** the sentence that says the project must use something.
    - **Text description.**
    - **Testing access** (credentials if private).
    - **English or a translation.**
    - **Disclosure** of AI tools or pre-existing code.
  - [ ] **Other "must" lines:** remaining requirement sentences from the How to Enter and Requirements part of the rules appear in a collapsible group, each with a receipt. Legal boilerplate (indemnity, taxes, publicity) is filtered out.
  - [ ] Ticking items works on the decoded ticket and persists once saved.
  - [ ] When nothing is recognised, the checklist says so plainly.

### Prize pool in rupees
- [ ] "$2,500 in cash" or "$2,500 in prizes" shows as "$2,500 ≈ ₹2,20,000" (Indian digit grouping) at the profile's rate, with the rate stated. No prize found means no prize block.

### My hackathons
- [ ] Save, list, reopen and remove (with a confirm step). Sorted by deadline, closed entries last, and entries with no deadline after that.
- [ ] Each card shows name, local deadline, countdown, eligibility badge and "x/y done".
- [ ] The list survives a page reload and a browser restart (same browser).

### Calendar export
- [ ] **Add to calendar** downloads `<name>-deadline.ics`. It contains one event at the deadline instant (UTC), a summary "Submission deadline: <name>", a description quoting the page's wording, and two reminders (1 day and 3 hours before). It imports into Google Calendar.

### Samples
- [ ] **Try a sample** offers two clearly labelled *fictional* hackathons. One is a global event that looks eligible for India and has a late-night IST deadline. The other is a US-and-Canada-only challenge that comes back Not eligible for India. Sample text is original, not copied from real pages.

## States and Boundaries
- **First visit:** age is empty and the result area shows the "what you'll get" explainer. *My hackathons* is empty: "Nothing saved yet. Decode a rules page and press Save."
- **Empty paste:** "Paste the rules text first." The ticket doesn't change.
- **Doesn't look like rules:** no date and no requirement found → "This doesn't look like a hackathon rules page. Tip: copy the **Rules** tab, not just the Overview."
- **No deadline found but other facts found:** the deadline block says "No deadline found. Search the rules for 'Submission Period'." Everything else still renders, and saving is allowed (sorted last).
- **Time zone not stated:** the deadline is shown with "Time zone not stated; assumed UTC. Double-check."
- **Deadline passed:** the countdown is replaced by "Closed N days ago" and the card is greyed in the list.
- **Storage blocked** (private mode, etc.): saving shows "Couldn't save: your browser is blocking storage." The decode still works.
- **What persists:** the profile and saved decoded tickets (including receipts and ticks). **What doesn't:** the pasted raw text. Only the decoded result is stored.
- **Privacy boundary:** nothing leaves the browser. There's no analytics and no network calls.

## Product Decisions
All decisions below were made by the AI agent under Yashvardhan's delegation brief ("make reasonable product decisions on my behalf, recording them in the docs"). He can revisit any of them.
- **Idea: a hackathon rules decoder.** Chosen over a crop-price explainer or a study planner because it is grounded in a real, observed problem (his own folder of rules pages in five-plus time zones), clearly India- and student-specific, and novel because of the receipts. Its demo moment (a 2:30 AM IST deadline hidden behind "Oct 26") is easy to show in a short video.
- **No AI at runtime.** Pattern-based extraction with receipts, instead of an LLM summary. It is checkable, free, offline, and avoids invented requirements. The trade-off is that unusual rule formats may be missed. The UI says so, and the "Other must lines" group and receipts limit the damage.
- **Paste text instead of entering a URL.** Browsers block fetching other sites' pages without a proxy server, so pasting keeps the app serverless.
- **Browser-only storage.** It's a personal tracker, and accounts would add a login before the useful part.
- **"Age of majority" means 18.** That is correct for India, the target user. The note says it varies elsewhere.
- **INR at an editable fixed rate (default ₹88/USD).** There are no live FX calls (no network). The rate is labelled and editable.
- **Verdict wording says "looks eligible", not "eligible".** RuleDost shows evidence and the student decides.

## What We're Building
Everything under **Features and Behavior**, with the states above: paste → decode → ticket with receipts → save → list → tick → calendar, plus two fictional samples.

## Deferred From the POC
- **URL input.** Needs a proxy server (CORS), which adds hosting and abuse handling.
- **Cross-device sync.** Needs accounts and a database.
- **Reminder notifications.** Need a service worker or push service. The .ics export covers reminders through the student's own calendar.
- **LLM fallback for unusual formats.** Needs an API key, a server and cost, and it must still return receipts.

## Possible Later Enhancements
- A Hindi toggle for checklist explanations.
- A browser extension that decodes the open rules page in place.
- "Diff the rules": show what changed when a rules page is updated mid-hackathon.
- Team mode: share a ticket link with teammates.

## Non-Goals
- **Not legal advice.** It surfaces sentences and doesn't interpret law.
- **Not a hackathon discovery site.** Students already find events on Devpost and similar sites.
- **Not a submission tool.** It never submits anything anywhere.
- **No AI summaries.** Summaries without receipts are the problem this app exists to fix.

## Open Questions
- How well do the patterns cover rules pages from platforms other than Devpost (Unstop, MLH)? This doesn't block the spec. Devpost pages are the PoC target, and other platforms can be checked during or after the build.
