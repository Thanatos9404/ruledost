import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, BLOCKED_STORAGE, sortByDeadline, DEFAULT_PROFILE } from '../src/lib/store.js';

const ticket = (name, utc) => ({ v: 1, name, deadline: utc === null ? null : { utc, stated: 'x' }, requirements: [{ id: 'video' }] });

test('profile: defaults, then saved values win', () => {
  const s = createStore(memoryStorage());
  assert.deepEqual(s.loadProfile({ timeZone: 'Asia/Kolkata' }), { ...DEFAULT_PROFILE, timeZone: 'Asia/Kolkata' });
  s.saveProfile({ country: 'Nepal', age: 21, timeZone: 'Asia/Kathmandu', inrPerUsd: 90 });
  assert.equal(s.loadProfile().country, 'Nepal');
});

test('saving the same hackathon twice updates instead of duplicating, keeping ticks', () => {
  const s = createStore(memoryStorage());
  const a = s.saveTicket(ticket('Build Week', 1000), { video: true });
  assert.equal(a.created, true);
  const b = s.saveTicket(ticket('build week', 1000), {});
  assert.equal(b.created, false);
  assert.equal(b.entry.id, a.entry.id);
  assert.equal(s.listSaved().length, 1);
  assert.equal(s.listSaved()[0].done.video, true);
  s.saveTicket(ticket('Build Week', 2000));
  assert.equal(s.listSaved().length, 2, 'a different deadline is a different entry');
});

test('the pasted raw text is never stored', () => {
  const s = createStore(memoryStorage());
  s.saveTicket({ ...ticket('X', 1), raw: 'secret pasted page' });
  assert.equal('raw' in s.listSaved()[0], false);
});

test('update and remove', () => {
  const s = createStore(memoryStorage());
  const { entry } = s.saveTicket(ticket('A', 5));
  s.updateSaved(entry.id, { done: { video: true }, name: 'A+' });
  assert.equal(s.getSaved(entry.id).name, 'A+');
  assert.equal(s.getSaved(entry.id).done.video, true);
  assert.equal(s.removeSaved(entry.id), true);
  assert.equal(s.listSaved().length, 0);
});

test('sort: upcoming soonest first, then closed (latest first), then no deadline', () => {
  const now = 100;
  const sorted = sortByDeadline([
    { ...ticket('closed-old', 10) }, { ...ticket('later', 500) }, { ...ticket('none', null), savedAt: 1 },
    { ...ticket('soon', 150) }, { ...ticket('closed-recent', 90) },
  ], now).map((e) => e.name);
  assert.deepEqual(sorted, ['soon', 'later', 'closed-recent', 'closed-old', 'none']);
});

test('blocked storage: falls back to memory and reports it', () => {
  const s = createStore(BLOCKED_STORAGE);
  assert.equal(s.available, false);
  const r = s.saveTicket(ticket('Y', 1));
  assert.equal(r.persisted, false);
  assert.equal(s.listSaved().length, 1, 'still usable for this session');
});
