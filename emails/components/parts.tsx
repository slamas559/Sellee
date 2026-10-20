import * as React from "react";
import { Button, Column, Heading, Hr, Img, Link, Row, Section, Text } from "@react-email/components";
import { color, font } from "./tokens";

/** Page title: strong but not shouty. Weight 700, not 900. */
export function Title({ children, size = 26 }: { children: React.ReactNode; size?: number }) {
  return (
    <Heading
      as="h1"
      style={{
        margin: "0 0 14px",
        fontFamily: font.sans,
        fontSize: size,
        lineHeight: `${size + 8}px`,
        fontWeight: 700,
        letterSpacing: "-0.015em",
        color: color.ink,
      }}
    >
      {children}
    </Heading>
  );
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h2"
      style={{
        margin: "28px 0 8px",
        fontFamily: font.sans,
        fontSize: 17,
        lineHeight: "24px",
        fontWeight: 700,
        letterSpacing: "-0.005em",
        color: color.ink,
      }}
    >
      {children}
    </Heading>
  );
}

export function P({
  children,
  muted = false,
  small = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontFamily: font.sans,
        fontSize: small ? 13 : 16,
        lineHeight: small ? "20px" : "26px",
        color: muted ? color.muted : color.body,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

/** The one solid action in the email. Navy, square-ish corners, left aligned. */
export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "20px 0 4px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: color.ink,
          color: "#FFFFFF",
          fontFamily: font.sans,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: "20px",
          textDecoration: "none",
          borderRadius: 8,
          padding: "13px 24px",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: color.brandDark, fontWeight: 600, textDecoration: "underline" }}>
      {children}
    </Link>
  );
}

type NoticeTone = "neutral" | "warn" | "danger" | "ok";
const NOTICE_LINE: Record<NoticeTone, string> = {
  neutral: color.line,
  warn: color.warnLine,
  danger: color.dangerLine,
  ok: color.brand,
};

/** A quiet callout: a coloured rule on the left, no tinted box. */
export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: NoticeTone;
}) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "20px 0 4px" }}>
      <tbody>
        <tr>
          <td style={{ borderLeft: `3px solid ${NOTICE_LINE[tone]}`, padding: "2px 0 2px 16px" }}>
            {title ? (
              <Text style={{ margin: "0 0 4px", fontFamily: font.sans, fontSize: 14, lineHeight: "20px", fontWeight: 700, color: color.ink }}>
                {title}
              </Text>
            ) : null}
            <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 14, lineHeight: "22px", color: color.body }}>{children}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Invisible in the rendered email, but plain-text conversion ignores CSS and
 * keeps it, so "Label: value" rows stay readable in the text version instead
 * of running together ("NameNgozi AdeyemiWhatsApp...").
 */
const TEXT_ONLY: React.CSSProperties = { display: "none", maxHeight: 0, overflow: "hidden", fontSize: 0, lineHeight: 0, msoHide: "all" } as React.CSSProperties;

export type DetailRowData = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
  /** The total line: larger, bold. */
  strong?: boolean;
  /** The main item of the table (e.g. the product): label in ink, semi-bold. */
  lead?: boolean;
};

/**
 * Label / value rows separated by hairlines, like a receipt. Two-column
 * <table>, because flexbox alignment is stripped by many email clients.
 */
export function DetailTable({ rows }: { rows: DetailRowData[] }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "20px 0 8px", borderTop: `1px solid ${color.line}` }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.label}-${i}`}>
            <td
              valign={row.strong ? "baseline" : "top"}
              style={{
                padding: row.strong ? "16px 12px 16px 0" : "13px 12px 13px 0",
                borderBottom: `1px solid ${color.line}`,
                fontFamily: font.sans,
                fontSize: row.strong ? 16 : row.lead ? 15 : 14,
                lineHeight: "22px",
                fontWeight: row.strong ? 700 : row.lead ? 600 : 400,
                color: row.strong || row.lead ? color.ink : color.muted,
                width: row.lead ? "62%" : "38%",
              }}
            >
              {row.label}
              <span style={TEXT_ONLY}>: </span>
            </td>
            <td
              align="right"
              valign={row.strong ? "baseline" : "top"}
              style={{
                padding: row.strong ? "16px 0" : "13px 0",
                borderBottom: `1px solid ${color.line}`,
                fontFamily: row.mono ? font.mono : font.sans,
                fontSize: row.strong ? 20 : 14,
                lineHeight: row.strong ? "26px" : "22px",
                fontWeight: row.strong ? 700 : 500,
                color: color.ink,
                wordBreak: "break-word",
              }}
            >
              {row.value}
              {row.hint ? (
                <div style={{ marginTop: 2, fontSize: 13, lineHeight: "18px", fontWeight: 400, color: color.muted }}>{row.hint}</div>
              ) : null}
              <br style={TEXT_ONLY} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Numbered next steps: plain numerals, no icons or badges. */
export function Steps({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0 0" }}>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.title}>
            <td valign="top" width={32} style={{ padding: "10px 0", fontFamily: font.sans, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: color.brandDark }}>
              {i + 1}
              <span style={TEXT_ONLY}>. </span>
            </td>
            <td style={{ padding: "10px 0", borderTop: i === 0 ? undefined : `1px solid ${color.line}` }}>
              <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: color.ink }}>{item.title}</Text>
              <Text style={{ margin: "2px 0 0", fontFamily: font.sans, fontSize: 14, lineHeight: "22px", color: color.muted }}>{item.body}</Text>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Raw-link fallback for security emails, so a broken button never blocks the user. */
export function FallbackLink({ href, intro = "Button not working? Paste this link into your browser:" }: { href: string; intro?: string }) {
  return (
    <>
      <Hr style={{ border: "none", borderTop: `1px solid ${color.line}`, margin: "28px 0 16px" }} />
      <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 12, lineHeight: "18px", color: color.muted }}>{intro}</Text>
      <Text style={{ margin: "4px 0 0", fontFamily: font.mono, fontSize: 12, lineHeight: "18px", color: color.muted, wordBreak: "break-all" }}>
        <Link href={href} style={{ color: color.muted, textDecoration: "underline" }}>
          {href}
        </Link>
      </Text>
    </>
  );
}

export function Avatar({ src, alt, size = 40 }: { src?: string | null; alt: string; size?: number }) {
  if (src) {
    return <Img src={src} alt={alt} width={size} height={size} style={{ borderRadius: 8, objectFit: "cover", display: "block" }} />;
  }
  return (
    <table role="presentation" width={size} cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td
            align="center"
            valign="middle"
            style={{ width: size, height: size, borderRadius: 8, backgroundColor: color.brandSoft, color: "#166534", fontFamily: font.sans, fontSize: size * 0.42, fontWeight: 700 }}
          >
            {alt.charAt(0).toUpperCase()}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export { Row, Column };
