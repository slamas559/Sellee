import { requireAdminPage } from "@/lib/admin-auth";
import { AtlasSidebar } from "@/components/admin-console/atlas-sidebar";
import { AtlasTopbar } from "@/components/admin-console/atlas-topbar";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Second layer of defense behind proxy.ts — see lib/admin-auth.ts.
  const session = await requireAdminPage();

  // ID submissions waiting for review, shown next to "Vendor verification".
  const { count: pendingVerifications } = await createAdminSupabaseClient()
    .from("vendor_verifications")
    .select("id", { count: "exact", head: true })
    .eq("type", "id")
    .eq("status", "pending");

  return (
    <div className="flex min-h-dvh">
      <AtlasSidebar pendingVerifications={pendingVerifications ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AtlasTopbar adminName={session.user.name} adminEmail={session.user.email} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
