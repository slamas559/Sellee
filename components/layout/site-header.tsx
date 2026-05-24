import Image from "next/image";
import Link from "next/link";
import { Search, SearchIcon } from "lucide-react";
import logoText from "@/app/logos/image-text-logo.png";
import imageLogo from "@/app/logos/image-logo.png";
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
      <header className="sticky top-0 z-50 w-full border p-2 border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-2 sm:gap-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 sm:hidden">
            <Image
              src={logoText}
              alt="Sellee logo"
              className="h-7 w-auto"
              priority
            />
          </Link>

          <div className="hidden sm:flex w-full items-center justify-center gap-3 sm:gap-4 max-w-[1100px] mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 sm:px-3 sm:py-1 px-4 py-2">
              <Image
                src={logoText}
                alt="Sellee logo"
                className="h-7 w-auto sm:h-8"
                priority
              />
            </Link>

            <form action="/" className="sm:flex min-w-0 flex-1 bg-gray-200 basis-[150px] items-center gap-2 rounded-full border border-slate-200 p-1 sm:max-w-[680px] lg:max-w-[520px]">
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
              Search
            </button>
            </form>
            <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
          </div>

          <div className="sm:hidden">
            <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
          </div>
        </div>
        <form action="/" className="flex sm:hidden bg-gray-200 min-w-0 flex-1 basis-[150px] items-center gap-2 rounded-full border border-slate-200 p-1">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by product, category, or niche..."
            className="w-full bg-transparent px-3 py-1 text-sm text-slate-700 outline-none"
          />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <button
            type="submit"
            className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:px-5"
          >
            Search
          </button>
        </form>
      </header>

    );
}

