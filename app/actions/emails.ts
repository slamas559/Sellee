"use server";

import { Resend } from "resend";
import SupportTicketEmail, {
  type SupportTicketEmailProps,
} from "@/emails/SupportTicketEmail";
import UpdateEmail, { type UpdateEmailProps } from "@/emails/UpdateEmail";
import WelcomeEmail, { type WelcomeEmailProps } from "@/emails/WelcomeEmail";
import OrderNotificationEmail, {
  type OrderNotificationEmailProps,
} from "@/emails/OrderNotificationEmail";

const SYSTEM_FROM = "Sellee Team <hello@sellee.store>";
const SUPPORT_FROM = "Sellee Support <support@sellee.store>";
const SUPPORT_REPLY_TO = "support@sellee.store";
const DEFAULT_APP_URL = "https://sellee.store";

type EmailActionResult<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: unknown;
};

export interface SendWelcomeEmailInput extends WelcomeEmailProps {
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

function appUrl(path = "/") {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_APP_URL;

  return new URL(path, baseUrl).toString();
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
