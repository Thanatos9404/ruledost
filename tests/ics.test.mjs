import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, icsEscape, icsFold, slugify, icsStamp } from '../src/lib/ics.js';
import { decodeRules } from '../src/lib/extract.js';
import { DEVPOST_STYLE } from './fixtures.mjs';

const NOW = Date.UTC(2026, 9, 12, 10, 0, 0);

test('event starts at the exact deadline instant in UTC, with 1-day and 3-hour reminders', () => {
  const t = decodeRules(DEVPOST_STYLE, { now: NOW });
  const ics = buildIcs(t, { now: NOW });
  assert.match(ics, /\r\nDTSTART:20261026T210000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261026T211500Z\r\n/);
  assert.match(ics, /\r\nTRIGGER:-P1D\r\n/);
  assert.match(ics, /\r\nTRIGGER:-PT3H\r\n/);
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /SUMMARY:Submission deadline: Lantern Labs Build Week/);
  assert.match(unfolded, /The rules say: Oct 26\\, 2026 @ 5:00pm EDT\./);
});

test('no deadline → no calendar file', () => {
  assert.equal(buildIcs({ name: 'X', deadline: null }), null);
});

test('escaping and folding follow RFC 5545', () => {
  assert.equal(icsEscape('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const long = 'DESCRIPTION:' + 'ऋ'.repeat(40); // 3-byte characters
  const folded = icsFold(long);
  for (const line of folded.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ''), long);
});

test('slug and stamp helpers', () => {
  assert.equal(slugify('Build With AI: Basics'), 'build-with-ai-basics');
  assert.equal(slugify('!!!'), 'hackathon');
  assert.equal(icsStamp(Date.UTC(2026, 0, 2, 3, 4, 5)), '20260102T030405Z');
});
