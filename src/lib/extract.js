// The decoder: pasted rules text → a "decoded ticket". Every fact carries a receipt —
// the sentence it came from, with the phrase that produced it marked.

import { normalize, toLines, toSentences, makeReceipt } from './text.js';
import { findDateTimes, toUtc } from './time.js';

const NAV = /^(log in|sign up|login|join hackathon|join a hackathon|hackathons|projects|overview|rules|resources|devpost|descend|my projects|participants( \(\d+\))?|project gallery|updates|discussions|host a hackathon|blog|help desk|schedule|prizes|judges)$/i;

/** Decode pasted rules text. `now` is used only to guess a missing year. */
export function decodeRules(raw, { now = Date.now() } = {}) {
  const text = normalize(raw);
  const lines = toLines(text);
  const sentences = toSentences(lines);
  const dated = datedLines(lines, now);

  const deadline = findDeadline(dated);
  const keyDates = findKeyDates(dated);
  const ticket = {
    v: 1,
    name: findName(lines),
    deadline,
    keyDates,
  };
  ticket.found = (deadline ? 1 : 0) + keyDates.length;
  return ticket;
}

/** Each line with the dates found in it; a missing year borrows the nearest earlier explicit year. */
function datedLines(lines, now) {
  const firstYear = (() => {
    for (const line of lines) {
      const m = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(20\d\d)\b/i.exec(line)
        || /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d\d)\b/i.exec(line);
      if (m) return Number(m[1]);
    }
    return new Date(now).getUTCFullYear();
  })();
  let lastYear = firstYear;
  return lines.map((line, idx) => {
    const dates = findDateTimes(line, { defaultYear: lastYear });
    for (const d of dates) if (!d.yearAssumed) lastYear = d.y;
    return { line, idx, dates };
  });
}

/** A dated fact with its receipt. */
function dateFact(label, dt, line) {
  return {
    label,
    utc: toUtc(dt),
    stated: dt.text,
    zone: dt.zone ? dt.zone.label : null,
    zoneAssumed: !dt.zone,
    timeAssumed: dt.timeAssumed,
    yearAssumed: dt.yearAssumed,
    parts: { y: dt.y, m: dt.m, d: dt.d, hh: dt.hh, mm: dt.mm },
    receipt: makeReceipt(line, [dt.index, dt.end]),
  };
}

function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bAi\b/g, 'AI');
}

/** The hackathon's name. */
export function findName(lines) {
  // 1. Devpost pages put the name on the line just before "Deadline: …".
  for (let i = 1; i < lines.length; i++) {
    if (/^deadline\s*:/i.test(lines[i])) {
      const prev = lines[i - 1];
      if (prev.length >= 3 && prev.length <= 100 && !NAV.test(prev)) return prev;
    }
  }
  // 2. Page title "Name: tagline - Devpost": prefer another line that is a prefix of it.
  const titleLine = lines.find((l) => /\s-\s*Devpost\s*$/i.test(l));
  if (titleLine) {
    const title = titleLine.replace(/\s*-\s*Devpost\s*$/i, '').trim();
    const prefixes = lines.filter((l) => l !== titleLine && l.length >= 4 && !NAV.test(l) && title.startsWith(l));
    if (prefixes.length) return prefixes.sort((a, b) => b.length - a.length)[0];
    return title.length > 80 ? title.slice(0, 80).replace(/\s+\S*$/, '') + '…' : title;
  }
  // 3. "XYZ HACKATHON (the "Hackathon") Official Rules"
  for (const l of lines) {
    const m = /^(.{3,90}?)\s*(?:\(the "[^"]+"\)\s*)?official rules\b/i.exec(l);
    if (m && /[A-Za-z]/.test(m[1])) return titleCase(m[1].trim());
  }
  // 4. First heading-like line.
  const first = lines.find((l) => l.length >= 4 && l.length <= 80 && !NAV.test(l) && /[A-Za-z]{3}/.test(l) && !/[.:,]$/.test(l));
  return first || 'Untitled hackathon';
}

const JUDGING_ONLY = /\b(judg|winner|announce|registration period)\b/i;

/** The submission deadline: "Deadline:" line → end of Submission Period → a sentence about the deadline. */
export function findDeadline(dated) {
  const pick = (entry, dt) => dateFact('Deadline', dt, entry.line);
  for (const e of dated) {
    if (e.dates.length && /^\W*(?:submission\s+)?deadline\s*[:-]/i.test(e.line)) return pick(e, e.dates[0]);
  }
  for (const e of dated) {
    if (!e.dates.length) continue;
    if (/\bsubmission\s+period\b|\bentry\s+period\b/i.test(e.line) && !/^\W*judging/i.test(e.line)) {
      return pick(e, e.dates.length >= 2 ? e.dates[e.dates.length - 1] : e.dates[0]);
    }
  }
  for (const e of dated) {
    if (!e.dates.length) continue;
    if (/\bsubmission deadline\b|\bsubmissions?\s+(?:are\s+)?(?:due|close)\b|\bdeadline\b|\bmust be (?:submitted|received)\b|\bno later than\b/i.test(e.line)
      && !JUDGING_ONLY.test(e.line)) {
      return pick(e, e.dates[e.dates.length - 1]);
    }
  }
  return null;
}

/** "Registration Period: A – B", "Judging Period: …", "Winners Announced: …". */
export function findKeyDates(dated) {
  const out = [];
  const seen = new Set();
  for (const e of dated) {
    if (!e.dates.length) continue;
    const period = /^\W*([A-Za-z][A-Za-z &/]{2,50}?\s+period)\s*:/i.exec(e.line);
    const winners = /^\W*(winners?\s+(?:announced|announcement))\s*:/i.exec(e.line);
    const m = period || winners;
    if (!m) continue;
    const label = m[1].replace(/\s+/g, ' ').trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const from = dateFact(label, e.dates[0], e.line);
    const to = period && e.dates.length >= 2 ? dateFact(label, e.dates[e.dates.length - 1], e.line) : null;
    out.push({ label, from, to, receipt: makeReceipt(e.line, [m.index, m.index + m[0].length]) });
    if (out.length >= 6) break;
  }
  return out;
}
