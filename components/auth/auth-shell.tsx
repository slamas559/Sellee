import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-auth-jakarta",
});

type AuthShellProps = {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const SIDE_IMAGE =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1800&q=80";

export function AuthShell({ mode, title, subtitle, children }: AuthShellProps) {
  const isRegister = mode === "register";

  return (
    <main
      className={`auth-enter min-h-screen w-full overflow-x-hidden lg:h-screen lg:overflow-hidden ${jakarta.variable}`}
    >
      <section className="grid min-h-screen w-full overflow-x-hidden bg-white lg:h-full lg:min-h-0 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative min-h-[260px] overflow-hidden lg:h-full lg:min-h-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${SIDE_IMAGE})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/35 via-emerald-500/25 to-yellow-300/30" />
          <div className="absolute inset-0 bg-white/12 backdrop-blur-[1.5px]" />

          <div className="relative z-10 flex h-full flex-col justify-between px-5 py-7 text-white sm:px-8 sm:py-9 lg:px-10 lg:py-9">
            <div className="max-w-xl space-y-3 sm:space-y-4">
              <p className="inline-flex rounded-full border border-white/70 bg-white/20 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-white">
                SELLEE
              </p>
              <h1 className="text-3xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)] sm:text-4xl lg:text-5xl">
                {isRegister
                  ? "Shop smart today or launch your store tomorrow."
                  : "Welcome back to your Sellee space."}
              </h1>
              <p className="max-w-lg text-sm text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)] sm:text-base">
                {isRegister
                  ? "Customers discover trusted nearby products. Vendors build sleek storefronts and automate sales on WhatsApp."
                  : "Sign in to browse products, track orders, or manage your store and growth in one place."}
              </p>
            </div>

            <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              <div
                className={`min-w-[170px] snap-start rounded-2xl border border-white/60 px-3 py-3 backdrop-blur-sm sm:min-w-0 ${
                  isRegister ? "bg-white/36" : "bg-white/24"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Step 1
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isRegister ? "Create account" : "Sign in"}
                </p>
              </div>
              <div className="min-w-[170px] snap-start rounded-2xl border border-white/55 bg-white/24 px-3 py-3 backdrop-blur-sm sm:min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Step 2
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isRegister ? "Verify WhatsApp" : "Open your account"}
                </p>
              </div>
              <div className="min-w-[170px] snap-start rounded-2xl border border-white/55 bg-white/24 px-3 py-3 backdrop-blur-sm sm:min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Step 3
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isRegister ? "Shop or start selling" : "Shop, sell, and track"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="relative flex min-h-0 items-center overflow-hidden bg-gradient-to-b from-white to-emerald-50/30 px-4 py-7 sm:px-7 lg:h-full lg:min-h-0 lg:px-10 lg:py-6">
          <div className="auth-glow pointer-events-none absolute -right-10 top-10 h-44 w-44 rounded-full bg-emerald-300/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-10 h-44 w-44 rounded-full bg-yellow-300/35 blur-3xl" />

          <div className="relative z-10 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-w-[500px] rounded-3xl border border-emerald-100 bg-white/88 p-4 shadow-[0_30px_60px_-40px_rgba(22,163,74,0.45)] backdrop-blur-sm sm:p-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                {isRegister ? "Create your account" : "Sign in to continue"}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>

            <div className="mt-5">{children}</div>

            <p className="mt-5 text-center text-xs text-slate-600 sm:text-sm">
              {isRegister ? "Already have an account?" : "New to Sellee?"}{" "}
              <Link
                href={isRegister ? "/login" : "/register"}
                className="font-semibold text-emerald-700 transition hover:text-emerald-800 hover:underline"
              >
                {isRegister ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
