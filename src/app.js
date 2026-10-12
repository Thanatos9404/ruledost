// Wiring: events, state, the countdown timer.

import { decodeRules } from './lib/extract.js';
import { judge } from './lib/judge.js';
import { createStore } from './lib/store.js';
import { COUNTRIES } from './lib/countries.js';
import { COMMON_ZONES, detectTimeZone, countdown, isValidTimeZone } from './lib/time.js';
import { formatMoney, convertPrize } from './lib/money.js';
import { el, renderTicket, renderExplainer, eligibilityEl, badgeEl, checklistEl, prizeEl } from './ui/render.js';

const $ = (id) => document.getElementById(id);

const store = createStore(window.localStorage);
const state = {
  profile: store.loadProfile({ timeZone: detectTimeZone() }),
  ticket: null,
  done: {}, // ticks on the current ticket
};
if (!isValidTimeZone(state.profile.timeZone)) state.profile.timeZone = detectTimeZone();

// ---------- Your details ----------
function fillDetails() {
  $('countries').replaceChildren(...COUNTRIES.map((c) => el('option', { value: c })));
  const zones = [...COMMON_ZONES];
  if (!zones.includes(state.profile.timeZone)) zones.unshift(state.profile.timeZone);
  $('f-tz').replaceChildren(...zones.map((z) => el('option', { value: z, text: z.replace(/_/g, ' ') })));
  $('f-tz').value = state.profile.timeZone;
  $('f-country').value = state.profile.country || '';
  $('f-age').value = state.profile.age ?? '';
  $('f-rate').value = state.profile.inrPerUsd ?? 88;
}

function readDetails() {
  const age = parseInt($('f-age').value, 10);
  const rate = parseFloat($('f-rate').value);
  const tz = $('f-tz').value;
  state.profile = {
    country: $('f-country').value.trim(),
    age: Number.isFinite(age) && age > 0 ? age : null,
    timeZone: isValidTimeZone(tz) ? tz : state.profile.timeZone,
    inrPerUsd: Number.isFinite(rate) && rate > 0 ? rate : 88,
  };
  store.saveProfile(state.profile);
  renderResult();
}

function bindDetails() {
  for (const id of ['f-country', 'f-age', 'f-tz', 'f-rate']) {
    $(id).addEventListener('change', readDetails);
    if (id !== 'f-tz') $(id).addEventListener('input', debounce(readDetails, 350));
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
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
  state.done = {};
  renderResult();
  if (window.matchMedia('(max-width: 899px)').matches) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResult() {
  const root = $('result');
  if (!state.ticket) {
    root.replaceChildren(renderExplainer());
    return;
  }
  const verdict = judge(state.ticket.eligibility, state.profile);
  root.replaceChildren(renderTicket(state.ticket, {
    profile: state.profile,
    now: Date.now(),
    badge: badgeEl(verdict),
    sections: [
      () => eligibilityEl(verdict),
      (t) => checklistEl(t, { done: state.done, onTick: (id, on) => { state.done[id] = on; } }),
      (t) => prizeEl(t.prize, { inrPerUsd: state.profile.inrPerUsd, formatMoney, convertPrize }),
    ],
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
  fillDetails();
  bindDetails();
  $('decode').addEventListener('click', decode);
  $('rules').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); decode(); }
  });
  renderResult();
  setInterval(tick, 1000);
}

start();
