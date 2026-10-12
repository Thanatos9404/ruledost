// Wiring: events, state, the countdown timer.

import { decodeRules } from './lib/extract.js';
import { COMMON_ZONES, detectTimeZone, countdown, isValidTimeZone } from './lib/time.js';
import { el, renderTicket, renderExplainer } from './ui/render.js';

const $ = (id) => document.getElementById(id);

const state = {
  profile: { country: 'India', age: null, timeZone: detectTimeZone(), inrPerUsd: 88 },
  ticket: null,
};

// ---------- Your details ----------
function fillTimeZones() {
  const select = $('f-tz');
  const zones = [...COMMON_ZONES];
  if (!zones.includes(state.profile.timeZone)) zones.unshift(state.profile.timeZone);
  select.replaceChildren(...zones.map((z) => el('option', { value: z, text: z.replace(/_/g, ' ') })));
  select.value = state.profile.timeZone;
}

function bindDetails() {
  $('f-tz').addEventListener('change', (e) => {
    if (isValidTimeZone(e.target.value)) state.profile.timeZone = e.target.value;
    renderResult();
  });
}

// ---------- Decode ----------
function setMessage(text) {
  $('input-msg').textContent = text || '';
}

function decode() {
  const raw = $('rules').value;
  if (!raw.trim()) {
    setMessage('Paste the rules text first.');
    $('rules').focus();
    return;
  }
  const ticket = decodeRules(raw, { now: Date.now() });
  if (!ticket.found) {
    setMessage("This doesn't look like a hackathon rules page: no dates or requirements found. Tip: copy the Rules tab, not just the Overview.");
    return;
  }
  setMessage('');
  state.ticket = ticket;
  renderResult();
  if (window.matchMedia('(max-width: 899px)').matches) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResult() {
  const root = $('result');
  if (!state.ticket) {
    root.replaceChildren(renderExplainer());
    return;
  }
  root.replaceChildren(renderTicket(state.ticket, {
    profile: state.profile,
    now: Date.now(),
    onRename: (name) => { state.ticket.name = name; },
  }));
}

// ---------- Countdown ----------
function tick() {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((node) => {
    const cd = countdown(Number(node.dataset.countdown), now);
    node.textContent = cd.past ? cd.label : `${cd.label} left`;
    node.classList.toggle('past', cd.past);
  });
}

// ---------- Start ----------
function start() {
  fillTimeZones();
  bindDetails();
  $('decode').addEventListener('click', decode);
  $('rules').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); decode(); }
  });
  renderResult();
  setInterval(tick, 1000);
}

start();
