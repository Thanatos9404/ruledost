---
doc: scope
status: approved
---
<!-- Approval basis: Yashvardhan delegated this session to Claude Code through a written brief
     (2026-10-12): "make reasonable product decisions on my behalf, recording them in the docs".
     The agent drafted and approved this scope under that brief. Yashvardhan can reopen it at any time. -->

# RuleDost

Paste a hackathon's rules page and RuleDost tells you three things: your real deadline in your own time zone, whether you can actually enter, and what you must submit. Every answer comes with a receipt, meaning the exact sentence from the rules it was taken from. ("Dost" means "friend" in Hindi.)

## The Unique Kernel
**Receipts plus your own clock.** RuleDost doesn't produce a vague summary of the rules. Every deadline, eligibility verdict and checklist item shows the exact sentence from the rules that supports it, so a student can trust the answer without re-reading 30 KB of legal text. The deadline is converted into the student's own time zone, with a date-shift warning such as: "the page says Oct 26, but for you it's 2:30 AM on Tue 27 Oct."

A generic hackathon tracker stores dates you type in yourself, and asking a chatbot gets you an answer you can't check. RuleDost's answers are extracted from the rules and come with the source sentence attached.

## Who It's For
An Indian college student who enters several online hackathons at once. Most of these are run from the US on platforms like Devpost. Deadlines are written in EDT or PDT, the rules run to pages of legal text, and eligibility changes from event to event: age limits, excluded countries, "members of program X only", new code only.

The concrete person is Yashvardhan (BCA, BIT Mesra Jaipur). This month his `_Oct2026_rules/` folder holds the rules of 10+ hackathons, with deadlines in EDT, PDT, PST, UTC, MSK and IST. Today he reads each rules page under time pressure, converts EDT to IST in his head or with a search, keeps notes in text files, and sometimes finds a requirement late (license visible in the repo's About section, video under 3 minutes, required planning docs).

## The Core Loop
1. Open RuleDost.
2. On the hackathon's Rules page, press Ctrl+A and Ctrl+C, then paste into RuleDost.
3. Click Decode and read the deadline in IST with a live countdown, the eligibility verdict and the submission checklist, each item with its receipt.
4. Save it to **My hackathons** and add the deadline to a calendar.

He comes back because the list shows all his hackathons sorted by real (local) deadline, and he ticks off checklist items as he finishes them.

## Inspiration & Identity
- **A railway ticket or exam admit card.** The few facts that matter (date, time, are you allowed in, what to bring) are big and impossible to misread.
- **Receipts.** Evidence quotes look like a printed slip: monospace text with a dashed edge.
- **Tone: a helpful senior ("dost").** Plain, direct and a little warm, with no legal language and no hype.
- **Palette:** calm paper-white with ink-dark text, a marigold accent, and green, amber and red for verdicts. It must also work in dark mode.

## Why This Matters to the Learner
From Yashvardhan's brief: he wants a small, polished, useful app with an India and student angle. His own rules folder for this month is the problem in miniature. The deadline of the hackathon this app is built for ("Oct 26, 2026 @ 5:00pm EDT") is actually 2:30 AM on Oct 27 in Jaipur, so a student reading "Oct 26" could plan for Monday night and still be cutting it close.

## What "Working" Looks Like
He pastes the real Rules page of *Build With AI: Basics*, and within a second RuleDost shows:
- **Deadline:** "Tue, 27 Oct 2026, 2:30 AM IST". Under it: "The page says Oct 26, 2026 @ 5:00pm EDT", a date-shift and late-night warning, and a live countdown.
- **Eligibility: looks eligible.** Age 18+ ✓ and India not in the excluded-countries list ✓, each with its receipt.
- **Checklist:** video under 3 minutes on YouTube or Vimeo; public repo on GitHub, GitLab or Bitbucket with an open-source license; new project built during the submission period; repo must include scope.md, prd.md and spec.md. Each item has its receipt.
- He clicks **Save**, and it appears in My hackathons sorted by IST deadline. **Add to calendar** downloads an .ics file with reminders.

**The "oh, that's cool" beat:** opening a receipt shows the exact sentence from the rules with the key phrase highlighted. Then a second paste, a US-only challenge, comes back "Not eligible", and its receipt shows why.

## The POC Boundary
In:
- Input by pasting text, plus built-in fictional samples so anyone can try it.
- Extraction of: hackathon name, deadline and key dates with time-zone conversion, eligibility (minimum age, excluded or restricted countries, special membership conditions), the submission checklist (video, repo, license, new-work rule, required files, required tech, other "must" lines), and the prize pool in USD and INR.
- A receipt for every extracted item.
- A tiny profile (country, age, time zone) kept in the browser.
- **My hackathons**: a saved list in the browser with checklist ticking and calendar (.ics) export.
- It runs entirely in the browser, offline-capable, with no account, no server and no AI calls at runtime.

## Later
- Paste a URL instead of text. This needs a small proxy server because browsers block cross-site page fetches.
- An optional LLM pass for unusual rule formats (for example through Nebius Token Factory), still required to quote its sources.
- Hindi and other regional-language explanations of each requirement.
- A browser extension that decodes the rules page in place.
- Reminder notifications (push or WhatsApp).

## Explicitly Cut
- **Accounts and cloud sync.** The tracker is personal, and browser storage is enough to prove the loop.
- **Scraping or a hackathon discovery feed.** Discovery is a different product, carries terms-of-service risk, and doesn't prove the kernel.
- **AI-generated summaries in the PoC.** A summary without receipts is exactly the failure RuleDost exists to fix. Pattern-based extraction can be checked, is free, and works offline.
- **Legal guarantees.** RuleDost shows evidence and the student decides. Verdicts say "looks eligible", never "you are eligible".
