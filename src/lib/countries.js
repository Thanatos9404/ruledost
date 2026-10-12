// Countries and regions that rules pages name, plus aliases, so we can tell whether a
// student's country appears in an "excluded" or "open only to" sentence.

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
  'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

/** Regions that exclusion lists name alongside countries. */
export const REGIONS = ['Quebec', 'Crimea', 'Donetsk', 'Luhansk', 'Western Sahara', 'Antarctica', 'Province of Quebec'];

const ALIASES = {
  'United States': ['United States of America', 'USA', 'U.S.A.', 'U.S.', 'US'],
  'United Kingdom': ['UK', 'U.K.', 'Great Britain', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  'United Arab Emirates': ['UAE', 'U.A.E.'],
  'South Korea': ['Republic of Korea', 'Korea, Republic of'],
  'North Korea': ["Democratic People's Republic of Korea", 'DPRK'],
  Russia: ['Russian Federation'],
  Czechia: ['Czech Republic'],
  Turkey: ['Türkiye', 'Turkiye'],
  Myanmar: ['Burma'],
  "Cote d'Ivoire": ['Ivory Coast', "Côte d'Ivoire"],
  Eswatini: ['Swaziland'],
  Iran: ['Islamic Republic of Iran'],
  Syria: ['Syrian Arab Republic'],
  Vietnam: ['Viet Nam'],
  Laos: ["Lao People's Democratic Republic"],
  Netherlands: ['The Netherlands', 'Holland'],
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aliasRegex(alias) {
  // Short all-caps aliases (US, UK, UAE, DPRK) must match exactly so "us" the word doesn't count.
  const caseSensitive = alias.length <= 6 && alias === alias.toUpperCase();
  return new RegExp(`(^|[^A-Za-z])(${esc(alias)})(?![A-Za-z])`, caseSensitive ? 'g' : 'gi');
}

/** Canonical name + aliases for whatever the student typed ("usa" → United States …). */
export function namesFor(country) {
  const typed = String(country || '').trim();
  if (!typed) return [];
  const lower = typed.toLowerCase();
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    if (canon.toLowerCase() === lower || aliases.some((a) => a.toLowerCase() === lower)) return [canon, ...aliases];
  }
  const canon = COUNTRIES.find((c) => c.toLowerCase() === lower);
  return [canon || typed];
}

/** Where (if anywhere) the country is mentioned in text: [start, end] of the first mention, or null. */
export function findCountry(text, country) {
  let best = null;
  for (const name of namesFor(country)) {
    const re = aliasRegex(name);
    const m = re.exec(text);
    if (m) {
      const start = m.index + m[1].length;
      if (!best || start < best[0]) best = [start, start + m[2].length];
    }
  }
  return best;
}

// Boilerplate in exclusion sentences that names the US without excluding it
// ("where the laws of the United States … prohibit", "the U.S. Treasury's Office…").
const NOT_A_LISTING = /(?:the )?laws? of the United States|U\.?S\.? (?:Treasury|law|laws|Department|government|Office)|United States (?:Treasury|law|laws|Department|government)|Office of Foreign Assets Control|U\.S\. sanctions|comprehensive U\.S\./gi;

/** Same text with non-listing mentions of the US blanked out (indices preserved). */
export function stripNonListings(text) {
  return text.replace(NOT_A_LISTING, (m) => ' '.repeat(m.length));
}

const ALL_PLACES =[...COUNTRIES, ...REGIONS, ...Object.values(ALIASES).flat().filter((a) => a.length > 3)];
const PLACE_RE = new RegExp(`(^|[^A-Za-z])(${ALL_PLACES.sort((a, b) => b.length - a.length).map(esc).join('|')})(?![A-Za-z])`, 'g');

/** Every country/region named in the text, as spans. */
export function placeSpans(text) {
  const out = [];
  PLACE_RE.lastIndex = 0;
  let m;
  while ((m = PLACE_RE.exec(text))) {
    const start = m.index + m[1].length;
    out.push({ name: m[2], start, end: start + m[2].length });
  }
  return out;
}
