// lib/name-match.ts
//
// Compares a person's name on an ID with the account name a bank returns.
// Bank names and ID names rarely look identical (different order, middle
// names missing, ALL CAPS, titles), so this compares the SET of name parts
// instead of the raw strings. It is a triage hint for the vendor and the
// admin reviewer, never a final decision.

export type NameMatchLevel = "match" | "partial" | "mismatch";

const TITLES = new Set(["mr", "mrs", "miss", "ms", "dr", "prof", "chief", "alhaji", "alhaja", "engr", "pastor", "hon"]);

function nameTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !TITLES.has(token));
}

export function compareNames(idName: string, accountName: string): NameMatchLevel {
  const idTokens = nameTokens(idName);
  const accountTokens = nameTokens(accountName);

  if (idTokens.length === 0 || accountTokens.length === 0) return "mismatch";

  const accountSet = new Set(accountTokens);
  // Banks often shorten a first or middle name to an initial ("N EZE").
  const accountInitials = new Set(accountTokens.filter((part) => part.length === 1));
  let matched = 0;

  for (const token of idTokens) {
    const exact = accountSet.has(token);
    // An initial on the ID matches any account name part starting with it.
    const idInitial = token.length === 1 && accountTokens.some((part) => part.startsWith(token));
    // An initial on the account matches an ID name part starting with it.
    const accountInitial = token.length > 1 && accountInitials.has(token[0]);
    if (exact || idInitial || accountInitial) matched += 1;
  }

  if (matched === 0) return "mismatch";

  const ratio = matched / idTokens.length;
  if (matched >= 2 && ratio >= 0.66) return "match";
  if (idTokens.length === 1 && matched === 1) return "partial";
  if (ratio >= 0.99) return "match";
  return "partial";
}
