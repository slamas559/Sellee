import { requireAdminPage } from "@/lib/admin-auth";
import { AtlasSidebar } from "@/components/admin-console/atlas-sidebar";
import { AtlasTopbar } from "@/components/admin-console/atlas-topbar";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Second layer of defense behind proxy.ts — see lib/admin-auth.ts.
  const session = await requireAdminPage();

  return (
    <div className="flex min-h-dvh">
      <AtlasSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AtlasTopbar adminName={session.user.name} adminEmail={session.user.email} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
