// Money display: dollars in US grouping, rupees in Indian grouping (lakh/crore).
// Conversion uses the student's own fixed rate from "Your details": no live FX, no network.

/** "$2,500" or "₹2,20,000" */
export function formatMoney(amount, currency) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/** The prize in the other currency at `inrPerUsd`. */
export function convertPrize(prize, inrPerUsd) {
  const rate = Number(inrPerUsd) > 0 ? Number(inrPerUsd) : 88;
  return prize.currency === 'INR'
    ? { amount: prize.amount / rate, currency: 'USD' }
    : { amount: prize.amount * rate, currency: 'INR' };
}
