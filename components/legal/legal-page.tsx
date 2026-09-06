import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  kicker: string;
  title: string;
  meta: string;
  sections: LegalSection[];
  footer?: ReactNode;
};

export function LegalPage({ kicker, title, meta, sections, footer }: LegalPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{kicker}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{meta}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Desktop sticky table of contents */}
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24 space-y-1 border-l border-slate-200 pl-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              On this page
            </p>
            {sections.map((section, i) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block py-1 text-sm text-slate-600 transition hover:text-emerald-700"
              >
                <span className="mr-1.5 font-mono text-xs text-slate-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Mobile collapsible table of contents */}
        <details className="rounded-lg border border-slate-200 bg-white p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            On this page
          </summary>
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
            {sections.map((section, i) => (
              <a key={section.id} href={`#${section.id}`} className="block py-1 text-sm text-slate-600">
                {i + 1}. {section.title}
              </a>
            ))}
          </div>
        </details>

        <article className="min-w-0 divide-y divide-slate-100 text-sm leading-7 text-slate-700">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 py-6 first:pt-0">
              <h2 className="flex items-baseline gap-3 text-lg font-bold text-slate-900">
                <span className="font-mono text-sm font-semibold text-emerald-600/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              <div className="mt-2 space-y-3">{section.content}</div>
            </section>
          ))}
        </article>
      </div>

      {footer}
    </main>
  );
}
