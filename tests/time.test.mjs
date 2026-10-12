import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findDateTimes, toUtc, formatInZone, dateShift, isLateNight, countdown, readZone, zoneAbbrev,
} from '../src/lib/time.js';

const iso = (ms) => new Date(ms).toISOString();
const first = (line, opts) => findDateTimes(line, opts)[0];

test('Devpost header: "Oct 26, 2026 @ 5:00pm EDT" is 21:00 UTC and 2:30 AM IST next day', () => {
  const d = first('Deadline: Oct 26, 2026 @ 5:00pm EDT');
  assert.deepEqual([d.y, d.m, d.d, d.hh, d.mm], [2026, 10, 26, 17, 0]);
  assert.equal(d.zone.label, 'EDT');
  assert.equal(iso(toUtc(d)), '2026-10-26T21:00:00.000Z');
  assert.equal(formatInZone(toUtc(d), 'Asia/Kolkata'), 'Tue, 27 Oct 2026, 2:30 AM IST');
});

test('period line: both ends parsed, with generic "Eastern Time" following DST', () => {
  const ds = findDateTimes('Submission Period: September 22, 2026 (10:00 am Eastern Time) - October 26, 2026 (5:00 pm Eastern Time)');
  assert.equal(ds.length, 2);
  assert.equal(iso(toUtc(ds[0])), '2026-09-22T14:00:00.000Z');
  assert.equal(iso(toUtc(ds[1])), '2026-10-26T21:00:00.000Z');
  assert.equal(ds[1].text, 'October 26, 2026 (5:00 pm Eastern Time)');
});

test('"Pacific Time" in December uses PST (UTC-8); in October uses PDT (UTC-7)', () => {
  const dec = first('Judging: Dec 1, 2026 (2:00 pm Pacific Time)');
  assert.equal(iso(toUtc(dec)), '2026-12-01T22:00:00.000Z');
  const oct = first('Oct 23, 2026 (12:00 pm Pacific Time)');
  assert.equal(iso(toUtc(oct)), '2026-10-23T19:00:00.000Z');
});

test('explicit abbreviations are honoured literally (EST, PST, MSK, UTC, IST)', () => {
  assert.equal(iso(toUtc(first('Nov 2, 2026 @ 11:45am EST'))), '2026-11-02T16:45:00.000Z');
  assert.equal(iso(toUtc(first('Nov 18, 2026 @ 12:00pm PST'))), '2026-11-18T20:00:00.000Z');
  assert.equal(iso(toUtc(first('Oct 25, 2026 @ 5:00pm MSK'))), '2026-10-25T14:00:00.000Z');
  assert.equal(iso(toUtc(first('Oct 27, 2026 @ 1:00pm UTC'))), '2026-10-27T13:00:00.000Z');
  assert.equal(iso(toUtc(first('Oct 15, 2026 @ 12:15am IST'))), '2026-10-14T18:45:00.000Z');
});

test('UTC offsets like "UTC+5:30" and "GMT-4"', () => {
  assert.equal(iso(toUtc(first('October 26, 2026 at 11:59 PM UTC+5:30'))), '2026-10-26T18:29:00.000Z');
  assert.equal(iso(toUtc(first('October 26, 2026 at 5 PM GMT-4'))), '2026-10-26T21:00:00.000Z');
  assert.equal(readZone(' (UTC+05:30)').zone.offset, 330);
});

test('time before the date: "11:59 PM PT on October 26, 2026"', () => {
  const d = first('Submissions are due by 11:59 PM PT on October 26, 2026.');
  assert.deepEqual([d.hh, d.mm, d.zone.label], [23, 59, 'PT']);
  assert.equal(iso(toUtc(d)), '2026-10-27T06:59:00.000Z');
});

test('missing year borrows the default year; ordinal suffixes are fine', () => {
  const d = first('Winners Announced: On or around November 4th (2:00 pm Eastern Time).', { defaultYear: 2026 });
  assert.equal(d.yearAssumed, true);
  assert.equal(iso(toUtc(d)), '2026-11-04T19:00:00.000Z');
});

test('day-month-year and ISO forms; seconds in the time', () => {
  const dmy = first('Registration Begins: 22nd September 2026');
  assert.deepEqual([dmy.y, dmy.m, dmy.d, dmy.timeAssumed], [2026, 9, 22, true]);
  const isoD = first('Final deadline 2026-10-26 17:00 UTC');
  assert.equal(iso(toUtc(isoD)), '2026-10-26T17:00:00.000Z');
  const secs = first('November 18, 2026 at 12:00:00 PM PT');
  assert.equal(iso(toUtc(secs)), '2026-11-18T20:00:00.000Z');
});

test('no space before the bracket: "Sep 29, 2026(12:00 pm Eastern Time)"', () => {
  const d = first('Submission Period: Sep 29, 2026(12:00 pm Eastern Time) - Nov 2, 2026(11:45 am Eastern Time)');
  assert.equal(iso(toUtc(d)), '2026-09-29T16:00:00.000Z');
});

test('words that look like months are not dates', () => {
  assert.equal(findDateTimes('Entrants may submit more than one project. Marketing 101.').length, 0);
  assert.equal(findDateTimes('Teams of up to 4 people. Decision 2 is final.').length, 0);
});

test('date shift and late-night detection for IST', () => {
  const d = first('Oct 26, 2026 @ 5:00pm EDT');
  const ms = toUtc(d);
  const s = dateShift(ms, d, 'Asia/Kolkata');
  assert.equal(s.shifted, true);
  assert.equal(s.statedDate, 'Mon, 26 Oct');
  assert.equal(s.localDate, 'Tue, 27 Oct');
  assert.equal(isLateNight(ms, 'Asia/Kolkata'), true);
  assert.equal(dateShift(ms, d, 'America/New_York').shifted, false);
  assert.equal(isLateNight(ms, 'America/New_York'), false);
});

test('countdown before and after the deadline', () => {
  const target = Date.UTC(2026, 9, 26, 21, 0, 0);
  const before = countdown(target, target - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
  assert.equal(before.label, '2d 03h 04m 05s');
  assert.equal(before.past, false);
  const after = countdown(target, target + 3 * 86400000);
  assert.equal(after.past, true);
  assert.equal(after.label, 'Closed 3 days ago');
});

test('zone labels: IST for India, EDT/EST for New York by season', () => {
  assert.equal(zoneAbbrev(Date.UTC(2026, 9, 1), 'Asia/Kolkata'), 'IST');
  assert.equal(zoneAbbrev(Date.UTC(2026, 6, 1), 'America/New_York'), 'EDT');
  assert.equal(zoneAbbrev(Date.UTC(2026, 11, 1), 'America/New_York'), 'EST');
});
