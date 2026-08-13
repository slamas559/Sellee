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
  "I",
  "GET",
  "ME",
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
// "below #50k" off the end of a search phrase. SEARCH has no price
// filter, so keeping those words only pollutes the match - and, before
// this fix, could carry a comma that broke the DB filter outright.
const PRICE_CLAUSE_RE =
  /\s+(under|below|less than|not more than|around|about|within|for)\s+[₦#]?\s*[\d,]+(\.\d+)?\s*(naira|ngn|k|thousand|million|m)?\b.*$/i;

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