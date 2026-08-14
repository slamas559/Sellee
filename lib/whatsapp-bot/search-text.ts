/**
 * Shared helpers for turning free-form user text into a safe, useful
 * product/store search term for the WhatsApp bot.
 *
 * Two separate concerns live here on purpose:
 *
 *  - `cleanSearchQuery` makes the term more USEFUL: it strips filler
 *    words, trailing price/quantity clauses, and punctuation so
 *    "is there any apple watch available?" becomes "apple watch"
 *    instead of being searched for verbatim (and matching nothing).
 *
 *  - `escapeOrFilterValue` / `escapeIlikeValue` make the term SAFE, no
 *    matter where it came from (deterministic parser, or the AI intent
 *    layer). Supabase's `.or()` filter string uses "," "(" ")" as
 *    syntax characters - if a raw search term contains any of those
 *    (e.g. "700,000"), the whole query fails to parse on the DB side.
 *    This is applied as a last line of defense right before the query
 *    is built, so a future code path or a change to `cleanSearchQuery`
 *    can never reintroduce that crash.
 */

const SEARCH_STOPWORDS = new Set([
  "A",
  "AN",
  "THE",
  "ANY",
  "SOME",
  "AVAILABLE",
  "PLEASE",
  "PLS",
  "PLZ",
  "KINDLY",
  "IS",
  "THERE",
  "ARE",
  "DO",
  "YOU",
  "HAVE",
  "HAS",
  "SELL",
  "SELLS",
  "GOT",
  "CAN",
  "COULD",
  "WOULD",
  "LIKE",
  "I",
  "MY",
  "GET",
  "ME",
  "HELP",
  "FOR",
  "TO",
  "BUY",
  "ORDER",
  "WANT",
  "NEED",
  "LOOKING",
  "LOOK",
  "FIND",
  "SEARCH",
  "SHOW",
  "WHERE",
  "OF",
]);

// Cuts a trailing price/quantity clause like "under 700,000 naira" or
// "over #10,000,000" off the end of a search phrase, once the amount has
// already been captured by `extractSearchPriceBounds` below. Keeping
// these words in the *keyword* search only pollutes the product-name
// match - and, before this fix, could carry a comma that broke the DB
// filter outright.
const PRICE_CLAUSE_RE =
  /\s+(under|below|less\s+than|not\s+more\s+than|max(?:imum)?|at\s+most|over|above|more\s+than|at\s+least|min(?:imum)?|starting\s+from|between|around|about|within|for)\s+[₦#]?\s*[\d,]+(\.\d+)?\s*(naira|ngn|k|thousand|million|m)?\b.*$/i;

/**
 * Normalizes a raw, human-phrased search query into a short, clean
 * keyword string. Never throws; worst case it returns the trimmed
 * input with punctuation stripped.
 */
export function cleanSearchQuery(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  text = text.replace(PRICE_CLAUSE_RE, "").trim();

  // Strip anything that isn't a letter, number, space, or hyphen. This
  // also removes stray punctuation like a trailing "?" and is the main
  // reason it's safe to interpolate the result into a filter string.
  text = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const words = text.split(" ");
  const meaningful = words.filter((word) => !SEARCH_STOPWORDS.has(word.toUpperCase()));
  const result = (meaningful.length > 0 ? meaningful : words).join(" ").trim();

  return result.slice(0, 80);
}

const MAX_PRICE_RE =
  /(under|below|less\s+than|not\s+more\s+than|max(?:imum)?|at\s+most)\s*[₦#]?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|m|million)?/i;

const MIN_PRICE_RE =
  /(over|above|more\s+than|at\s+least|min(?:imum)?|starting\s+from)\s*[₦#]?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|m|million)?/i;

const BETWEEN_PRICE_RE =
  /between\s*[₦#]?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|m|million)?\s*(?:and|to|-)\s*[₦#]?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|m|million)?/i;

function parseAmount(rawNum: string, suffix?: string): number | null {
  const value = Number.parseFloat(rawNum.replace(/,/g, ""));
  if (Number.isNaN(value)) return null;

  const normalizedSuffix = suffix?.toLowerCase();
  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") return value * 1_000;
  if (normalizedSuffix === "m" || normalizedSuffix === "million") return value * 1_000_000;
  return value;
}

export type SearchPriceBounds = { minPrice: number | null; maxPrice: number | null };

/**
 * Reads a min and/or max price out of free-form text, e.g.
 * "laptop under 700,000 naira" -> { minPrice: null, maxPrice: 700000 }
 * "laptop over 10,000,000"     -> { minPrice: 10000000, maxPrice: null }
 * "laptop between 200k and 500k" -> { minPrice: 200000, maxPrice: 500000 }
 * Works on raw, unnormalized text - handles commas, "k"/"million"
 * shorthand, and an optional "₦"/"#" prefix. Returns nulls when no price
 * language is present. Never throws.
 */
export function extractSearchPriceBounds(text: string): SearchPriceBounds {
  const betweenMatch = text.match(BETWEEN_PRICE_RE);
  if (betweenMatch) {
    const a = parseAmount(betweenMatch[1] ?? "", betweenMatch[2]);
    const b = parseAmount(betweenMatch[3] ?? "", betweenMatch[4]);
    if (a !== null && b !== null) {
      return { minPrice: Math.min(a, b), maxPrice: Math.max(a, b) };
    }
  }

  const maxMatch = text.match(MAX_PRICE_RE);
  const minMatch = text.match(MIN_PRICE_RE);

  return {
    maxPrice: maxMatch ? parseAmount(maxMatch[2] ?? "", maxMatch[3]) : null,
    minPrice: minMatch ? parseAmount(minMatch[2] ?? "", minMatch[3]) : null,
  };
}

/**
 * Last-line-of-defense sanitizer applied immediately before building a
 * Supabase `.or()` filter string. Removes the characters that have
 * special meaning in PostgREST's filter DSL so a malformed value can
 * never make the query fail to parse.
 */
export function escapeOrFilterValue(value: string): string {
  return value
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes ILIKE wildcard characters so a literal "%" or "_" typed by a
 * user doesn't turn into an unintended wildcard match. Postgres' LIKE
 * family uses backslash as the default escape character.
 */
export function escapeIlikeValue(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}