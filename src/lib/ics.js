// Calendar export: one RFC 5545 event at the deadline instant, with reminders 1 day and
// 3 hours before. Times are written in UTC ("Z"), so every calendar shows them in local time.

const pad = (n) => String(n).padStart(2, '0');

/** 20261026T210000Z */
export function icsStamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape TEXT values: backslash, semicolon, comma, newline. */
export function icsEscape(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets (UTF-8), never splitting a character. */
export function icsFold(line) {
  const enc = new TextEncoder();
  const out = [];
  let current = '';
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) {
      out.push(current);
      current = ' ';
      size = 1;
      limit = 75;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n');
}

/** File-name-safe slug: "Build With AI: Basics" → "build-with-ai-basics" */
export function slugify(name) {
  const s = String(name || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, ' ').replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
  return s || 'hackathon';
}

/** Build the .ics text for a ticket with a deadline (returns null without one). */
export function buildIcs(ticket, { now = Date.now() } = {}) {
  if (!ticket || !ticket.deadline) return null;
  const { utc, stated } = ticket.deadline;
  const name = ticket.name || 'Hackathon';
  const slug = slugify(name);
  const description = [
    `The rules say: ${stated}.`,
    ticket.deadline.receipt ? `Receipt: "${ticket.deadline.receipt.quote}"` : '',
    'Decoded by RuleDost. Double-check the official rules page.',
  ].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RuleDost//Hackathon deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${slug}-${icsStamp(utc)}@ruledost`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(utc)}`,
    `DTEND:${icsStamp(utc + 15 * 60000)}`,
    `SUMMARY:${icsEscape(`Submission deadline: ${name}`)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`1 day left: ${name}`)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`3 hours left: ${name}`)}`,
    'TRIGGER:-PT3H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
