import type { LucideIcon } from "lucide-react";

type StatCardProps = Readonly<{
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  dark?: boolean;
  /** Calls out a metric that needs attention, e.g. contracts ending soon. */
  warning?: boolean;
}>;

export function StatCard({ icon: Icon, label, value, hint, dark, warning }: StatCardProps) {
  return (
    <div className={`metric ${dark ? "dark" : ""} ${warning ? "warning" : ""}`}>
      <span className="metric-icon">
        <Icon size={16} />
      </span>
      <span>{label}</span>
      <div className="metric-value">
        <strong>{value}</strong>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
