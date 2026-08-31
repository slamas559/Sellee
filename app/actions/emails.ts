"use server";

import { Resend } from "resend";
import { appUrl } from "@/lib/app-url";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import SupportTicketEmail, {
  type SupportTicketEmailProps,
} from "@/emails/SupportTicketEmail";
import UpdateEmail, { type UpdateEmailProps } from "@/emails/UpdateEmail";
import WelcomeEmail, { type WelcomeEmailProps } from "@/emails/WelcomeEmail";
import PasswordResetEmail, {
  type PasswordResetEmailProps,
} from "@/emails/PasswordResetEmail";
import EmailVerificationEmail, {
  type EmailVerificationEmailProps,
} from "@/emails/EmailVerificationEmail";
import OrderNotificationEmail, {
  type OrderNotificationEmailProps,
} from "@/emails/OrderNotificationEmail";
import AdminInviteEmail, {
  type AdminInviteEmailProps,
} from "@/emails/AdminInviteEmail";
import AdminBroadcastEmail, {
  type AdminBroadcastEmailProps,
} from "@/emails/AdminBroadcastEmail";

const SYSTEM_FROM = "Sellee <hello@sellee.store>";
const SUPPORT_FROM = "Sellee <support@sellee.store>";
const SUPPORT_REPLY_TO = "support@sellee.store";

type EmailActionResult<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: unknown;
};

export interface SendWelcomeEmailInput extends WelcomeEmailProps {
  to: string;
  subject?: string;
}

export interface SendPasswordResetEmailInput extends PasswordResetEmailProps {
  to: string;
  subject?: string;
}

export interface SendEmailVerificationEmailInput extends EmailVerificationEmailProps {
  to: string;
  subject?: string;
}

export interface SendUpdateEmailInput extends UpdateEmailProps {
  to: string | string[];
  subject?: string;
}

export interface SendSupportTicketEmailInput extends SupportTicketEmailProps {
  to: string;
}

export interface SendOrderNotificationEmailInput extends OrderNotificationEmailProps {
  to: string;
}

export interface SendAdminInviteEmailInput extends AdminInviteEmailProps {
  to: string;
  subject?: string;
}

export interface SendAdminBroadcastEmailInput extends AdminBroadcastEmailProps {
  to: string;
}

export interface SubmitHelpCenterTicketInput {
  requesterEmail: string;
  requesterName?: string;
  issueType: string;
  details: string;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return error;
}

function makeTicketId() {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `SEL-${stamp}-${suffix}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail({
  to,
  subject = "Welcome to Sellee",
  name,
  role = "customer",
  marketplaceUrl = appUrl("/marketplace"),
}: SendWelcomeEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject,
      react: WelcomeEmail({
        name,
        role,
        marketplaceUrl,
      }),
    });

    // Development-only debug logging to surface Resend responses without
    // affecting production behavior. Keeps the function non-blocking.
    if (process.env.NODE_ENV === "development") {
      try {
        // Use console.debug so logs can be filtered; include both data and
        // error for easier troubleshooting during local testing.
        // eslint-disable-next-line no-console
        console.debug("[sendWelcomeEmail] resend response:", { data, error });
      } catch (logErr) {
        // Swallow logging errors to avoid interfering with email flow.
      }
    }

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendPasswordResetEmail({
  to,
  subject = "Reset your Sellee password",
  name,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject,
      react: PasswordResetEmail({ name, resetUrl }),
    });

    if (process.env.NODE_ENV === "development") {
      try {
        // eslint-disable-next-line no-console
        console.debug("[sendPasswordResetEmail] resend response:", { data, error });
      } catch (logErr) {
        // Swallow logging errors to avoid interfering with email flow.
      }
    }

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendEmailVerificationEmail({
  to,
  subject = "Verify your email for Sellee",
  name,
  verifyUrl,
}: SendEmailVerificationEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject,
      react: EmailVerificationEmail({ name, verifyUrl }),
    });

    if (process.env.NODE_ENV === "development") {
      try {
        // eslint-disable-next-line no-console
        console.debug("[sendEmailVerificationEmail] resend response:", { data, error });
      } catch (logErr) {
        // Swallow logging errors to avoid interfering with email flow.
      }
    }

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendUpdateEmail({
  to,
  subject,
  headline,
  previewText,
  intro,
  heroImageUrl,
  heroAlt,
  blocks,
  actionLabel,
  actionUrl = appUrl("/"),
  footerNote,
}: SendUpdateEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject: subject ?? headline,
      react: UpdateEmail({
        headline,
        previewText,
        intro,
        heroImageUrl,
        heroAlt,
        blocks,
        actionLabel,
        actionUrl,
        footerNote,
      }),
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendSupportTicketEmail({
  to,
  ticketId,
  name,
  subject,
}: SendSupportTicketEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SUPPORT_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject: `We received your support request ${ticketId}`,
      react: SupportTicketEmail({
        ticketId,
        name,
        subject,
      }),
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function submitHelpCenterTicket({
  requesterEmail,
  requesterName,
  issueType,
  details,
}: SubmitHelpCenterTicketInput): Promise<EmailActionResult<{ ticketId: string }>> {
  try {
    const cleanEmail = requesterEmail.trim().toLowerCase();
    const cleanName = requesterName?.trim() || "Sellee user";
    const cleanIssueType = issueType.trim() || "Support request";
    const cleanDetails = details.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        success: false,
        error: { message: "Please enter a valid email address." },
      };
    }

    if (cleanDetails.length < 10) {
      return {
        success: false,
        error: { message: "Please add a little more detail about the issue." },
      };
    }

        const resend = getResendClient();
        const ticketId = makeTicketId();

        const supabase = createAdminSupabaseClient();
        const { error: persistError } = await supabase.from("support_tickets").insert({
          ticket_ref: ticketId,
          requester_email: cleanEmail,
          requester_name: cleanName,
          issue_type: cleanIssueType,
          details: cleanDetails,
        });
        if (persistError) {
          // Don't block the actual support request over a persistence miss -
          // the email still goes out either way. Just means this one won't
          // show up in the admin inbox.
          logDevError("support-tickets.persist", persistError, { ticketId });
        }

        const { data, error } = await resend.emails.send({
          from: SUPPORT_FROM,
          to: SUPPORT_REPLY_TO,
          replyTo: SUPPORT_REPLY_TO,
          subject: `[${ticketId}] ${cleanIssueType}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
              <h1 style="font-size: 22px; margin: 0 0 12px;">New Sellee support request</h1>
              <p style="margin: 0 0 16px;">A user submitted the Help Center issue report form.</p>
              <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Ticket ID</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(ticketId)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Issue type</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(cleanIssueType)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Name</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(cleanName)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Requester email</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(cleanEmail)}</td>
                </tr>
              </table>
              <h2 style="font-size: 16px; margin: 22px 0 8px;">Details</h2>
              <p style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">${escapeHtml(cleanDetails)}</p>
            </div>
          `,
          text: [
            "New Sellee support request",
            "",
            `Ticket ID: ${ticketId}`,
            `Issue type: ${cleanIssueType}`,
            `Name: ${cleanName}`,
            `Requester email: ${cleanEmail}`,
            "",
            "Details:",
            cleanDetails,
          ].join("\n"),
        });

        if (error) {
          return { success: false, error };
        }

    await sendSupportTicketEmail({
      to: cleanEmail,
      ticketId,
      name: cleanName,
      subject: cleanIssueType,
    });

    return { success: true, data: { ticketId, ...data } };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendOrderNotificationEmail({
  to,
  storeName,
  orderRef,
  customerName,
  customerWhatsApp,
  productName,
  quantity,
  unitPrice,
  totalAmount,
  dashboardUrl = appUrl("/dashboard/orders"),
}: SendOrderNotificationEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject: `New Order Received - ${orderRef}`,
      react: OrderNotificationEmail({
        storeName,
        orderRef,
        customerName,
        customerWhatsApp,
        productName,
        quantity,
        unitPrice,
        totalAmount,
        dashboardUrl,
      }),
    });

    if (process.env.NODE_ENV === "development") {
      try {
        // eslint-disable-next-line no-console
        console.debug("[sendOrderNotificationEmail] resend response:", { data, error });
      } catch (logErr) {
        // Swallow logging errors
      }
    }

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}
export async function sendAdminInviteEmail({
  to,
  subject = "You've been invited to Sellee's admin console",
  inviterName,
  acceptUrl,
}: SendAdminInviteEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject,
      react: AdminInviteEmail({ inviterName, acceptUrl }),
    });

    if (process.env.NODE_ENV === "development") {
      try {
        // eslint-disable-next-line no-console
        console.debug("[sendAdminInviteEmail] resend response:", { data, error });
      } catch (logErr) {
        // Swallow logging errors
      }
    }

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export async function sendAdminBroadcastEmail({
  to,
  subject,
  paragraphs,
  recipientName,
}: SendAdminBroadcastEmailInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SYSTEM_FROM,
      to,
      replyTo: SUPPORT_REPLY_TO,
      subject,
      react: AdminBroadcastEmail({ subject, paragraphs, recipientName }),
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

export interface SendProductReportNotificationInput {
  productId: string;
  productName: string;
  productUrl: string;
  storeName: string;
  reason: string;
  details?: string | null;
  reporterEmail?: string | null;
}

/**
 * Internal notification to support@sellee.store when a customer reports a
 * product - mirrors the plain-HTML internal notification already sent for
 * Help Center tickets, just aimed at a different admin (support-panel.tsx
 * covers the dashboard side; this covers the inbox side).
 */
export async function sendProductReportNotificationEmail({
  productId,
  productName,
  productUrl,
  storeName,
  reason,
  details,
  reporterEmail,
}: SendProductReportNotificationInput): Promise<EmailActionResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: SUPPORT_FROM,
      to: SUPPORT_REPLY_TO,
      replyTo: SUPPORT_REPLY_TO,
      subject: `[Report] ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h1 style="font-size: 22px; margin: 0 0 12px;">A product was reported</h1>
          <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Product</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(productName)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Store</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(storeName)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Reason</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(reason)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 700;">Reporter</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">${escapeHtml(reporterEmail || "Anonymous")}</td>
            </tr>
          </table>
          ${details ? `<h2 style="font-size: 16px; margin: 22px 0 8px;">Details</h2><p>${escapeHtml(details)}</p>` : ""}
          <p style="margin-top: 22px;"><a href="${productUrl}">View the product</a> · <a href="${adminConsoleUrl("/admin-console/support")}">Open in Atlas</a></p>
          <p style="margin-top: 10px; font-size: 12px; color: #64748b;">Product ID: ${escapeHtml(productId)}</p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}
