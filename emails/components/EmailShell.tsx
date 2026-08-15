import { Body, Head, Html, Preview, Tailwind } from "@react-email/components";
import * as React from "react";

export interface EmailShellProps {
  /** Preview/inbox snippet text. */
  previewText: string;
  width?: number;
  /** Card corner radius in px. */
  radius?: number;
  children: React.ReactNode;
}

/**
 * Shared wrapper for every Sellee email template.
 *
 * Why this exists: the Resend "preview" panel and `next dev` render your
 * React Email component in an actual browser, which supports the full CSS
 * spec. The email that actually lands in an inbox is rendered by the email
 * client's own (much more limited) HTML/CSS engine — Gmail in particular
 * strips or ignores properties like `justify-content`, and does not reliably
 * cap the width of a plain `<div>` the way a real browser does. That
 * mismatch is why a template can look correct in the dashboard preview but
 * render full-width / misaligned once actually sent.
 *
 * The fix is the standard "bulletproof email" pattern: lay out the outer
 * shell with a real HTML `<table>` (universally supported) and pin the width
 * with both an HTML attribute and inline CSS, instead of depending on
 * `max-width` alone.
 */
export function EmailShell({ previewText, width = 400, radius = 20, children }: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body
          className="m-0 w-full bg-white font-sans text-slate-700"
          style={{ backgroundColor: "#ffffff", margin: 0, padding: 0, width: "100%" }}
        >
          {/* Full-width, white outer table. Centers the card and guarantees a
              white canvas even in clients that ignore the <body> background. */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{ width: "100%", backgroundColor: "#ffffff", margin: 0, padding: 0 }}
          >
            <tbody>
              <tr>
                <td align="center" style={{ padding: "32px 12px", backgroundColor: "#ffffff" }}>
                  {/* Deliberately NOT using react-email's <Container>: it
                      renders its outer <table> with a hard-coded
                      `width="100%"` HTML attribute that you can't override via
                      `style`. Email clients (Gmail included) treat that
                      attribute as authoritative over CSS max-width/width, so
                      the card kept rendering full-width no matter what inline
                      style was applied. Setting the attribute itself to the
                      real pixel value fixes it for good. */}
                  <table
                    align="center"
                    role="presentation"
                    width={width}
                    cellPadding={0}
                    cellSpacing={0}
                    style={{
                      width,
                      maxWidth: width,
                      margin: "0 auto",
                      backgroundColor: "#ffffff",
                      borderRadius: radius,
                      overflow: "hidden",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: "#ffffff" }}>{children}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default EmailShell;