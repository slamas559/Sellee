"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AtlasWordmark } from "./atlas-mark";

const NAV_SECTIONS: Array<{ label: string; items: Array<{ href: string; label: string }> }> = [
  {
    label: "Overview",
    items: [{ href: "/admin-console", label: "Dashboard" }],
  },
    {
    label: "Platform",
    items: [
      { href: "/admin-console/analytics", label: "Analytics & earnings" },
      { href: "/admin-console/users", label: "Users & vendors" },
      { href: "/admin-console/orders", label: "Orders" },
      { href: "/admin-console/catalog", label: "Catalog" },
    ],
  },
  {
    label: "Comms",
    items: [
      { href: "/admin-console/emails", label: "Email composer" },
      { href: "/admin-console/support", label: "Support & moderation" },
    ],
  },
  {
    label: "Console",
    items: [
      { href: "/admin-console/admins", label: "Admins" },
      { href: "/admin-console/audit-log", label: "Audit log" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin-console") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AtlasSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-[220px] shrink-0 flex-col md:flex"
      style={{ background: "var(--atlas-ink)", color: "var(--atlas-text-on-ink)" }}
    >
      <div
        className="flex items-center px-5 py-5"
        style={{ borderBottom: "1px solid var(--atlas-ink-line)" }}
      >
        <AtlasWordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6">
            <p
              className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--atlas-text-on-ink-muted)" }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname ?? "", item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-[3px] px-2.5 py-1.5 text-[13px] transition-colors"
                      style={{
                        background: active ? "var(--atlas-ink-soft)" : "transparent",
                        color: active ? "var(--atlas-text-on-ink)" : "var(--atlas-text-on-ink-muted)",
                        borderLeft: active
                          ? "2px solid var(--atlas-brass)"
                          : "2px solid transparent",
                        paddingLeft: active ? "8px" : "10px",
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
