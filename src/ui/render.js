// DOM builders. Pasted rules text is untrusted, so everything is inserted with
// textContent / text nodes — never as HTML.

import { formatPieces, dateShift, isLateNight, countdown } from '../lib/time.js';

/** Tiny element helper: el('p', { class: 'x', text: 'hi', onClick: fn }, child, …) */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'checked' || k === 'value') node[k] = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

/** A receipt: collapsible slip quoting the source sentence, matched phrase in <mark>. */
export function receiptEl(receipt, label = 'Receipt') {
  if (!receipt || !receipt.quote) return null;
  const slip = el('blockquote', { class: 'slip' });
  if (receipt.mark) {
    const [a, b] = receipt.mark;
    slip.append(receipt.quote.slice(0, a), el('mark', { text: receipt.quote.slice(a, b) }), receipt.quote.slice(b));
  } else {
    slip.append(receipt.quote);
  }
  return el('details', { class: 'receipt' }, el('summary', {}, label), slip);
}

/** Shown before the first decode. */
export function renderExplainer() {
  const example = { quote: 'Deadline: Oct 26, 2026 @ 5:00pm EDT', mark: [10, 35] };
  return el('section', { class: 'card explainer' },
    el('h2', { text: "Paste a rules page. Here's what you'll get:" }),
    el('ol', {},
      el('li', {}, el('strong', { text: 'Your real deadline, on your clock' }), 'Converted to your time zone, with a live countdown, and a warning when the date on the page isn\'t your date.'),
      el('li', {}, el('strong', { text: 'Can you even enter?' }), 'An eligibility check for your age and country.'),
      el('li', {}, el('strong', { text: 'What you must submit' }), 'A tickable checklist: video, repo, license, required files and more.'),
    ),
    el('p', { class: 'hint', text: 'Every answer comes with a receipt: the exact sentence from the rules it came from. Like this one:' }),
    receiptEl(example, 'Receipt'),
  );
}

function notesFor(dl, tz) {
  const notes = [];
  const shift = dateShift(dl.utc, dl.parts, tz);
  if (shift.shifted) {
    notes.push(el('li', { class: 'note' }, el('strong', { text: 'Date shift: ' }),
      `the page says ${shift.statedDate}, but for you it's ${shift.localDate}.`));
  }
  if (isLateNight(dl.utc, tz)) {
    const { time } = formatPieces(dl.utc, tz);
    notes.push(el('li', { class: 'note' }, el('strong', { text: 'Late-night deadline: ' }),
      `${time} your time. Plan to submit the evening before.`));
  }
  if (dl.zoneAssumed) {
    notes.push(el('li', { class: 'note' }, el('strong', { text: 'Time zone not stated: ' }), 'assumed UTC. Double-check the rules.'));
  }
  if (dl.timeAssumed) {
    notes.push(el('li', { class: 'note' }, el('strong', { text: 'No time stated: ' }), 'assumed 11:59 PM on that date.'));
  }
  return notes;
}

/** The ticket stub: the deadline, big. */
export function deadlineEl(dl, ctx) {
  if (!dl) {
    return el('section', { class: 'stub' },
      el('p', { class: 'eyebrow', text: 'Your deadline' }),
      el('p', { class: 'big-date muted', text: 'No deadline found' }),
      el('p', { class: 'hint', text: 'Search the rules for "Submission Period" or "Deadline". Everything else below still applies.' }));
  }
  const tz = ctx.profile.timeZone;
  const p = formatPieces(dl.utc, tz);
  const cd = countdown(dl.utc, ctx.now);
  const notes = notesFor(dl, tz);
  return el('section', { class: 'stub', 'aria-label': 'Deadline' },
    el('p', { class: 'eyebrow', text: 'Your deadline' }),
    el('p', { class: 'big-date', text: p.date }),
    el('p', { class: 'big-time' }, p.time + ' ', el('span', { class: 'zone', text: p.zone })),
    el('p', { class: 'stated', text: `Page says: ${dl.stated}` }),
    el('p', { class: 'countdown' + (cd.past ? ' past' : ''), dataset: { countdown: String(dl.utc) }, text: cd.past ? cd.label : `${cd.label} left` }),
    notes.length ? el('ul', { class: 'notes' }, notes) : null,
    receiptEl(dl.receipt),
  );
}

function whenText(fact, tz) {
  if (!fact) return '';
  const p = formatPieces(fact.utc, tz);
  return fact.timeAssumed ? `${p.date} (no time stated)` : `${p.date}, ${p.time} ${p.zone}`;
}

export function keyDatesEl(keyDates, ctx) {
  if (!keyDates || !keyDates.length) return null;
  const tz = ctx.profile.timeZone;
  return el('section', { class: 'section', 'aria-label': 'Key dates' },
    el('div', { class: 'section-head' }, el('h3', { class: 'section-title', text: 'Key dates' })),
    el('ul', { class: 'keydates' }, keyDates.map((k) => el('li', { class: 'keydate' },
      el('span', { class: 'kd-label', text: k.label }),
      el('span', { class: 'kd-when', text: k.to ? `${whenText(k.from, tz)}  →  ${whenText(k.to, tz)}` : whenText(k.from, tz) }),
      receiptEl(k.from.receipt),
    ))),
  );
}

const DOT = { ok: '✓', check: '?', bad: '✕' };
const DOT_LABEL = { ok: 'Passes', check: 'Check', bad: 'Fails' };

export function badgeEl(verdict) {
  if (!verdict) return null;
  return el('span', { class: `pill pill-${verdict.badge}`, text: verdict.label });
}

/** Eligibility: one row per check, each with a receipt. */
export function eligibilityEl(verdict) {
  return el('section', { class: 'section', 'aria-label': 'Eligibility' },
    el('div', { class: 'section-head' }, el('h3', { class: 'section-title', text: 'Can you enter?' }), badgeEl(verdict)),
    el('ul', { class: 'rows' }, verdict.rows.map((r) => el('li', { class: 'row' },
      el('span', { class: `dot dot-${r.status}`, role: 'img', 'aria-label': DOT_LABEL[r.status], text: DOT[r.status] }),
      el('div', { class: 'row-main' },
        el('p', { class: 'row-title', text: r.title }),
        el('p', { class: 'row-detail', text: r.detail })),
      receiptEl(r.receipt),
    ))),
  );
}

/**
 * The full ticket. `ctx` = { profile, now, sections: [extra section builders], actions: [nodes],
 * onRename(name) }.
 */
export function renderTicket(ticket, ctx) {
  const nameInput = el('input', {
    class: 'ticket-name', value: ticket.name, 'aria-label': 'Hackathon name (editable)', maxlength: '120',
    onChange: (e) => ctx.onRename && ctx.onRename(e.target.value.trim() || ticket.name),
  });
  return el('article', { class: 'ticket', 'aria-label': `Decoded rules for ${ticket.name}` },
    el('header', { class: 'ticket-head' }, nameInput, ctx.badge || null),
    deadlineEl(ticket.deadline, ctx),
    el('div', { class: 'ticket-body' },
      keyDatesEl(ticket.keyDates, ctx),
      ...(ctx.sections || []).map((build) => build(ticket, ctx)),
    ),
    ctx.actions && ctx.actions.length ? el('footer', { class: 'ticket-actions' }, ctx.actions) : null,
  );
}
