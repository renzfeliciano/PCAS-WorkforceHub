type StatCardProps = Readonly<{
  label: string;
  value: number | string;
  hint?: string;
  dark?: boolean;
}>;

export function StatCard({ label, value, hint, dark }: StatCardProps) {
  return (
    <div className={`metric ${dark ? "dark" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
