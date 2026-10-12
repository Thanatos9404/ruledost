// Wiring: events, state, tabs, saving, downloads and the countdown timer.

import { decodeRules } from './lib/extract.js';
import { judge } from './lib/judge.js';
import { createStore, sortByDeadline } from './lib/store.js';
import { buildIcs, slugify } from './lib/ics.js';
import { COUNTRIES } from './lib/countries.js';
import { COMMON_ZONES, detectTimeZone, countdown, isValidTimeZone } from './lib/time.js';
import { formatMoney, convertPrize } from './lib/money.js';
import { SAMPLES } from './samples.js';
import {
  el, renderTicket, renderExplainer, eligibilityEl, badgeEl, checklistEl, prizeEl, renderSavedList,
} from './ui/render.js';

const $ = (id) => document.getElementById(id);

const store = createStore(window.localStorage);
const state = {
  profile: store.loadProfile({ timeZone: detectTimeZone() }),
  tab: 'decode',
  ticket: null, // the ticket on the Decode tab
  done: {}, // ticks on that ticket
  savedId: null, // set once the Decode ticket has been saved
  openId: null, // saved entry open on the My hackathons tab
};
if (!isValidTimeZone(state.profile.timeZone)) state.profile.timeZone = detectTimeZone();

// ---------- small helpers ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

let toastTimer;
function toast(text) {
  const node = $('toast');
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 2600);
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  render();
}

function bindDetails() {
  for (const id of ['f-country', 'f-age', 'f-tz', 'f-rate']) {
    $(id).addEventListener('change', readDetails);
    if (id !== 'f-tz') $(id).addEventListener('input', debounce(readDetails, 350));
  }
}

// ---------- Tabs ----------
function setTab(tab) {
  state.tab = tab;
  $('panel-decode').hidden = tab !== 'decode';
  $('panel-saved').hidden = tab !== 'saved';
  for (const [id, name] of [['tab-decode', 'decode'], ['tab-saved', 'saved']]) {
    if (tab === name) $(id).setAttribute('aria-current', 'page');
    else $(id).removeAttribute('aria-current');
  }
  render();
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
  state.savedId = null;
  render();
  if (window.matchMedia('(max-width: 899px)').matches) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Samples ----------
function buildSampleMenu() {
  const wrap = $('sample-wrap');
  const menu = el('div', { class: 'sample-menu', id: 'sample-menu', role: 'menu', hidden: true },
    el('p', { class: 'hint', text: 'Fictional rules pages, written for this demo:' }),
    SAMPLES.map((s) => el('button', {
      type: 'button', role: 'menuitem',
      onClick: () => {
        $('rules').value = s.text;
        closeMenu();
        decode();
      },
    }, s.title, el('small', { text: s.blurb }))));
  const button = el('button', {
    type: 'button', class: 'btn', id: 'sample-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'sample-menu',
    onClick: () => (menu.hidden ? openMenu() : closeMenu()),
  }, 'Try a sample ▾');
  function openMenu() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    menu.querySelector('button').focus();
  }
  function closeMenu() {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { closeMenu(); button.focus(); }
  });
  wrap.replaceChildren(button, menu);
}

// ---------- Save / calendar / remove ----------
function save() {
  const { entry, created, persisted } = store.saveTicket(state.ticket, state.done);
  state.savedId = entry.id;
  state.done = { ...entry.done };
  updateCount();
  toast(!persisted ? "Couldn't save for later: your browser is blocking storage. It's kept until you close this tab."
    : created ? 'Saved to My hackathons' : 'Updated in My hackathons');
  render();
}

function addToCalendar(ticket) {
  const ics = buildIcs(ticket, { now: Date.now() });
  if (!ics) {
    toast('No deadline found, so there is nothing to add to a calendar.');
    return;
  }
  download(`${slugify(ticket.name)}-deadline.ics`, ics, 'text/calendar;charset=utf-8');
  toast('Calendar file downloaded. Open it to add the deadline with reminders.');
}

function removeSaved(id) {
  const entry = store.getSaved(id);
  if (!entry) return;
  if (!window.confirm(`Remove "${entry.name}" from My hackathons?`)) return;
  store.removeSaved(id);
  if (state.savedId === id) state.savedId = null;
  state.openId = null;
  updateCount();
  toast('Removed');
  render();
}

function updateCount() {
  $('saved-count').textContent = String(store.listSaved().length);
}

// ---------- Rendering ----------
function ticketSections(getDone, onTick) {
  return [
    (t) => eligibilityEl(judge(t.eligibility, state.profile)),
    (t) => checklistEl(t, { done: getDone(), onTick }),
    (t) => prizeEl(t.prize, { inrPerUsd: state.profile.inrPerUsd, formatMoney, convertPrize }),
  ];
}

function renderDecode() {
  const root = $('result');
  if (!state.ticket) {
    root.replaceChildren(renderExplainer());
    return;
  }
  const t = state.ticket;
  const verdict = judge(t.eligibility, state.profile);
  root.replaceChildren(renderTicket(t, {
    profile: state.profile,
    now: Date.now(),
    badge: badgeEl(verdict),
    sections: ticketSections(() => state.done, (id, on) => {
      state.done[id] = on;
      if (state.savedId) store.updateSaved(state.savedId, { done: { ...state.done } });
    }),
    onRename: (name) => {
      t.name = name;
      if (state.savedId) store.updateSaved(state.savedId, { name });
    },
    actions: [
      el('button', { type: 'button', class: 'btn btn-primary', onClick: save, text: state.savedId ? 'Saved ✓ (save again)' : 'Save to My hackathons' }),
      el('button', { type: 'button', class: 'btn', onClick: () => addToCalendar(t), text: 'Add to calendar (.ics)', disabled: !t.deadline }),
    ],
  }));
}

function renderSaved() {
  const root = $('saved-root');
  const now = Date.now();
  const entry = state.openId ? store.getSaved(state.openId) : null;
  if (entry) {
    entry.done = entry.done || {}; // one object, mutated in place, so the "x/y done" counter stays current
    const verdict = judge(entry.eligibility, state.profile);
    root.replaceChildren(
      el('p', { class: 'back' }, el('button', { type: 'button', class: 'btn btn-small', onClick: () => { state.openId = null; render(); }, text: '← All hackathons' })),
      renderTicket(entry, {
        profile: state.profile,
        now,
        badge: badgeEl(verdict),
        sections: ticketSections(() => entry.done, (id, on) => {
          entry.done[id] = on;
          store.updateSaved(entry.id, { done: { ...entry.done } });
          if (state.savedId === entry.id) state.done = { ...entry.done };
        }),
        onRename: (name) => { store.updateSaved(entry.id, { name }); },
        actions: [
          el('button', { type: 'button', class: 'btn btn-primary', onClick: () => addToCalendar(entry), text: 'Add to calendar (.ics)', disabled: !entry.deadline }),
          el('span', { class: 'spacer' }),
          el('button', { type: 'button', class: 'btn btn-quiet', onClick: () => removeSaved(entry.id), text: 'Remove' }),
        ],
      }),
    );
    return;
  }
  state.openId = null;
  root.replaceChildren(renderSavedList(sortByDeadline(store.listSaved(), now), {
    profile: state.profile,
    now,
    verdictFor: (e) => judge(e.eligibility, state.profile),
    onOpen: (id) => { state.openId = id; render(); window.scrollTo({ top: 0 }); },
    onGoDecode: () => setTab('decode'),
  }));
}

function render() {
  if (state.tab === 'decode') renderDecode();
  else renderSaved();
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
  buildSampleMenu();
  $('decode').addEventListener('click', decode);
  $('rules').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); decode(); }
  });
  $('tab-decode').addEventListener('click', () => setTab('decode'));
  $('tab-saved').addEventListener('click', () => { state.openId = null; setTab('saved'); });
  updateCount();
  setTab('decode');
  // Deep link to a sample, e.g. index.html#sample=monsoon (handy for demos and screenshots).
  const wanted = /^#sample=([\w-]+)$/.exec(window.location.hash);
  const sample = wanted && SAMPLES.find((s) => s.id === wanted[1]);
  if (sample) { $('rules').value = sample.text; decode(); }
  setInterval(tick, 1000);
}

start();
