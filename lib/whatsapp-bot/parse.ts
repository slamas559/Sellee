export function todayStartIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
  return start.toISOString();
}

export function normalizeIntentText(body: string): string {
  return body
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAll(text: string, words: string[]): boolean {
  return words.every((word) => text.includes(word));
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function stripFillerPrefix(normalized: string): string {
  const fillers = [
    "PLEASE ",
    "PLS ",
    "KINDLY ",
    "CAN YOU ",
    "CAN I ",
    "I WANT TO ",
    "I NEED TO ",
    "I WOULD LIKE TO ",
    "ID LIKE TO ",
    "HELP ME TO ",
    "HELP ME ",
    "I WANT ",
    "I NEED ",
  ];
  let result = normalized;
  for (let i = 0; i < 3; i += 1) {
    for (const filler of fillers) {
      if (result.startsWith(filler)) {
        result = result.slice(filler.length).trimStart();
      }
    }
  }
  return result;
}

export function isGreetingIntent(body: string): boolean {
  const normalized = normalizeIntentText(body);
  const stripped = stripFillerPrefix(normalized);
  return (
    stripped === "HI" ||
    stripped === "HELLO" ||
    stripped === "HEY" ||
    stripped === "HEYA" ||
    stripped === "HI THERE" ||
    stripped === "HELLO THERE" ||
    stripped === "HOWDY" ||
    stripped === "YO" ||
    stripped === "START" ||
    stripped === "BEGIN" ||
    stripped === "GET STARTED" ||
    hasAll(stripped, ["GOOD", "MORNING"]) ||
    hasAll(stripped, ["GOOD", "AFTERNOON"]) ||
    hasAll(stripped, ["GOOD", "EVENING"]) ||
    hasAll(stripped, ["GOOD", "NIGHT"])
  );
}

export function isAmbiguousIntent(body: string): boolean {
  const normalized = normalizeIntentText(body);

  const explicitPrefixes = [
    "LINK ",
    "CONFIRM ",
    "REJECT ",
    "BROADCAST ",
    "SCHEDULE BROADCAST ",
    "TRACK ",
    "CANCEL ",
    "FOLLOW ",
    "UNFOLLOW ",
    "SEARCH ",
    "FIND ",
    "LOOK FOR ",
    "LOOKING FOR ",
    "SUBSCRIBE ",
    "UNSUBSCRIBE ",
    "ACCEPT ORDER ",
    "APPROVE ORDER ",
    "DECLINE ORDER ",
  ];
  if (explicitPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  const asksConfirm = hasAny(normalized, ["CONFIRM", "ACCEPT", "APPROVE"]);
  const asksReject = hasAny(normalized, ["REJECT", "DECLINE", "DENY"]);
  const asksUnfollow = normalized.includes("UNFOLLOW");
  const asksFollow = normalized.includes("FOLLOW") && !asksUnfollow;
  const asksTrack = hasAny(normalized, ["TRACK", "WHERE IS", "STATUS OF"]);
  const asksCancel = normalized.includes("CANCEL");

  if (asksConfirm && asksReject) return true;
  if (asksFollow && asksUnfollow) return true;
  if (asksTrack && asksCancel) return true;

  return false;
}

export function extractRef(commandText: string): string | null {
  const parts = commandText
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\w-]/g, ""))
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const ignored = new Set([
    "ORDER",
    "ORDERS",
    "REF",
    "REFERENCE",
    "IS",
    "THE",
    "STATUS",
    "TRACK",
    "CANCEL",
    "CONFIRM",
    "REJECT",
    "WHERE",
    "MY",
    "FOR",
    "PLEASE",
    "PLS",
    "ACCEPT",
    "APPROVE",
    "DECLINE",
    "DENY",
    "AGAIN",
    "REPEAT",
    "REORDER",
  ]);

  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const token = parts[i];
    if (!token) continue;
    if (ignored.has(token.toUpperCase())) continue;
    if (token.length < 3) continue;
    return token;
  }

  return parts[1] ?? null;
}

const SEARCH_TRIGGERS = [
  "SEARCH ",
  "FIND ",
  "LOOK FOR ",
  "LOOKING FOR ",
  "WHERE CAN I GET ",
  "WHERE CAN I FIND ",
  "WHERE DO I GET ",
  "I AM LOOKING FOR ",
  "IM LOOKING FOR ",
  "I WANT TO BUY ",
  "I WANT TO ORDER ",
  "I WANNA BUY ",
  "I WANNA ORDER ",
  "SHOW ME SOME ",
  "SHOW ME ",
  "DO YOU HAVE ",
  "DO YOU SELL ",
  "IS THERE ",
  "ARE THERE ",
  "GET ME ",
  "GOT ANY ",
];

export function extractSearchQuery(body: string): string | null {
  const normalized = normalizeIntentText(body);
  const stripped = stripFillerPrefix(normalized);
  const raw = body.trim();

  for (const trigger of SEARCH_TRIGGERS) {
    if (stripped.startsWith(trigger)) {
      const strippedQuery = stripped.slice(trigger.length).trim();
      if (strippedQuery.length < 2) {
        return null;
      }

      const strippedRaw = raw.replace(/^[\s]+/, "");
      const rawUpper = strippedRaw.toUpperCase();
      const triggerUpper = trigger.trim();
      const index = rawUpper.indexOf(triggerUpper);
      if (index >= 0) {
        const rawQuery = strippedRaw.slice(index + triggerUpper.length).trim();
        return rawQuery.length >= 2 ? rawQuery : null;
      }
      return strippedQuery;
    }
  }

  return null;
}

export function parseFlexibleScheduleDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const isoParsed = new Date(trimmed);
  if (!Number.isNaN(isoParsed.getTime())) return isoParsed;

  const ymdMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (ymdMatch) {
    const [, y, m, d, hh = "0", mm = "0"] = ymdMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0,
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dmyMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyMatch) {
    const [, d, m, y, hh = "0", mm = "0"] = dmyMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0,
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const upper = trimmed.toUpperCase();
  const now = new Date();
  let baseDate: Date | null = null;

  if (upper.startsWith("TODAY")) {
    baseDate = new Date(now);
  } else if (upper.startsWith("TOMORROW")) {
    baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() + 1);
  } else {
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const shortDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const isNext = upper.startsWith("NEXT ");
    const searchStr = isNext ? upper.slice(5) : upper;

    let dayIndex = dayNames.findIndex((d) => searchStr.startsWith(d));
    if (dayIndex === -1) {
      dayIndex = shortDays.findIndex((d) => searchStr.startsWith(d));
    }

    if (dayIndex >= 0) {
      const target = new Date(now);
      const currentDay = target.getDay();
      let daysAhead = dayIndex - currentDay;
      if (daysAhead <= 0 || isNext) daysAhead += 7;
      target.setDate(target.getDate() + daysAhead);
      baseDate = target;
    }
  }

  if (!baseDate) {
    return null;
  }

  const timeMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2] ?? "0", 10);
    const meridian = (timeMatch[3] ?? "").toLowerCase();
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    baseDate.setHours(hours, minutes, 0, 0);
  } else {
    baseDate.setHours(9, 0, 0, 0);
  }

  return baseDate;
}

export type BotCommand =
  | "GREETING"
  | "HELP"
  | "AMBIGUOUS"
  | "UNKNOWN"
  | "LINK"
  | "CONFIRM"
  | "REJECT"
  | "LIST ORDERS"
  | "SALES TODAY"
  | "LOW STOCK"
  | "BROADCAST"
  | "BROADCAST STATUS"
  | "SCHEDULE BROADCAST"
  | "MY ORDERS"
  | "MY STATUS"
  | "TRACK"
  | "CANCEL"
  | "REORDER"
  | "MORE"
  | "SEARCH"
  | "FOLLOW"
  | "UNFOLLOW"
  | "MY FOLLOWS"
  | "TOP STORES"
  | "OPEN STORE"
  | "REVIEW";

export function inferCommand(body: string): BotCommand {
  if (isAmbiguousIntent(body)) return "AMBIGUOUS";
  if (isGreetingIntent(body)) return "GREETING";

  const normalized = normalizeIntentText(body);
  const stripped = stripFillerPrefix(normalized);

  if (stripped.startsWith("LINK ")) return "LINK";

  if (
    stripped.startsWith("CONFIRM ") ||
    stripped.startsWith("ACCEPT ORDER ") ||
    stripped.startsWith("ACCEPT ") ||
    stripped.startsWith("APPROVE ORDER ") ||
    stripped.startsWith("APPROVE ")
  ) return "CONFIRM";

  if (
    stripped.startsWith("REJECT ") ||
    stripped.startsWith("DECLINE ORDER ") ||
    stripped.startsWith("DECLINE ") ||
    stripped.startsWith("DENY ORDER ") ||
    stripped.startsWith("DENY ")
  ) return "REJECT";

  if (
    stripped.startsWith("SCHEDULE BROADCAST ") ||
    stripped.startsWith("SCHEDULE ANNOUNCEMENT ") ||
    stripped.startsWith("SCHEDULE MESSAGE ")
  ) return "SCHEDULE BROADCAST";

  if (
    stripped === "BROADCAST STATUS" ||
    stripped === "BROADCASTS" ||
    stripped === "CAMPAIGN STATUS" ||
    stripped === "BROADCAST HISTORY" ||
    stripped === "MY BROADCASTS"
  ) return "BROADCAST STATUS";

  if (
    stripped.startsWith("BROADCAST ") ||
    stripped.startsWith("ANNOUNCE ") ||
    stripped.startsWith("SEND MESSAGE TO CUSTOMERS ") ||
    stripped.startsWith("MESSAGE CUSTOMERS ")
  ) return "BROADCAST";

  if (
    stripped.startsWith("TRACK ") ||
    stripped.startsWith("WHERE IS ORDER ") ||
    stripped.startsWith("WHERE IS MY ORDER ") ||
    stripped.startsWith("ORDER STATUS ") ||
    stripped.startsWith("CHECK ORDER ") ||
    stripped.startsWith("STATUS OF ")
  ) return "TRACK";

  if (
    stripped.startsWith("CANCEL ") ||
    stripped.startsWith("CANCEL ORDER ") ||
    stripped.startsWith("STOP ORDER ")
  ) return "CANCEL";

  if (
    stripped.startsWith("REORDER ") ||
    stripped.startsWith("ORDER AGAIN ") ||
    stripped.startsWith("REPEAT ORDER ")
  ) return "REORDER";

  if (
    stripped === "MORE" ||
    stripped === "NEXT" ||
    stripped === "CONTINUE" ||
    stripped === "SHOW MORE"
  ) return "MORE";

  if (
    stripped.startsWith("REVIEW ") ||
    stripped.startsWith("RATE ") ||
    stripped.startsWith("LEAVE REVIEW ") ||
    stripped.startsWith("LEAVE A REVIEW ")
  ) return "REVIEW";

  if (extractSearchQuery(body) !== null) return "SEARCH";

  if (
    stripped.startsWith("UNFOLLOW ") ||
    stripped.startsWith("UNSUBSCRIBE FROM ") ||
    stripped.startsWith("UNSUBSCRIBE ") ||
    stripped.startsWith("STOP FOLLOWING ")
  ) return "UNFOLLOW";

  if (
    stripped.startsWith("FOLLOW ") ||
    stripped.startsWith("SUBSCRIBE TO ") ||
    stripped.startsWith("SUBSCRIBE ")
  ) return "FOLLOW";

  if (
    stripped === "MY FOLLOWS" ||
    stripped === "SHOW MY FOLLOWS" ||
    stripped === "MY SUBSCRIPTIONS" ||
    stripped === "STORES I FOLLOW" ||
    stripped === "WHO AM I FOLLOWING"
  ) return "MY FOLLOWS";

  if (
    stripped === "LIST ORDERS" ||
    stripped === "SHOW ORDERS" ||
    stripped === "ORDER LIST" ||
    stripped === "ALL ORDERS" ||
    stripped === "ORDERS" ||
    stripped === "VIEW ORDERS"
  ) return "LIST ORDERS";

  if (
    stripped === "MY ORDERS" ||
    stripped === "MY ORDER" ||
    stripped === "ORDER HISTORY" ||
    stripped === "SHOW MY ORDERS" ||
    stripped === "SHOW ME MY ORDERS" ||
    stripped === "VIEW MY ORDERS" ||
    stripped === "ALL MY ORDERS" ||
    stripped === "PAST ORDERS"
  ) return "MY ORDERS";

  if (
    stripped === "MY STATUS" ||
    stripped === "ORDER STATUS" ||
    stripped === "STATUS" ||
    stripped === "WHATS MY STATUS" ||
    stripped === "WHAT IS MY STATUS" ||
    stripped === "CHECK MY STATUS"
  ) return "MY STATUS";

  if (
    stripped === "SALES TODAY" ||
    stripped === "TODAY SALES" ||
    stripped === "TODAY REVENUE" ||
    stripped === "SALES REPORT TODAY" ||
    stripped === "HOW MUCH TODAY" ||
    stripped === "REVENUE TODAY" ||
    stripped === "TODAYS SALES" ||
    stripped === "TODAYS REVENUE" ||
    stripped === "DAILY SALES" ||
    stripped === "EARNINGS TODAY"
  ) return "SALES TODAY";

  if (
    stripped === "LOW STOCK" ||
    stripped === "STOCK ALERT" ||
    stripped === "LOW INVENTORY" ||
    stripped === "OUT OF STOCK" ||
    stripped === "STOCK STATUS" ||
    stripped === "CHECK STOCK" ||
    stripped === "INVENTORY" ||
    stripped === "INVENTORY STATUS" ||
    stripped === "WHAT IS LOW"
  ) return "LOW STOCK";

  if (
    stripped === "TOP STORES" ||
    stripped === "BEST STORES" ||
    stripped === "POPULAR STORES" ||
    stripped === "RECOMMENDED STORES" ||
    stripped === "WHATS HOT"
  ) return "TOP STORES";

  if (
    stripped.startsWith("VISIT STORE ") ||
    stripped.startsWith("GO TO STORE ") ||
    stripped.startsWith("SHOW STORE ") ||
    stripped.startsWith("OPEN STORE ")
  ) return "OPEN STORE";

  if (
    stripped === "HELP" ||
    stripped === "MENU" ||
    stripped === "COMMANDS" ||
    stripped === "WHAT CAN YOU DO" ||
    stripped === "WHAT CAN I DO" ||
    stripped === "SHOW COMMANDS" ||
    stripped === "LIST COMMANDS" ||
    stripped === "OPTIONS"
  ) return "HELP";

  return "UNKNOWN";
}
