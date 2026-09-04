import type { ReactNode } from "react";

type EmptyStateProps = Readonly<{
  icon?: ReactNode;
  title: string;
  description?: string;
}>;

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="empty">
      {icon}
      <h1>{title}</h1>
      {description && <p className="muted">{description}</p>}
    </div>
  );
}
