import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRules } from '../src/lib/extract.js';
import { judge } from '../src/lib/judge.js';
import { findCountry } from '../src/lib/countries.js';
import { DEVPOST_STYLE, US_ONLY } from './fixtures.mjs';

const NOW = Date.UTC(2026, 9, 12);
const devpost = decodeRules(DEVPOST_STYLE, { now: NOW });
const usOnly = decodeRules(US_ONLY, { now: NOW });
const row = (v, id) => v.rows.find((r) => r.id === id);

test('India, age 20, on a standard exclusion list → Looks eligible', () => {
  const v = judge(devpost.eligibility, { country: 'India', age: 20 });
  assert.equal(v.badge, 'ok');
  assert.equal(v.label, 'Looks eligible');
  assert.equal(row(v, 'age').status, 'ok');
  assert.equal(row(v, 'country-excluded').status, 'ok');
  assert.match(row(v, 'country-excluded').detail, /India isn't in the excluded list/);
});

test('a listed country fails, and the receipt highlights that country', () => {
  const v = judge(devpost.eligibility, { country: 'Brazil', age: 20 });
  assert.equal(v.badge, 'bad');
  const r = row(v, 'country-excluded');
  assert.equal(r.status, 'bad');
  assert.equal(r.receipt.quote.slice(r.receipt.mark[0], r.receipt.mark[1]), 'Brazil');
});

test('the US is not "excluded" just because the sentence mentions U.S. sanctions', () => {
  const v = judge(devpost.eligibility, { country: 'United States', age: 30 });
  assert.equal(row(v, 'country-excluded').status, 'ok');
});

test('missing age → Check these; under-age → Not eligible', () => {
  assert.equal(judge(devpost.eligibility, { country: 'India', age: null }).badge, 'check');
  const young = judge(devpost.eligibility, { country: 'India', age: 16 });
  assert.equal(young.badge, 'bad');
  assert.match(row(young, 'age').detail, /below the minimum of 18/);
});

test('US-and-Canada-only challenge: India fails, Canada passes, condition is flagged', () => {
  const india = judge(usOnly.eligibility, { country: 'India', age: 20 });
  assert.equal(india.badge, 'bad');
  assert.equal(row(india, 'country-only').status, 'bad');
  const canada = judge(usOnly.eligibility, { country: 'Canada', age: 20 });
  assert.equal(row(canada, 'country-only').status, 'ok');
  assert.equal(canada.badge, 'check'); // membership condition still needs checking
  assert.ok(canada.rows.some((r) => r.title === 'Special condition' && /members of the Prairie Developer Program/.test(r.detail)));
});

test('country aliases: "USA" and "U.S." match United States, but the word "us" does not', () => {
  assert.ok(findCountry('open only to residents of the USA', 'United States'));
  assert.ok(findCountry('open only to U.S. residents', 'usa'));
  assert.equal(findCountry('join us for the hackathon', 'United States'), null);
  assert.equal(findCountry('the Indian Ocean', 'India'), null);
});

test('no country rules → Check, with a helpful message', () => {
  const t = decodeRules('Tiny Jam\nDeadline: Nov 2, 2026 @ 11:45am EST\nParticipants must be at least 16 years old.', { now: NOW });
  const v = judge(t.eligibility, { country: 'India', age: 20 });
  assert.equal(row(v, 'age').status, 'ok');
  assert.equal(row(v, 'country').status, 'check');
  assert.equal(v.badge, 'check');
});
