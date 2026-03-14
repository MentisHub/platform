interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header
      className="h-12 flex items-center gap-3 px-5 border-b border-border-subtle shrink-0"
      style={{ background: "var(--surface-0)" }}
    >
      <h1
        className="font-display font-bold text-[15px] tracking-[0.01em] text-text-primary mr-auto"
      >
        {title}
      </h1>
      {children}
    </header>
  );
}
