"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createHelpCenterTicket, type EmailActionResult } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { getIpFromHeaders } from "@/lib/request-ip";

// This is the only email-related Server Action: it is called straight from the
// public Help Center form, so anyone on the internet can invoke it with any
// arguments. It therefore validates its input and limits how often it can run
// (it sends mail to whatever address is supplied, so it must not be usable to
// spam strangers).
const ticketSchema = z.object({
  requesterEmail: z.string().trim().toLowerCase().email().max(254),
  requesterName: z.string().trim().max(80).optional(),
  issueType: z.string().trim().max(80),
  details: z.string().trim().min(10).max(3000),
});

function failure(message: string): EmailActionResult<{ ticketId: string }> {
  return { success: false, error: { message } };
}

export async function submitHelpCenterTicket(
  input: unknown,
): Promise<EmailActionResult<{ ticketId: string }>> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "requesterEmail") return failure("Please enter a valid email address.");
    if (field === "details") {
      return failure("Please describe the issue in 10 to 3000 characters.");
    }
    return failure("Please check the form and try again.");
  }

  const headerList = await headers();
  const ip = getIpFromHeaders(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"));
  const hour = 60 * 60 * 1000;

  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`help-ticket-ip:${ip}`, 5, hour),
    checkRateLimit(`help-ticket-email:${parsed.data.requesterEmail}`, 3, hour),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return failure("You've sent several requests recently. Please try again in a little while.");
  }

  return createHelpCenterTicket(parsed.data);
}
