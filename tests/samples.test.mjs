import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLES } from '../src/samples.js';
import { decodeRules } from '../src/lib/extract.js';
import { judge } from '../src/lib/judge.js';
import { formatInZone, dateShift, isLateNight } from '../src/lib/time.js';

const NOW = Date.UTC(2026, 9, 12);
const india = { country: 'India', age: 20, timeZone: 'Asia/Kolkata', inrPerUsd: 88 };
const byId = (id) => decodeRules(SAMPLES.find((s) => s.id === id).text, { now: NOW });

test('both samples say they are fictional', () => {
  for (const s of SAMPLES) assert.match(s.text, /fictional/i);
});

test('Monsoon sample: late-night, date-shifted IST deadline; looks eligible for India; full checklist', () => {
  const t = byId('monsoon');
  assert.equal(t.name, 'Monsoon Build Sprint 2026');
  assert.equal(formatInZone(t.deadline.utc, 'Asia/Kolkata'), 'Sat, 21 Nov 2026, 3:30 AM IST');
  assert.equal(dateShift(t.deadline.utc, t.deadline.parts, 'Asia/Kolkata').shifted, true);
  assert.equal(isLateNight(t.deadline.utc, 'Asia/Kolkata'), true);
  assert.equal(judge(t.eligibility, india).badge, 'ok');
  const ids = t.requirements.map((r) => r.id);
  for (const id of ['video', 'repo', 'license', 'new-work', 'files', 'tech', 'description', 'english']) assert.ok(ids.includes(id), id);
  assert.equal(t.requirements.find((r) => r.id === 'license').detail.startsWith('MIT license file'), true);
  assert.ok(t.otherMusts.some((o) => /contact person/.test(o.text)));
  assert.deepEqual([t.prize.kind, t.prize.amount], ['pool', 3000]);
});

test('Northern Lights sample: not eligible for India, eligible-looking for Canada', () => {
  const t = byId('northern');
  assert.equal(t.name, 'Northern Lights Civic Challenge');
  assert.equal(new Date(t.deadline.utc).toISOString(), '2026-12-05T07:59:00.000Z');
  const v = judge(t.eligibility, india);
  assert.equal(v.badge, 'bad');
  assert.equal(v.label, 'Not eligible');
  assert.equal(judge(t.eligibility, { ...india, country: 'Canada' }).badge, 'ok');
  assert.equal(t.eligibility.conditions.length, 0);
  assert.deepEqual([t.prize.kind, t.prize.amount], ['pool', 10000]);
});
