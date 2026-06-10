// scripts/test-email.ts  (run with: npx tsx scripts/test-email.ts)
import { Resend } from "resend";
import WelcomeEmail from "../emails/WelcomeEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Sellee <hello@sellee.store>",
  to: "abdulsalamabayomi300@gmail.com",   // your real Gmail
  subject: "Welcome email test",
  react: WelcomeEmail({
    name: "Salam",
    role: "vendor",
  }),
});

console.log("Sent!");