// The judge: compare eligibility facts with the student's details.
// Wording is deliberately "looks eligible", never a guarantee — the receipts are the evidence.

import { findCountry, namesFor, stripNonListings } from './countries.js';

function withMark(receipt, mark) {
  return mark ? { quote: receipt.quote, mark } : receipt;
}

function ageRow(minAge, profile) {
  if (!minAge) {
    return { id: 'age', status: 'check', title: 'Age', detail: 'No age rule found. Read the Eligibility section.', receipt: null };
  }
  const age = Number(profile.age);
  if (!profile.age || !Number.isFinite(age)) {
    return { id: 'age', status: 'check', title: `Age: at least ${minAge.value}`, detail: `${minAge.note} Add your age in Your details to check.`, receipt: minAge.receipt };
  }
  if (age >= minAge.value) {
    return { id: 'age', status: 'ok', title: `Age: at least ${minAge.value}`, detail: `You're ${age}. ${minAge.note}`, receipt: minAge.receipt };
  }
  return { id: 'age', status: 'bad', title: `Age: at least ${minAge.value}`, detail: `You're ${age}, below the minimum of ${minAge.value}.`, receipt: minAge.receipt };
}

function countryRows(elig, profile) {
  const country = String(profile.country || '').trim();
  const display = namesFor(country)[0] || country;
  if (!country) {
    return [{ id: 'country', status: 'check', title: 'Country', detail: 'Add your country in Your details to check.', receipt: (elig.excluded || elig.restrictedTo || {}).receipt || null }];
  }
  const rows = [];
  if (elig.restrictedTo) {
    const hit = findCountry(elig.restrictedTo.receipt.quote, country);
    rows.push(hit
      ? { id: 'country-only', status: 'ok', title: 'Where you live', detail: `Entry is limited to certain places, and ${display} is one of them.`, receipt: withMark(elig.restrictedTo.receipt, hit) }
      : { id: 'country-only', status: 'bad', title: 'Where you live', detail: `Entry is limited to the places named in the receipt, and ${display} isn't one of them.`, receipt: elig.restrictedTo.receipt });
  }
  if (elig.excluded) {
    const quote = elig.excluded.receipt.quote;
    const hit = findCountry(stripNonListings(quote), country);
    rows.push(hit
      ? { id: 'country-excluded', status: 'bad', title: 'Excluded countries', detail: `${display} is listed as excluded.`, receipt: withMark(elig.excluded.receipt, hit) }
      : { id: 'country-excluded', status: 'ok', title: 'Excluded countries', detail: `${display} isn't in the excluded list.`, receipt: elig.excluded.receipt });
  }
  if (!rows.length && elig.overviewNote) {
    rows.push({ id: 'country', status: 'check', title: 'Country', detail: 'Open to all countries except "standard exceptions". Paste the Rules tab to see the list.', receipt: elig.overviewNote.receipt });
  }
  if (!rows.length) {
    rows.push({ id: 'country', status: 'check', title: 'Country', detail: 'No country rules found. Read the Eligibility section.', receipt: null });
  }
  return rows;
}

/** → { badge: 'ok'|'check'|'bad', label, rows } */
export function judge(elig, profile) {
  const rows = [ageRow(elig.minAge, profile), ...countryRows(elig, profile)];
  for (const [i, c] of (elig.conditions || []).entries()) {
    rows.push({ id: `condition-${i}`, status: 'check', title: 'Special condition', detail: c.text, receipt: c.receipt });
  }
  const badge = rows.some((r) => r.status === 'bad') ? 'bad' : rows.some((r) => r.status === 'check') ? 'check' : 'ok';
  const label = { ok: 'Looks eligible', check: 'Check these', bad: 'Not eligible' }[badge];
  return { badge, label, rows };
}
