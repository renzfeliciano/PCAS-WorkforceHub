import type { LucideIcon } from "lucide-react";

type StatCardProps = Readonly<{
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  dark?: boolean;
}>;

export function StatCard({ icon: Icon, label, value, hint, dark }: StatCardProps) {
  return (
    <div className={`metric ${dark ? "dark" : ""}`}>
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
