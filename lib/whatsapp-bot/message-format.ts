export function waTitle(title: string): string {
  return `*${title}*`;
}

export function waList(lines: string[], bullet = "- "): string {
  return lines.map((line) => `${bullet}${line}`).join("\n");
}

export function waMessage(...sections: Array<string | null | undefined>): string {
  return sections
    .map((section) => (section ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function formatBotStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
