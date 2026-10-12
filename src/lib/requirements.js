// Submission checklist detectors, the "other must lines" sweep, and the prize.
// Each detector looks at sentences (with their line index) and returns a checklist item
// { id, title, detail, receipts: [Receipt] } or null.

import { makeReceipt } from './text.js';

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const toNum = (s) => (/^\d+$/.test(s) ? Number(s) : NUM_WORDS[s.toLowerCase()]);

const first = (sentences, test) => sentences.find((s) => test(s.text)) || null;
const receiptOf = (s, re) => {
  const m = re ? re.exec(s.text) : null;
  return makeReceipt(s.text, m ? [m.index, m.index + m[0].length] : null);
};
const listJoin = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`);
const MUSTISH = /\b(must|should|required|requires|need to|include|provide|submit)\b/i;

// ---------- detectors ----------

const MINUTES_RE = /\b((?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\d{1,2}\))?(?:\s*(?:-|to)\s*(?:\d{1,2}|one|two|three|four|five))?)\s*-?\s*minutes?\b/i;
const PLATFORMS = ['YouTube', 'Vimeo', 'Youku', 'Facebook Video', 'Loom', 'Google Drive'];

function video({ sentences, lines }) {
  // The length rule sometimes sits on its own line under a "video" heading, so look near video lines too.
  const nearVideo = (s) => /\bvideo\b/i.test(s.text) || [1, 2, 3].some((k) => /\bvideo\b/i.test(lines[s.line - k] || ''));
  const before = (s) => { const m = MINUTES_RE.exec(s.text); return s.text.slice(Math.max(0, m.index - 30), m.index); };
  const lengthCands = sentences.filter((s) => MINUTES_RE.test(s.text) && nearVideo(s)
    && !/judges are not required|watch beyond|minutes? (?:of|per) (?:judging|presentation)|office hours|session/i.test(s.text)
    && !/at least|minimum|no less than/i.test(before(s)));
  // Prefer an explicit maximum ("less than three (3) minutes", "no longer than 5 minutes", "1-3 minute").
  const lengthS = lengthCands.find((s) => /less than|under|no longer|not exceed|maximum|max\.?|up to|within|shorter|between|\d\s*-\s*\d/i.test(before(s) + MINUTES_RE.exec(s.text)[0]))
    || lengthCands[0];
  const platformS = sentences.find((s) => PLATFORMS.some((p) => s.text.includes(p)) && nearVideo(s));
  if (!lengthS && !platformS) return null;
  const parts = [];
  const receipts = [];
  if (lengthS) {
    const m = MINUTES_RE.exec(lengthS.text);
    const nums = m[1].match(/\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten/gi).map(toNum).filter(Boolean);
    const max = Math.max(...nums);
    const under = /less than|under|shorter than|below/i.test(lengthS.text.slice(Math.max(0, m.index - 25), m.index));
    const unit = max === 1 ? 'minute' : 'minutes';
    parts.push(under ? `Under ${max} ${unit}` : `Up to ${max} ${unit}`);
    receipts.push(makeReceipt(lengthS.text, [m.index, m.index + m[0].length]));
  }
  if (platformS) {
    const found = PLATFORMS.filter((p) => platformS.text.includes(p));
    parts.push(`on ${listJoin(found)}`);
    if (/public(?:ly)?\b/i.test(platformS.text)) parts.push('public');
    if (platformS !== lengthS) receipts.push(receiptOf(platformS, new RegExp(found.join('|'))));
  }
  return { id: 'video', title: 'Demo video', detail: parts.join(' · '), receipts };
}

const HOSTS = ['GitHub', 'GitLab', 'Bitbucket'];

const hostsIn = (text) => HOSTS.filter((h) => new RegExp(`\\b${h}\\b`, 'i').test(text));

function repo({ sentences }) {
  const cands = sentences.filter((x) => /\b(?:code )?repo(?:sitory)?\b/i.test(x.text)
    && (hostsIn(x.text).length || /\b(?:url|link|public)\b/i.test(x.text)) && MUSTISH.test(x.text));
  // Prefer the sentence that names where to host it.
  const s = cands.find((x) => hostsIn(x.text).length) || cands[0];
  if (!s) return null;
  const sameLine = sentences.filter((x) => x.line === s.line).map((x) => x.text).join(' ');
  const hosts = hostsIn(sameLine);
  const parts = [];
  if (/private and shared|or private\b/i.test(sameLine)) parts.push('Public, or private and shared with the organisers');
  else if (/\bpublic\b/i.test(sameLine)) parts.push('Public');
  if (hosts.length) parts.push(`on ${listJoin(hosts)}`);
  return {
    id: 'repo', title: 'Code repository', detail: parts.join(' ') || 'Link to your code repository',
    receipts: [receiptOf(s, hostsIn(s.text).length ? new RegExp(hostsIn(s.text).join('|'), 'i') : /repo(?:sitory)?/i)],
  };
}

const LICENSE_RE = /open[- ]source licen[cs]e(?: file)?|licen[cs]e file|\bMIT[- ]licen[cs]ed|\bMIT licen[cs]e|\bApache(?: 2\.0)? licen[cs]e|OSI[- ]approved/i;

function license({ sentences }) {
  const candidates = sentences.filter((s) => LICENSE_RE.test(s.text) && !/commercial licen|licen[cs]e agreement|licen[cs]e to use|grants? (?:to )?sponsor/i.test(s.text));
  // Prefer "the repository must … license" over passing mentions of someone else's licensed project.
  const s = candidates.find((c) => MUSTISH.test(c.text) && /\b(?:your|the) (?:code )?repo(?:sitory)?\b/i.test(c.text))
    || candidates.find((c) => MUSTISH.test(c.text) && !/\boriginal\b/i.test(c.text))
    || candidates[0];
  if (!s) return null;
  const sameLine = sentences.filter((x) => x.line === s.line).map((x) => x.text).join(' ');
  const kind = /\bMIT\b/.test(s.text) ? 'MIT license file' : /\bApache\b/.test(s.text) ? 'Apache license file' : 'Open-source license file';
  const about = /About section|top of the repository/i.test(sameLine);
  return {
    id: 'license', title: 'Open-source license', detail: about ? `${kind}, visible in the repo's About section` : `${kind} in the repo`,
    receipts: [receiptOf(s, LICENSE_RE)],
  };
}

function newWork({ sentences, submissionStart }) {
  const re = /newly created|new projects? only|conceived of and built within|created (?:during|after|within) the|built during the|significantly updated/i;
  const s = first(sentences, (t) => re.test(t));
  if (!s) return null;
  const updatedOk = /significantly updated|either newly created/i.test(s.text);
  const since = submissionStart ? ` (started ${submissionStart} or later)` : '';
  return {
    id: 'new-work', title: updatedOk ? 'New or significantly updated' : 'New code only',
    detail: updatedOk ? 'New, or significantly updated during the submission period. Explain what changed.' : `Build it during the submission period${since}. Old ideas are fine, old code is not.`,
    receipts: [receiptOf(s, re)],
  };
}

const FILE_RE = /\b[\w-]+\.(?:md|txt|json|ya?ml|pdf|ipynb)\b/gi;

function files({ sentences }) {
  const s = first(sentences, (t) => MUSTISH.test(t) && /\b(?:repo(?:sitory)?|include|contain)\b/i.test(t) && (t.match(FILE_RE) || []).length > 0 && !/https?:|www\./i.test(t));
  if (!s) return null;
  const names = [...new Set(s.text.match(FILE_RE))];
  const firstIdx = s.text.indexOf(names[0]);
  const last = names[names.length - 1];
  const lastIdx = s.text.lastIndexOf(last) + last.length;
  return {
    id: 'files', title: 'Required files', detail: `Repo must include ${listJoin(names).replace(/ or /, ' and ')}`,
    receipts: [makeReceipt(s.text, [firstIdx, lastIdx])],
  };
}

const TECH_RE = /\bmust (?:create|build|develop|use|integrate|leverage|be built|demonstrate use)\b[^.;]{0,140}?\b(?:using|use of|with|on|of|integrat\w*)\b[^.;]{0,90}/i;

function tech({ sentences }) {
  const s = first(sentences, (t) => TECH_RE.test(t) && !/\b(?:hackathon website|devpost account|submission form)\b/i.test(t));
  if (!s) return null;
  const m = TECH_RE.exec(s.text);
  let clause = m[0].replace(/^must\s+/i, '').trim();
  if (clause.length > 150) clause = clause.slice(0, 147).replace(/\s+\S*$/, '') + '…';
  return {
    id: 'tech', title: 'Required tools / tech', detail: clause.charAt(0).toUpperCase() + clause.slice(1),
    receipts: [makeReceipt(s.text, [m.index, m.index + m[0].length])],
  };
}

function simple(id, title, detail, re, extra = () => true) {
  return ({ sentences }) => {
    const s = first(sentences, (t) => re.test(t) && extra(t));
    return s ? { id, title, detail: typeof detail === 'function' ? detail(s.text) : detail, receipts: [receiptOf(s, re)] } : null;
  };
}

const description = simple('description', 'Text description', 'Explain what it does, its features and who it is for',
  /\btext description\b|\bdescription (?:that|which) (?:should )?explains?\b|\bshort description\b|\bproject description\b/i, (t) => MUSTISH.test(t));
const testing = simple('testing', 'Let judges try it', 'Working access for judges: public repo or demo link (credentials if private)',
  /\btesting instructions\b|\blogin credentials\b|\baccess must be provided\b|\bavailable (?:free of charge )?for testing\b/i);
const english = simple('english', 'English', 'All materials in English, or with an English translation',
  /\bin English\b|\bEnglish translation\b/i);
const disclosure = simple('disclosure', 'Disclose what you reused',
  (t) => (/\bAI\b|\bAI tools?\b|coding assistants?/i.test(t) ? 'Disclose the AI tools you used (and any pre-existing code)' : 'Disclose any pre-existing code or work you reused'),
  /\bdisclose\b/i, (t) => !/personal (?:data|information)|confidential/i.test(t));

const DETECTORS = [video, repo, license, newWork, files, tech, description, testing, english, disclosure];

/** Recognised checklist items, in a stable order. */
export function findRequirements(ctx) {
  return DETECTORS.map((d) => d(ctx)).filter(Boolean);
}

// ---------- other "must" lines ----------

const ZONE_START = /^\W*(?:\d+\.\s*)?(?:how to enter|project requirements|submission requirements|what to (?:submit|build|create)|requirements)\b/i;
const ZONE_END = /^\W*(?:\d+\.\s*)?(?:judges?\b(?! period)|judging(?! period)|judging criteria|prizes?\b|intellectual property|entry conditions|publicity|general conditions)/i;
const BOILERPLATE = /indemnif|\brelease\b|liabil|\btax|W-?9|W-?8BEN|affidavit|arbitrat|publicity|warrant|intellectual property|sole discretion|disqualif|governing law|personal information|privacy policy|non-exclusive license|financial or preferential support|third[- ]party (?:trademarks|marks|sdk|integrations?|components)|representative|judges are not required|free of charge and without any restriction|^platforms:|^in order to\b/i;

/** Requirement sentences inside the How-to-enter/Requirements part that no detector claimed. */
export function findOtherMusts({ lines, sentences }, used) {
  let start = lines.findIndex((l) => ZONE_START.test(l));
  let end = lines.length;
  if (start >= 0) {
    const e = lines.findIndex((l, i) => i > start && ZONE_END.test(l));
    if (e > 0) end = e;
  } else {
    start = 0;
  }
  const out = [];
  const seen = new Set();
  for (const s of sentences) {
    if (s.line < start || s.line >= end) continue;
    if (!/\bmust\b|\bis required\b|\bare required\b|\brequired to\b/i.test(s.text)) continue;
    if (s.text.length < 25 || s.text.length > 420 || BOILERPLATE.test(s.text) || /:\s*$/.test(s.text)) continue;
    if (used.has(s.text)) continue;
    const key = s.text.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: s.text, receipt: receiptOf(s, /\bmust\b|\brequired\b/i) });
    if (out.length >= 10) break;
  }
  return out;
}

// ---------- prize ----------

const AMOUNT = String.raw`(\$|₹|\bINR\s?|\bRs\.?\s?|\bUSD\s?)\s?(\d[\d,]*(?:\.\d+)?)(\+)?(?:\s*(?:USD|INR))?`;
const POOL_RE = new RegExp(`${AMOUNT}\\s*(?:in prizes|in total prizes|total prizes?|prize pool|in cash and prizes|worth of prizes)|prize pool (?:of |worth )?${AMOUNT}`, 'i');
const CASH_RE = new RegExp(`${AMOUNT}\\s*(?:USD\\s*)?(?:in cash|cash prize)?`, 'gi');

function money(sym, num, plus) {
  const amount = Number(String(num).replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = /₹|INR|Rs/i.test(sym) ? 'INR' : 'USD';
  return { amount, currency, plus: Boolean(plus) };
}

/** Prize pool if stated ("$2,500 in prizes"), otherwise the top single cash prize. */
export function findPrize({ sentences }) {
  for (const s of sentences) {
    const m = POOL_RE.exec(s.text);
    if (!m) continue;
    const mo = m[1] !== undefined ? money(m[1], m[2], m[3]) : money(m[4], m[5], m[6]);
    if (mo) return { kind: 'pool', ...mo, receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]) };
  }
  let best = null;
  for (const s of sentences) {
    if (/\bcredits?\b|\bfee|\bvalue of\b|\bARV\b|per (?:hour|month)|reimburse/i.test(s.text)) continue;
    if (!/\bin cash\b|\bprize|\baward|\bplace\b|\bwinner/i.test(s.text)) continue;
    CASH_RE.lastIndex = 0;
    let m;
    while ((m = CASH_RE.exec(s.text))) {
      const mo = money(m[1], m[2], m[3]);
      const usd = (x) => (x.currency === 'INR' ? x.amount / 88 : x.amount);
      if (mo && (!best || usd(mo) > usd(best))) {
        best = { kind: 'top', ...mo, receipt: makeReceipt(s.text, [m.index, m.index + m[0].length]) };
      }
    }
  }
  return best;
}
