import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRules } from '../src/lib/extract.js';
import { formatInZone } from '../src/lib/time.js';
import { DEVPOST_STYLE, US_ONLY, PLAIN_PARAGRAPH } from './fixtures.mjs';

const NOW = Date.UTC(2026, 9, 12);
const marked = (r) => r.quote.slice(r.mark[0], r.mark[1]);

test('name comes from the line before "Deadline:" on a copied Devpost page', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  assert.equal(t.name, 'Lantern Labs Build Week');
});

test('deadline is taken from the "Deadline:" header and converted to IST, with a receipt', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  assert.ok(t.deadline);
  assert.equal(new Date(t.deadline.utc).toISOString(), '2026-10-26T21:00:00.000Z');
  assert.equal(formatInZone(t.deadline.utc, 'Asia/Kolkata'), 'Tue, 27 Oct 2026, 2:30 AM IST');
  assert.equal(t.deadline.stated, 'Oct 26, 2026 @ 5:00pm EDT');
  assert.equal(t.deadline.receipt.quote, 'Deadline: Oct 26, 2026 @ 5:00pm EDT');
  assert.equal(marked(t.deadline.receipt), 'Oct 26, 2026 @ 5:00pm EDT');
});

test('without a header, the deadline is the end of the Submission Period', () => {
  const t = decodeRules(US_ONLY, { now: NOW });
  assert.equal(new Date(t.deadline.utc).toISOString(), '2026-12-05T07:59:00.000Z');
  assert.match(t.deadline.stated, /December 4, 2026 \(11:59 pm Pacific Time\)/);
});

test('key dates: periods with both ends (identical ranges merged), winners with an inferred year', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  const labels = t.keyDates.map((k) => k.label);
  assert.deepEqual(labels, ['Registration Period · Submission Period', 'Judging Period', 'Winners Announced']);
  const judging = t.keyDates[1];
  assert.equal(new Date(judging.from.utc).toISOString(), '2026-10-27T14:00:00.000Z');
  assert.equal(new Date(judging.to.utc).toISOString(), '2026-10-30T21:00:00.000Z');
  const winners = t.keyDates[2];
  assert.equal(winners.to, null);
  assert.equal(new Date(winners.from.utc).toISOString(), '2026-11-04T19:00:00.000Z');
});

test('curly quotes, en dashes and non-breaking spaces in pasted text are normalised', () => {
  const t = decodeRules('Big Fest\nDeadline: Nov 2, 2026 @ 11:45am EST', { now: NOW });
  assert.equal(t.name, 'Big Fest');
  assert.equal(new Date(t.deadline.utc).toISOString(), '2026-11-02T16:45:00.000Z');
});

test('eligibility: "age of majority" reads as 18; the excluded list is found under "IS NOT open to"', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  assert.equal(t.eligibility.minAge.value, 18);
  assert.equal(marked(t.eligibility.minAge.receipt), 'age of majority');
  assert.ok(t.eligibility.excluded);
  assert.match(t.eligibility.excluded.receipt.quote, /Brazil, Quebec, Russia, Crimea, Cuba, Iran or North Korea/);
  assert.equal(marked(t.eligibility.excluded.receipt), 'Brazil, Quebec, Russia, Crimea, Cuba, Iran or North Korea');
  assert.equal(t.eligibility.restrictedTo, null);
});

test('excluded-list highlight starts after "including, but not limited to", skipping "laws of the United States"', () => {
  const text = 'The Hackathon IS NOT open to:\nIndividuals who are residents of, or Organizations domiciled in, a country where the laws of the United States prohibit participating (including, but not limited to, Brazil, Cuba, Iran, and North Korea and any other country sanctioned by the U.S. Treasury).';
  const t = decodeRules(text, { now: NOW });
  assert.equal(marked(t.eligibility.excluded.receipt), 'Brazil, Cuba, Iran, and North Korea');
});

test('eligibility: explicit ages win; "open only to residents of" is a restriction, not an exclusion', () => {
  const t = decodeRules(US_ONLY, { now: NOW });
  assert.equal(t.eligibility.minAge.value, 18);
  assert.ok(t.eligibility.restrictedTo);
  assert.equal(marked(t.eligibility.restrictedTo.receipt), 'open only to');
  assert.equal(t.eligibility.excluded, null);
  assert.equal(t.eligibility.conditions.length, 1);
});

test('eligibility: number words and "18+" forms', () => {
  const a = decodeRules('Entrants must be at least eighteen years of age.', { now: NOW });
  assert.equal(a.eligibility.minAge.value, 18);
  const b = decodeRules('Who can participate\nAges 18+ only\nAll countries/territories, excluding standard exceptions', { now: NOW });
  assert.equal(b.eligibility.minAge.value, 18);
  assert.ok(b.eligibility.overviewNote);
  const c = decodeRules('Participants must be at least 13 years old.', { now: NOW });
  assert.equal(c.eligibility.minAge.value, 13);
});

test('a plain paragraph finds nothing', () => {
  const t = decodeRules(PLAIN_PARAGRAPH, { now: NOW });
  assert.equal(t.deadline, null);
  assert.equal(t.found, 0);
});
