import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRules } from '../src/lib/extract.js';
import { formatMoney, convertPrize } from '../src/lib/money.js';
import { DEVPOST_STYLE, US_ONLY } from './fixtures.mjs';

const NOW = Date.UTC(2026, 9, 12);
const t = decodeRules(DEVPOST_STYLE, { now: NOW });
const req = (ticket, id) => ticket.requirements.find((r) => r.id === id);
const marked = (r) => r.quote.slice(r.mark[0], r.mark[1]);

test('video: under 3 minutes, YouTube or Vimeo, public', () => {
  const v = req(t, 'video');
  assert.equal(v.detail, 'Under 3 minutes · on YouTube or Vimeo · public');
  assert.equal(marked(v.receipts[0]), 'three (3) minutes');
});

test('video: "no longer than 5 minutes" reads as up to 5', () => {
  assert.equal(req(decodeRules(US_ONLY, { now: NOW }), 'video').detail, 'Up to 5 minutes');
});

test('repo + license: public on GitHub/GitLab/Bitbucket, open-source license visible in About', () => {
  assert.equal(req(t, 'repo').detail, 'Public on GitHub, GitLab or Bitbucket');
  assert.equal(req(t, 'license').detail, "Open-source license file, visible in the repo's About section");
  const mit = decodeRules('Rules\nThe repository must be public and must include an MIT license file.', { now: NOW });
  assert.match(req(mit, 'license').detail, /^MIT license file/);
});

test('repo: the sentence naming hosts wins over an earlier "public repository" mention', () => {
  const x = decodeRules('Your public repository must include the scope.md file.\nProvide a URL to your code repository on GitHub, GitLab or BitBucket. The repository must be public.', { now: NOW });
  assert.equal(req(x, 'repo').detail, 'Public on GitHub, GitLab or Bitbucket');
});

test('new work rule carries the submission start date', () => {
  const n = req(t, 'new-work');
  assert.equal(n.title, 'New code only');
  assert.match(n.detail, /started Sep 22, 2026 or later/);
});

test('required files: scope.md, prd.md and spec.md, highlighted in the receipt', () => {
  const f = req(t, 'files');
  assert.equal(f.detail, 'Repo must include scope.md, prd.md and spec.md');
  assert.equal(marked(f.receipts[0]), 'scope.md, prd.md, and spec.md');
});

test('required tech, description, English and disclosure are recognised', () => {
  assert.match(req(t, 'tech').detail, /^Build a new web app using the Lantern Starter Kit/);
  assert.ok(req(t, 'description'));
  assert.ok(req(t, 'english'));
  assert.match(req(t, 'disclosure').detail, /pre-existing code/);
});

test('other "must" lines keep real requirements and drop legal boilerplate', () => {
  const texts = t.otherMusts.map((o) => o.text);
  assert.ok(texts.some((x) => /sign the code of conduct/.test(x)));
  assert.ok(!texts.some((x) => /indemnify|taxes/.test(x)));
  assert.ok(!texts.some((x) => x.includes('open source license file')), 'claimed sentences are not repeated');
});

test('prize: "$2,500 in prizes" is the pool; INR uses Indian digit grouping', () => {
  assert.equal(t.prize.kind, 'pool');
  assert.equal(t.prize.amount, 2500);
  assert.equal(t.prize.currency, 'USD');
  const inr = convertPrize(t.prize, 88);
  assert.equal(formatMoney(inr.amount, inr.currency), '₹2,20,000');
  assert.equal(formatMoney(2500, 'USD'), '$2,500');
});

test('prize: without a pool line, the top cash prize is used; rupee pools work too', () => {
  const top = decodeRules('Prizes\nFirst Place: $1,250 USD in cash\nSecond Place: $750 USD in cash', { now: NOW });
  assert.equal(top.prize.kind, 'top');
  assert.equal(top.prize.amount, 1250);
  const rupees = decodeRules('Prizes\n₹ 50,000 in prizes', { now: NOW });
  assert.deepEqual([rupees.prize.kind, rupees.prize.amount, rupees.prize.currency], ['pool', 50000, 'INR']);
  const usd = convertPrize(rupees.prize, 88);
  assert.equal(formatMoney(usd.amount, usd.currency), '$568');
});

test('"Rs" inside ordinary words is not money', () => {
  const x = decodeRules('Prizes are awarded to winners within 30 hours 5 days after judging.', { now: NOW });
  assert.equal(x.prize, null);
});
