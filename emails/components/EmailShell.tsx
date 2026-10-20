import { Body, Column, Head, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { color, EMAIL_WIDTH, font, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, SITE_URL, SUPPORT_EMAIL } from "./tokens";

export interface EmailShellProps {
  /** Inbox preview text shown next to the subject line. */
  previewText: string;
  /** Small label on the right of the header, e.g. "Atlas · Admin". */
  headerTag?: string;
  /** Replaces the default Sellee logo header (used for vendor-branded emails). */
  header?: React.ReactNode;
  /** Why the recipient is getting this email; shown at the top of the footer. */
  reason?: React.ReactNode;
  /**
   * Replaces the default "reply to this email" help line. Pass `null` to hide it.
   * Needed where replying would NOT reach the sender (vendor broadcasts) or
   * where the line makes no sense (internal emails).
   */
  help?: React.ReactNode;
  /** @deprecated Kept so older call sites compile. Every email is the same width now. */
  width?: number;
  /** @deprecated Kept so older call sites compile. */
  radius?: number;
  children: React.ReactNode;
}

/**
 * Mobile rules. Gmail, Apple Mail and most phone clients honour <style> media
 * queries, so the fixed-width card collapses to the screen on small devices.
 * Clients that ignore them (some desktop Outlook builds) keep the 560px card.
 */
const RESPONSIVE_CSS = `
  body { margin: 0 !important; padding: 0 !important; }
  a { color: inherit; }
  @media only screen and (max-width: 600px) {
    .sl-outer { padding: 12px 8px 24px !important; }
    .sl-card { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }
    .sl-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .sl-foot { width: 100% !important; }
  }
`;

/**
 * Shared wrapper for every Sellee email.
 *
 * Layout is built from real <table>s with the width pinned both as an HTML
 * attribute and in inline CSS. Email clients (Gmail especially) treat the
 * attribute as authoritative and ignore flexbox and most max-width tricks, so
 * this is the only pattern that renders the same everywhere.
 */
export function EmailShell({ previewText, headerTag, header, reason, help, children }: EmailShellProps) {
  const year = new Date().getFullYear();

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{RESPONSIVE_CSS}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ margin: 0, padding: 0, width: "100%", backgroundColor: color.canvas, fontFamily: font.sans }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ width: "100%", backgroundColor: color.canvas }}>
          <tbody>
            <tr>
              <td align="center" className="sl-outer" style={{ padding: "40px 16px 48px", backgroundColor: color.canvas }}>
                {/* Card */}
                <table
                  role="presentation"
                  className="sl-card"
                  align="center"
                  width={EMAIL_WIDTH}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: EMAIL_WIDTH,
                    maxWidth: EMAIL_WIDTH,
                    backgroundColor: color.card,
                    border: `1px solid ${color.line}`,
                    borderRadius: 12,
                  }}
                >
                  <tbody>
                    <tr>
                      <td className="sl-pad" style={{ padding: "32px 40px 4px" }}>
                        {header ?? (
                          <Row>
                            <Column>
                              <Link href={SITE_URL}>
                                <Img src={LOGO_URL} alt="Sellee" width={LOGO_WIDTH} height={LOGO_HEIGHT} style={{ display: "block", border: 0 }} />
                              </Link>
                            </Column>
                            {headerTag ? (
                              <Column align="right" valign="middle">
                                <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 12, lineHeight: "16px", letterSpacing: "0.02em", color: color.muted }}>
                                  {headerTag}
                                </Text>
                              </Column>
                            ) : null}
                          </Row>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="sl-pad" style={{ padding: "24px 40px 40px" }}>
                        {children}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer, outside the card */}
                <table role="presentation" className="sl-foot" align="center" width={EMAIL_WIDTH} cellPadding={0} cellSpacing={0} style={{ width: EMAIL_WIDTH, maxWidth: EMAIL_WIDTH }}>
                  <tbody>
                    <tr>
                      <td className="sl-pad" style={{ padding: "24px 40px 0" }}>
                        {reason ? (
                          <Text style={{ margin: "0 0 12px", fontFamily: font.sans, fontSize: 12, lineHeight: "19px", color: color.muted }}>{reason}</Text>
                        ) : null}
                        {help === null ? null : (
                          <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 12, lineHeight: "19px", color: color.muted }}>
                            {help ?? (
                              <>
                                Questions? Just reply to this email or write to{" "}
                                <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ color: color.muted, textDecoration: "underline" }}>
                                  {SUPPORT_EMAIL}
                                </Link>
                                .
                              </>
                            )}
                          </Text>
                        )}
                        <Text style={{ margin: help === null ? 0 : "8px 0 0", fontFamily: font.sans, fontSize: 12, lineHeight: "19px", color: color.muted }}>
                          &copy; {year} Sellee &nbsp;&middot;&nbsp;{" "}
                          <Link href={`${SITE_URL}/help`} style={{ color: color.muted, textDecoration: "underline" }}>
                            Help
                          </Link>{" "}
                          &nbsp;&middot;&nbsp;{" "}
                          <Link href={`${SITE_URL}/privacy`} style={{ color: color.muted, textDecoration: "underline" }}>
                            Privacy
                          </Link>{" "}
                          &nbsp;&middot;&nbsp;{" "}
                          <Link href={`${SITE_URL}/terms`} style={{ color: color.muted, textDecoration: "underline" }}>
                            Terms
                          </Link>
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export default EmailShell;
// Section is re-exported for templates that want a plain spacing wrapper.
export { Section };
