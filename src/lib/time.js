// The clock: read dates/times/zones as written in rules pages, convert them to one exact
// instant (epoch ms, UTC), and show that instant in the student's own time zone.
// Uses only the built-in Intl time-zone database — no date library.

/**
 * Zone wordings → either a fixed UTC offset in minutes (explicit standard/daylight
 * abbreviations: the page said exactly which one) or an IANA zone (generic wording like
 * "Eastern Time": daylight saving is applied for the actual date).
 * Ambiguous abbreviations are read as: IST = India, CST = US Central, BST = British Summer Time.
 */
export const ZONES = {
  EDT: { offset: -240, label: 'EDT' },
  EST: { offset: -300, label: 'EST' },
  ET: { iana: 'America/New_York', label: 'ET' },
  'EASTERN DAYLIGHT TIME': { offset: -240, label: 'EDT' },
  'EASTERN STANDARD TIME': { offset: -300, label: 'EST' },
  'EASTERN TIME': { iana: 'America/New_York', label: 'Eastern Time' },
  CDT: { offset: -300, label: 'CDT' },
  CST: { offset: -360, label: 'CST' },
  CT: { iana: 'America/Chicago', label: 'CT' },
  'CENTRAL TIME': { iana: 'America/Chicago', label: 'Central Time' },
  MDT: { offset: -360, label: 'MDT' },
  MST: { offset: -420, label: 'MST' },
  MT: { iana: 'America/Denver', label: 'MT' },
  'MOUNTAIN TIME': { iana: 'America/Denver', label: 'Mountain Time' },
  PDT: { offset: -420, label: 'PDT' },
  PST: { offset: -480, label: 'PST' },
  PT: { iana: 'America/Los_Angeles', label: 'PT' },
  'PACIFIC DAYLIGHT TIME': { offset: -420, label: 'PDT' },
  'PACIFIC STANDARD TIME': { offset: -480, label: 'PST' },
  'PACIFIC TIME': { iana: 'America/Los_Angeles', label: 'Pacific Time' },
  UTC: { offset: 0, label: 'UTC' },
  GMT: { offset: 0, label: 'GMT' },
  'COORDINATED UNIVERSAL TIME': { offset: 0, label: 'UTC' },
  'GREENWICH MEAN TIME': { offset: 0, label: 'GMT' },
  IST: { offset: 330, label: 'IST' },
  'INDIA STANDARD TIME': { offset: 330, label: 'IST' },
  'INDIAN STANDARD TIME': { offset: 330, label: 'IST' },
  BST: { offset: 60, label: 'BST' },
  'BRITISH SUMMER TIME': { offset: 60, label: 'BST' },
  CET: { offset: 60, label: 'CET' },
  CEST: { offset: 120, label: 'CEST' },
  'CENTRAL EUROPEAN TIME': { iana: 'Europe/Berlin', label: 'Central European Time' },
  'CENTRAL EUROPEAN SUMMER TIME': { offset: 120, label: 'CEST' },
  MSK: { offset: 180, label: 'MSK' },
  'MOSCOW TIME': { offset: 180, label: 'MSK' },
  GST: { offset: 240, label: 'GST' },
  SGT: { offset: 480, label: 'SGT' },
  'SINGAPORE TIME': { offset: 480, label: 'SGT' },
  HKT: { offset: 480, label: 'HKT' },
  JST: { offset: 540, label: 'JST' },
  'JAPAN STANDARD TIME': { offset: 540, label: 'JST' },
  KST: { offset: 540, label: 'KST' },
  AEST: { offset: 600, label: 'AEST' },
  AEDT: { offset: 660, label: 'AEDT' },
};

const ABBR_KEYS = Object.keys(ZONES).filter((k) => !k.includes(' ')).sort((a, b) => b.length - a.length);
const WORD_KEYS = Object.keys(ZONES).filter((k) => k.includes(' ')).sort((a, b) => b.length - a.length);
const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Offsets like "UTC+5:30", "GMT -04:00", "UTC+0530"
const OFFSET_RE = /^(?:UTC|GMT)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?(?![\d])/;
const ABBR_RE = new RegExp(`^(?:${ABBR_KEYS.map(ESC).join('|')})(?![A-Za-z])`); // case-sensitive
const WORD_RE = new RegExp(`^(?:${WORD_KEYS.map(ESC).join('|')})(?![A-Za-z])`, 'i');

/** Try to read a zone at the very start of `s` (after optional "(" or spaces). */
export function readZone(s) {
  const lead = /^[\s(,]*/.exec(s)[0].length;
  const rest = s.slice(lead);
  let m = OFFSET_RE.exec(rest);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const minutes = sign * (Number(m[2]) * 60 + Number(m[3] || 0));
    const label = `UTC${m[1]}${m[2]}${m[3] ? ':' + m[3] : ''}`;
    return { zone: { offset: minutes, label }, length: lead + m[0].length, text: m[0] };
  }
  m = WORD_RE.exec(rest);
  if (m) return { zone: ZONES[m[0].toUpperCase()], length: lead + m[0].length, text: m[0] };
  m = ABBR_RE.exec(rest);
  if (m) return { zone: ZONES[m[0]], length: lead + m[0].length, text: m[0] };
  return null;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const DATE_RES = [
  // October 26, 2026 · Oct 26 2026 · November 4th · Sep 29, 2026(12:00 pm …)
  { re: new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])(?:\\s*,?\\s*(\\d{4})(?!\\d))?`, 'gi'), order: 'mdy' },
  // 22nd September 2026 · 26 Oct, 2026
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?:\\s*,?\\s*(\\d{4})(?!\\d))?`, 'gi'), order: 'dmy' },
  // 2026-10-26
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, order: 'ymd' },
];
const TIME_RE = /^[\s(,@-]*(?:at\s+|by\s+|@\s*)?(?:(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s?m\.?|(\d{1,2}):(\d{2})(?::\d{2})?(?![\d])|(\d{1,2})\s*([ap])\.?\s?m\.?|(noon|midnight))(?![A-Za-z])/i;
const TIME_BEFORE_RE = /(?:(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s?m\.?|(\d{1,2}):(\d{2})|(\d{1,2})\s*([ap])\.?\s?m\.?|(noon|midnight))\s*((?:\(?\s*)?[A-Za-z][A-Za-z ]{0,30}?|(?:UTC|GMT)\s*[+-]\s*\d{1,2}(?::?\d{2})?)?\)?\s*(?:on|,)?\s*(?:[A-Za-z]{3,9},?\s*)?$/i;

function timeFromMatch(m, base) {
  // base: index of first capture group of the time alternatives
  const [h12, m12, ap, h24, m24, hOnly, apOnly, word] = m.slice(base, base + 8);
  let hh;
  let mm = 0;
  if (h12 !== undefined) {
    hh = Number(h12) % 12 + (ap.toLowerCase() === 'p' ? 12 : 0);
    mm = Number(m12);
  } else if (h24 !== undefined) {
    hh = Number(h24);
    mm = Number(m24);
  } else if (hOnly !== undefined) {
    hh = Number(hOnly) % 12 + (apOnly.toLowerCase() === 'p' ? 12 : 0);
  } else if (word) {
    hh = word.toLowerCase() === 'noon' ? 12 : 0;
  }
  if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) return null;
  return { hh, mm };
}

/**
 * Find every date (with its time and zone when stated) in one line of text.
 * Returns [{ y, m, d, hh, mm, zone, zoneText, timeAssumed, yearAssumed, index, end, text }].
 */
export function findDateTimes(line, { defaultYear } = {}) {
  const raw = [];
  for (const { re, order } of DATE_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      let y;
      let mo;
      let d;
      if (order === 'mdy') { mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; d = Number(m[2]); y = m[3] ? Number(m[3]) : undefined; }
      else if (order === 'dmy') { d = Number(m[1]); mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; y = m[3] ? Number(m[3]) : undefined; }
      else { y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]); }
      if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) continue;
      raw.push({ y, m: mo, d, index: m.index, end: m.index + m[0].length });
    }
  }
  // Drop overlaps, keeping the longer match.
  raw.sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index));
  const dates = [];
  for (const r of raw) {
    const last = dates[dates.length - 1];
    if (last && r.index < last.end) continue;
    dates.push(r);
  }

  const out = [];
  dates.forEach((dt, i) => {
    const nextStart = i + 1 < dates.length ? dates[i + 1].index : line.length;
    const prevEnd = out.length ? out[out.length - 1].end : 0;
    let start = dt.index;
    let end = dt.end;
    let time = null;
    let zone = null;
    let zoneText = null;

    // Time (and zone) written after the date: "(5:00 pm Eastern Time)", "@ 5:00pm EDT", "at 10:00:00 AM PT"
    const after = line.slice(dt.end, Math.min(nextStart, dt.end + 48));
    const tm = TIME_RE.exec(after);
    if (tm) {
      time = timeFromMatch(tm, 1);
      if (time) {
        end = dt.end + tm[0].length;
        const z = readZone(line.slice(end, Math.min(nextStart, end + 40)));
        if (z) { zone = z.zone; zoneText = z.text; end += z.length; }
      }
    }
    // Or before it: "11:59 PM PT on October 26, 2026", "8 AM PT on October 25"
    if (!time) {
      const beforeText = line.slice(Math.max(prevEnd, dt.index - 48), dt.index);
      const bm = TIME_BEFORE_RE.exec(beforeText);
      if (bm) {
        const t = timeFromMatch(bm, 1);
        if (t) {
          time = t;
          start = dt.index - (beforeText.length - bm.index);
          if (bm[9]) {
            const z = readZone(bm[9]);
            if (z) { zone = z.zone; zoneText = z.text; }
          }
        }
      }
    }
    // A zone right after a date with no time: "October 26, 2026 PT"
    if (!zone) {
      const z = readZone(line.slice(end, Math.min(nextStart, end + 30)));
      if (z && /^[\s(]*[A-Z]/.test(line.slice(end, end + 30))) { zone = z.zone; zoneText = z.text; end += z.length; }
    }
    let { y } = dt;
    const yearAssumed = y === undefined;
    if (yearAssumed) y = defaultYear ?? new Date().getUTCFullYear();
    // Close an unbalanced "(" that our match swallowed so receipts read cleanly.
    let text = line.slice(start, end);
    const opens = (text.match(/\(/g) || []).length;
    const closes = (text.match(/\)/g) || []).length;
    if (opens > closes && line[end] === ')') { end += 1; text = line.slice(start, end); }
    text = text.trim();
    out.push({
      y, m: dt.m, d: dt.d,
      hh: time ? time.hh : 23, mm: time ? time.mm : 59,
      timeAssumed: !time,
      yearAssumed,
      zone, zoneText,
      index: start, end, text,
    });
  });
  return out;
}

// ---------- conversion ----------

const dtfCache = new Map();
function partsFormatter(tz) {
  if (!dtfCache.has(tz)) {
    dtfCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }));
  }
  return dtfCache.get(tz);
}

/** Calendar parts of an instant in a time zone. */
export function localParts(ms, tz) {
  const p = {};
  for (const { type, value } of partsFormatter(tz).formatToParts(new Date(ms))) p[type] = value;
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    hh: Number(p.hour) % 24, mm: Number(p.minute), ss: Number(p.second), weekday: p.weekday,
  };
}

/** Offset of a time zone from UTC, in minutes, at a given instant. */
export function offsetMinutes(ms, tz) {
  const p = localParts(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** Wall-clock time in an IANA zone → epoch ms. */
export function zonedToUtc({ y, m, d, hh, mm }, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMinutes(guess, tz);
  let utc = guess - off1 * 60000;
  const off2 = offsetMinutes(utc, tz);
  if (off2 !== off1) utc = guess - off2 * 60000;
  return utc;
}

/** Parsed date parts (+ zone from ZONES, or null meaning "not stated") → epoch ms (UTC). */
export function toUtc(parts) {
  const { y, m, d, hh, mm, zone } = parts;
  if (zone && zone.iana) return zonedToUtc({ y, m, d, hh, mm }, zone.iana);
  const offset = zone ? zone.offset : 0;
  return Date.UTC(y, m - 1, d, hh, mm) - offset * 60000;
}

// ---------- display ----------

const FRIENDLY_ABBR = {
  'Asia/Kolkata': 'IST', 'Asia/Calcutta': 'IST', 'Asia/Dubai': 'GST', 'Asia/Singapore': 'SGT',
  'Asia/Tokyo': 'JST', 'Asia/Dhaka': 'BST (Dhaka)', 'Asia/Kathmandu': 'NPT', 'Asia/Karachi': 'PKT', 'UTC': 'UTC',
};

/** Short zone label for an instant, e.g. IST, EDT, PST, GMT+1. */
export function zoneAbbrev(ms, tz) {
  if (FRIENDLY_ABBR[tz]) return FRIENDLY_ABBR[tz];
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName');
    return part ? part.value : tz;
  } catch {
    return tz;
  }
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** { date: "Tue, 27 Oct 2026", time: "2:30 AM", zone: "IST" } */
export function formatPieces(ms, tz, { withYear = true } = {}) {
  const p = localParts(ms, tz);
  const h12 = p.hh % 12 === 0 ? 12 : p.hh % 12;
  const ampm = p.hh < 12 ? 'AM' : 'PM';
  return {
    date: `${p.weekday}, ${p.d} ${MONTH_SHORT[p.m - 1]}${withYear ? ' ' + p.y : ''}`,
    time: `${h12}:${String(p.mm).padStart(2, '0')} ${ampm}`,
    zone: zoneAbbrev(ms, tz),
  };
}

/** "Tue, 27 Oct 2026, 2:30 AM IST" */
export function formatInZone(ms, tz, { withZone = true, withYear = true } = {}) {
  const { date, time, zone } = formatPieces(ms, tz, { withYear });
  return `${date}, ${time}${withZone ? ' ' + zone : ''}`;
}

/** Short calendar date of parts: "Mon, 26 Oct". */
export function shortDate({ y, m, d }) {
  const wd = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${wd}, ${d} ${MONTH_SHORT[m - 1]}`;
}

/**
 * Does the calendar date the page states differ from the student's local calendar date?
 * Returns { shifted, statedDate, localDate }.
 */
export function dateShift(ms, stated, tz) {
  const p = localParts(ms, tz);
  const shifted = p.y !== stated.y || p.m !== stated.m || p.d !== stated.d;
  return { shifted, statedDate: shortDate(stated), localDate: shortDate(p) };
}

/** True when the instant falls between midnight and 6 AM in the zone. */
export function isLateNight(ms, tz) {
  const { hh } = localParts(ms, tz);
  return hh >= 0 && hh < 6;
}

const pad = (n) => String(n).padStart(2, '0');

/** Countdown to a target instant. */
export function countdown(target, now = Date.now()) {
  const diff = target - now;
  if (diff <= 0) {
    const ago = -diff;
    const days = Math.floor(ago / 86400000);
    const hours = Math.floor(ago / 3600000);
    const mins = Math.max(1, Math.floor(ago / 60000));
    const label = days >= 1 ? `Closed ${days} day${days === 1 ? '' : 's'} ago`
      : hours >= 1 ? `Closed ${hours} hour${hours === 1 ? '' : 's'} ago`
        : `Closed ${mins} minute${mins === 1 ? '' : 's'} ago`;
    return { past: true, label, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const label = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  return { past: false, label, days, hours, minutes, seconds };
}

/** Time zones offered in "Your details" (the browser's own zone is added if missing). */
export const COMMON_ZONES = [
  'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Kathmandu', 'Asia/Karachi', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'Africa/Lagos', 'Africa/Nairobi', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'UTC',
];

const LEGACY_ZONES = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Etc/UTC': 'UTC' };

/** The browser's time zone (legacy names like Asia/Calcutta canonicalised), or Asia/Kolkata if unavailable. */
export function detectTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    return LEGACY_ZONES[tz] || tz;
  } catch {
    return 'Asia/Kolkata';
  }
}

/** Is this a time zone Intl understands? */
export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
