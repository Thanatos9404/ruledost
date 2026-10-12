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

test('key dates: periods with both ends, winners with an inferred year', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  const labels = t.keyDates.map((k) => k.label);
  assert.deepEqual(labels, ['Registration Period', 'Submission Period', 'Judging Period', 'Winners Announced']);
  const judging = t.keyDates[2];
  assert.equal(new Date(judging.from.utc).toISOString(), '2026-10-27T14:00:00.000Z');
  assert.equal(new Date(judging.to.utc).toISOString(), '2026-10-30T21:00:00.000Z');
  const winners = t.keyDates[3];
  assert.equal(winners.to, null);
  assert.equal(new Date(winners.from.utc).toISOString(), '2026-11-04T19:00:00.000Z');
});

test('curly quotes, en dashes and non-breaking spaces in pasted text are normalised', () => {
  const t = decodeRules('Big Fest\nDeadline: Nov 2, 2026 @ 11:45am EST', { now: NOW });
  assert.equal(t.name, 'Big Fest');
  assert.equal(new Date(t.deadline.utc).toISOString(), '2026-11-02T16:45:00.000Z');
});

test('a plain paragraph finds nothing', () => {
  const t = decodeRules(PLAIN_PARAGRAPH, { now: NOW });
  assert.equal(t.deadline, null);
  assert.equal(t.found, 0);
});
