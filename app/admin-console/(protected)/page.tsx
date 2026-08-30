import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <div className="max-w-3xl">
      <p className="atlas-kicker">Atlas</p>
      <h1 className="atlas-display mb-1 mt-1 text-[26px] font-medium">Dashboard</h1>
      <p className="text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        All seven v1 modules are live.
      </p>

      <div className="atlas-panel mt-6 divide-y" style={{ borderColor: "var(--atlas-line)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Analytics & earnings</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Platform totals, revenue trend, per-vendor earnings.
            </p>
          </div>
          <Link href="/admin-console/analytics" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Email composer</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Send to a segment of vendors or customers.
            </p>
          </div>
          <Link href="/admin-console/emails" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Orders</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Every order across every store.
            </p>
          </div>
          <Link href="/admin-console/orders" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Users & vendors</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Suspend or delete customer and vendor accounts.
            </p>
          </div>
          <Link href="/admin-console/users" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Support & moderation</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Help Center tickets and reported listings.
            </p>
          </div>
          <Link href="/admin-console/support" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Admins</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Invite trusted people, review access, revoke it.
            </p>
          </div>
          <Link href="/admin-console/admins" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Catalog</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Manage niches and categories.
            </p>
          </div>
          <Link href="/admin-console/catalog" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Audit log</p>
            <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              Every admin action, in order.
            </p>
          </div>
          <Link href="/admin-console/audit-log" className="atlas-btn" data-variant="outline">
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}