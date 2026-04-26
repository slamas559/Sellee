export function todayStartIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
  return start.toISOString();
}

export function extractRef(commandText: string): string | null {
  const parts = commandText.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  return parts[1] ?? null;
}

export function inferCommand(body: string): string {
  const normalized = body.trim().toUpperCase();

  if (normalized.startsWith("LINK ")) return "LINK";
  if (normalized.startsWith("CONFIRM ")) return "CONFIRM";
  if (normalized.startsWith("REJECT ")) return "REJECT";
  if (normalized.startsWith("TRACK ")) return "TRACK";
  if (normalized.startsWith("CANCEL ")) return "CANCEL";
  if (normalized.startsWith("FOLLOW ")) return "FOLLOW";
  if (normalized.startsWith("UNFOLLOW ")) return "UNFOLLOW";
  if (normalized === "LIST ORDERS") return "LIST ORDERS";
  if (normalized === "SALES TODAY") return "SALES TODAY";
  if (normalized === "LOW STOCK") return "LOW STOCK";
  if (normalized === "MY ORDERS") return "MY ORDERS";
  if (normalized === "MY FOLLOWS") return "MY FOLLOWS";
  if (normalized === "HELP") return "HELP";
  return "UNKNOWN";
}
