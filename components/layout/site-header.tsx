import Image from "next/image";
import Link from "next/link";
import { Search, SearchIcon } from "lucide-react";
import logoText from "@/app/logos/image-text-logo.png";
import { UserMenu } from "@/components/layout/user-menu";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";


type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default async function SiteHeader({ searchParams }: HomeProps) {
    const session = await getServerSession(authOptions);
    const params = await searchParams;
    const q = params.q?.trim() || undefined;
    const category = params.category?.trim() || undefined;

    const isLoggedIn = Boolean(session?.user?.id);
    const isVendor = session?.user?.role === "vendor";

    return (
        <header className="sticky top-0 z-50 rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-3 py-4 sm:gap-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
            <Image
              src={logoText}
              alt="Sellee logo"
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>

          <form action="/" className="flex min-w-0 flex-1 basis-[150px] items-center gap-2 rounded-full border border-slate-200 bg-white p-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by product, category, or niche..."
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 outline-none"
            />
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <button
              type="submit"
              className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <SearchIcon size={17}/>
            </button>
          </form>
          <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
        </div>
      </header>

    );
}

