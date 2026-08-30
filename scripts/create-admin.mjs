// One-time bootstrap for the very first Atlas admin account.
//
// The invite system (built into the console itself) needs at least one
// existing admin to send an invite, so it can't create itself. This script
// hashes a password the same way the app's credentials login does and
// prints an INSERT you run once in the Supabase SQL editor. Every admin
// after this one should come through "Invite an admin" inside the console,
// not this script.
//
// Usage:
//   node scripts/create-admin.mjs "you@example.com" "Your Name"
// You'll be prompted for a password (not passed as an argument, so it
// never ends up in your shell history).

import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function promptPassword() {
  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question("Password for this admin account: ");
  rl.close();
  return password;
}

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(" ").trim();

  if (!email || !email.includes("@")) {
    console.error('Usage: node scripts/create-admin.mjs "you@example.com" "Your Name"');
    process.exit(1);
  }

  const password = await promptPassword();
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.trim().toLowerCase();

  // Postgres string literals use single quotes, not double quotes -
  // JSON.stringify() produces double-quoted strings, which Postgres reads
  // as identifiers instead. This escapes for SQL specifically: wraps in
  // single quotes and doubles any single quote found inside the value.
  function sqlString(value) {
    if (value === null || value === undefined) return "null";
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  console.log("\nRun this once in the Supabase SQL editor:\n");
  console.log(
    `insert into public.users (email, password_hash, full_name, role)\n` +
      `values (\n` +
      `  ${sqlString(normalizedEmail)},\n` +
      `  ${sqlString(hash)},\n` +
      `  ${sqlString(fullName || null)},\n` +
      `  'admin'\n` +
      `)\n` +
      `on conflict (email) do update set role = 'admin', password_hash = excluded.password_hash;\n`,
  );
  console.log("After that, sign in at your admin subdomain's /admin-console/login.");
}

main();
