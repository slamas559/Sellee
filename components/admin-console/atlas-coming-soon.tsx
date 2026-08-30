export function AtlasComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">{title}</h1>
      <div className="atlas-panel mt-6 px-5 py-8 text-center">
        <span className="atlas-badge" data-tone="warn">
          Next build phase
        </span>
        <p className="mx-auto mt-3 max-w-sm text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
          {note}
        </p>
      </div>
    </div>
  );
}
