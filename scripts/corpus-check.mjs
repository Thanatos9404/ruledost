// Dev tool: decode every .txt file in a folder (copied rules pages) and print what
// RuleDost finds, so pattern changes can be checked against real pages.
// The pages themselves are other people's text: keep them out of the repo.
//
//   npm run corpus -- <folder> [--tz Asia/Kolkata] [--country India] [--age 20]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { decodeRules } from '../src/lib/extract.js';
import { judge } from '../src/lib/judge.js';
import { formatInZone } from '../src/lib/time.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dir = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!dir || !statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('Usage: npm run corpus -- <folder-of-.txt-files> [--tz Asia/Kolkata] [--country India] [--age 20]');
  process.exit(1);
}
const profile = { timeZone: opt('tz', 'Asia/Kolkata'), country: opt('country', 'India'), age: Number(opt('age', '20')) };

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.txt')).sort();
const totals = { files: 0, deadline: 0, age: 0, country: 0, video: 0, repo: 0 };
for (const f of files) {
  const t = decodeRules(readFileSync(join(dir, f), 'utf8'));
  const v = judge(t.eligibility, profile);
  totals.files += 1;
  if (t.deadline) totals.deadline += 1;
  if (t.eligibility.minAge) totals.age += 1;
  if (t.eligibility.excluded || t.eligibility.restrictedTo) totals.country += 1;
  if (t.requirements.some((r) => r.id === 'video')) totals.video += 1;
  if (t.requirements.some((r) => r.id === 'repo')) totals.repo += 1;
  console.log(`\n${f}`);
  console.log(`  name      ${t.name}`);
  console.log(`  deadline  ${t.deadline ? `${formatInZone(t.deadline.utc, profile.timeZone)}   (page: ${t.deadline.stated})` : '- not found -'}`);
  console.log(`  verdict   ${v.label}: ${v.rows.map((r) => `${r.id}=${r.status}`).join(', ')}`);
  console.log(`  checklist ${t.requirements.map((r) => r.id).join(', ') || '- none -'}  (+${t.otherMusts.length} other must-lines)`);
  console.log(`  prize     ${t.prize ? `${t.prize.kind} ${t.prize.currency} ${t.prize.amount}` : '-'}`);
}
console.log(`\n${totals.files} files · deadline ${totals.deadline} · min age ${totals.age} · country rule ${totals.country} · video rule ${totals.video} · repo rule ${totals.repo}`);
