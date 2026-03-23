import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Icon size={32} style={{ color: "var(--border-active)" }} strokeWidth={1} />
      <div className="text-center">
        <p className="font-display font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        {description && (
          <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
