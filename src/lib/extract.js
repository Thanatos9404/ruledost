// The decoder: pasted rules text → a "decoded ticket". Every fact carries a receipt —
// the sentence it came from, with the phrase that produced it marked.

import { normalize, toLines, toSentences, makeReceipt } from './text.js';
import { findDateTimes, toUtc } from './time.js';
import { placeSpans, stripNonListings } from './countries.js';
import { findRequirements, findOtherMusts, findPrize } from './requirements.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NAV = /^(log in|sign up|login|join hackathon|join a hackathon|hackathons|projects|overview|rules|resources|devpost|descend|my projects|participants( \(\d+\))?|project gallery|updates|discussions|host a hackathon|blog|help desk|schedule|prizes|judges)$/i;

/** Decode pasted rules text. `now` is used only to guess a missing year. */
export function decodeRules(raw, { now = Date.now() } = {}) {
  const text = normalize(raw);
  const lines = toLines(text);
  const sentences = toSentences(lines);
  const dated = datedLines(lines, now);

  const deadline = findDeadline(dated);
  const keyDates = findKeyDates(dated);
  const eligibility = findEligibility(lines, sentences);

  const submission = keyDates.find((k) => /submission/i.test(k.label));
  const submissionStart = submission ? `${MONTH_SHORT[submission.from.parts.m - 1]} ${submission.from.parts.d}, ${submission.from.parts.y}` : null;
  const ctx = { lines, sentences, submissionStart };
  const requirements = findRequirements(ctx);
  const quotes = requirements.flatMap((r) => r.receipts.map((q) => q.quote.replace(/^… | …$/g, '')));
  const used = new Set(sentences.filter((s) => quotes.some((q) => s.text.includes(q) || q.includes(s.text))).map((s) => s.text));
  const otherMusts = findOtherMusts(ctx, used);
  const prize = findPrize(ctx);

  const ticket = {
    v: 1,
    name: findName(lines),
    deadline,
    keyDates,
    eligibility,
    requirements,
    otherMusts,
    prize,
  };
  ticket.found = (deadline ? 1 : 0) + keyDates.length
    + (eligibility.minAge ? 1 : 0) + (eligibility.excluded ? 1 : 0) + (eligibility.restrictedTo ? 1 : 0)
    + eligibility.conditions.length + requirements.length + (prize ? 1 : 0);
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

// ---------- eligibility ----------

const NUMBER_WORDS = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, 'twenty-one': 21, 'twenty one': 21,
};
const AGE_RES = [
  /\bages?\s+(\d{1,2})\s*\+/i,
  /\b(\d{1,2})\s*\+\s*only\b/i,
  /\bat least (?:the age of )?(\d{1,2}|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:[- ]one)?)(?:\s*\(\d{1,2}\))?\s*(?:years|yrs)/i,
  /\b(\d{1,2}) years (?:of age )?or older\b/i,
  /\bminimum age (?:is|of) (\d{1,2})\b/i,
  /\baged? (\d{1,2}) (?:and|or) (?:above|over|older)\b/i,
];

function findMinAge(sentences) {
  for (const s of sentences) {
    for (const re of AGE_RES) {
      const m = re.exec(s.text);
      if (!m) continue;
      const raw = m[1].toLowerCase();
      const value = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
      if (!(value >= 5 && value <= 30)) continue;
      return { value, note: `At least ${value} years old.`, receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]) };
    }
  }
  for (const s of sentences) {
    const m = /\bage of majority\b/i.exec(s.text);
    if (m && !/\bparent|guardian\b/i.test(s.text)) {
      return {
        value: 18,
        note: '"Age of majority" where you live: 18 in India (it varies by country).',
        receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]),
      };
    }
  }
  return null;
}

const RESTRICT_RE = /\b(?:open only to|only open to|is open to|are open to|open to (?:legal )?residents of|limited to|restricted to|must be (?:a )?(?:legal )?(?:residents?|citizens?) of)\b/i;
const EXCLUDE_RE = /\b(?:not open to|not eligible|not be (?:a )?residents? of|exclud(?:ing|ed|es)|void (?:in|where)|prohibited)\b/i;
const CONDITION_RES = [
  /\bopen only to (?:members|participants|employees|students|developers|individuals who|those who|registered)[^.;]*/i,
  /\bmust be (?:a |an )?(?:current(?:ly)? )?(?:member|enrolled|employed|student)[^.;]*/i,
  /\bwho are employed by or authorized to act on behalf of[^.;]*/i,
  /\b(?:currently )?enrolled (?:full-time |part-time )?(?:students?|in an accredited)[^.;]*/i,
  /\bhave an active and valid [^.;]*account[^.;]*/i,
];
const CONDITION_SKIP = /\b(employees? of (?:the )?(?:sponsor|administrator|organi[sz]er)|immediate family|household|judge|promotion entities|prize|award|bonus|category)\b|^submissions? from\b/i;

function placeCount(text) {
  return new Set(placeSpans(text).map((p) => p.name)).size;
}

/** Eligibility facts: minimum age, excluded places, "open only to" places, special conditions. */
export function findEligibility(lines, sentences) {
  const minAge = findMinAge(sentences);

  // "Open only to residents of X and Y" (geographic restriction)
  let restrictedTo = null;
  let restrictedSentence = null;
  for (const s of sentences) {
    const m = RESTRICT_RE.exec(s.text);
    if (m && !/\bnot\b/i.test(s.text.slice(0, m.index + m[0].length)) && placeCount(s.text) >= 1
      && /\b(?:resident|citizen|located|living|domiciled)/i.test(s.text)
      && !/\ball (?:countries|nations)\b|\bworldwide\b|\bglobally\b|\bany country\b|\bexcept\b/i.test(s.text)) {
      restrictedTo = { receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]) };
      restrictedSentence = s.text;
      break;
    }
  }

  // Excluded places: a "NOT open to" heading followed by a list, or a sentence that both excludes and names 2+ places.
  let excluded = null;
  // Highlight the list itself: from the first named place after the list marker to the last.
  const listMark = (text) => {
    let from = 0;
    for (const re of [/including,? but not limited to,?/i, /following (?:countries|locations|regions|territories)[^:]*:/i, /such as/i, /domiciled in,?/i]) {
      const marker = re.exec(text);
      if (marker) { from = marker.index + marker[0].length; break; }
    }
    const spans = placeSpans(stripNonListings(text)).filter((p) => p.start >= from);
    return spans.length ? [spans[0].start, spans[spans.length - 1].end] : null;
  };
  for (let i = 0; i < lines.length && !excluded; i++) {
    if (/\b(?:is|are)\s+not\s+open\s+to\b/i.test(lines[i])) {
      for (const cand of [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean)) {
        if (placeCount(cand) >= 2) { excluded = { receipt: makeReceipt(cand, listMark(cand)) }; break; }
      }
    }
  }
  if (!excluded) {
    for (const s of sentences) {
      if (s.text !== restrictedSentence && EXCLUDE_RE.test(s.text) && placeCount(s.text) >= 2) {
        excluded = { receipt: makeReceipt(s.text, listMark(s.text)) };
        break;
      }
    }
  }

  // Special conditions: membership, enrolment, employment, accounts — and short "Eligibility: …" lines.
  const conditions = [];
  for (const line of lines) {
    const m = /^\W*eligibility\s*[:\-]\s*(.{3,120})$/i.exec(line);
    if (m && !/(?:criteria|requirements)/i.test(m[1])) {
      conditions.push({ text: `Eligibility: ${m[1].trim()}`, receipt: makeReceipt(line, [line.indexOf(m[1]), line.indexOf(m[1]) + m[1].length]) });
      break;
    }
  }
  for (const s of sentences) {
    if (conditions.length >= 3) break;
    if (CONDITION_SKIP.test(s.text)) continue;
    for (const re of CONDITION_RES) {
      const m = re.exec(s.text);
      if (m) {
        const text = m[0].trim().replace(/\s+/g, ' ');
        const clause = text.length > 160 ? text.slice(0, 157).replace(/\s+\S*$/, '') + '…' : text;
        if (!conditions.some((c) => c.receipt.quote === makeReceipt(s.text, '').quote)) {
          conditions.push({ text: clause.charAt(0).toUpperCase() + clause.slice(1), receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]) });
        }
        break;
      }
    }
  }

  // Devpost Overview pages: "All countries/territories, excluding" / "standard exceptions" (often split over two lines).
  let overviewNote = null;
  for (let i = 0; i < lines.length && !overviewNote; i++) {
    const two = `${lines[i]} ${lines[i + 1] || ''}`;
    const m = /excluding\s+standard exceptions/i.exec(two);
    if (m && m.index < lines[i].length) overviewNote = { receipt: makeReceipt(two.trim(), [m.index, m.index + m[0].length]) };
  }

  return { minAge, excluded, restrictedTo, conditions, overviewNote };
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
