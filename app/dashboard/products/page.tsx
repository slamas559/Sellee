import { getServerSession } from "next-auth";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { authOptions } from "@/lib/auth";
import { getVendorProducts } from "@/lib/dashboard-data";

export default async function DashboardProductsPage() {
  const session = await getServerSession(authOptions);
  const products = session?.user?.id ? await getVendorProducts(session.user.id) : [];

  return <ProductsManager initialProducts={products} />;
}
