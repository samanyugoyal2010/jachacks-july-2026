export function JacBadge() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40">
      <a
        href="https://jaseci.org"
        target="_blank"
        rel="noreferrer"
        title="Every decision runs in Jac — core.jac + agents.jac"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-[10px] tracking-wide text-muted-foreground uppercase shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-150 ease-out hover:text-foreground"
      >
        <span className="size-1.5 rounded-full bg-primary" />
        backend: 100% Jac
      </a>
    </div>
  );
}
