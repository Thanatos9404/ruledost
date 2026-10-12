// Text utilities: normalise pasted page text, split it into lines and sentences,
// and build "receipts" (the exact sentence a fact came from, with the match marked).

const ABBREVIATIONS = /(?:\b(?:U\.S|U\.K|U\.A\.E|e\.g|i\.e|etc|Inc|Ltd|Co|Corp|No|St|Mr|Ms|Mrs|Dr|Jr|Sr|vs|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)|\b[A-Z])$/;

/** Normalise the oddities of text copied from a web page. */
export function normalize(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[     ]/g, ' ')
    .replace(/[​‌‍﻿]/g, '')
    .replace(/…/g, '...')
    .replace(/[ \t]+/g, ' ');
}

/** Non-empty, trimmed lines. */
export function toLines(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Split one line into sentences. Splits after . ! ? or ; when followed by whitespace and
 * an uppercase letter, digit, bullet or opening bracket/quote, but not after common
 * abbreviations like "U.S." or "e.g.".
 */
export function splitSentences(line) {
  const out = [];
  let start = 0;
  const re = /[.!?;](?=\s+["'(\[•\-]?[A-Z0-9•(\[])/g;
  let m;
  while ((m = re.exec(line))) {
    const end = m.index + 1;
    const before = line.slice(start, m.index);
    if (m[0] === '.' && ABBREVIATIONS.test(before)) continue;
    const s = line.slice(start, end).trim();
    if (s) out.push(s);
    start = end;
  }
  const rest = line.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** All sentences of a document as { text, line } (line = index into lines). */
export function toSentences(lines) {
  const out = [];
  lines.forEach((line, i) => {
    for (const s of splitSentences(line)) out.push({ text: s, line: i });
  });
  return out;
}

const MAX_QUOTE = 360;

/**
 * Build a receipt: the source sentence with the matched phrase marked.
 * `match` may be a string (found case-insensitively), a RegExp, or [start, end].
 * Long sentences are trimmed around the match with ellipses.
 */
export function makeReceipt(sentence, match) {
  let quote = String(sentence).trim();
  let mark = null;
  if (Array.isArray(match)) {
    mark = [match[0], match[1]];
  } else if (match instanceof RegExp) {
    const flags = match.flags.replace('g', '');
    const r = new RegExp(match.source, flags);
    const m = r.exec(quote);
    if (m) mark = [m.index, m.index + m[0].length];
  } else if (typeof match === 'string' && match) {
    const idx = quote.toLowerCase().indexOf(match.toLowerCase());
    if (idx >= 0) mark = [idx, idx + match.length];
  }
  if (quote.length > MAX_QUOTE) {
    const center = mark ? mark[0] : 0;
    let from = Math.max(0, center - 140);
    let to = Math.min(quote.length, Math.max(from + MAX_QUOTE, mark ? mark[1] + 60 : 0));
    to = Math.min(to, quote.length);
    if (from > 0) {
      const sp = quote.indexOf(' ', from);
      if (sp > -1 && sp < (mark ? mark[0] : quote.length)) from = sp + 1;
    }
    if (to < quote.length) {
      const sp = quote.lastIndexOf(' ', to);
      if (sp > (mark ? mark[1] : from)) to = sp;
    }
    const prefix = from > 0 ? '… ' : '';
    const suffix = to < quote.length ? ' …' : '';
    const sliced = prefix + quote.slice(from, to) + suffix;
    if (mark) mark = [mark[0] - from + prefix.length, mark[1] - from + prefix.length];
    quote = sliced;
  }
  if (mark && (mark[0] < 0 || mark[1] > quote.length || mark[0] >= mark[1])) mark = null;
  return { quote, mark };
}

/** Word-boundary, case-insensitive phrase test (phrase may contain spaces/dots). */
export function hasWord(text, phrase) {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z])${esc}(?![A-Za-z])`, 'i').test(text);
}
