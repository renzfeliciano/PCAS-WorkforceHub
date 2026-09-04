export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const slug = status.toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={`status ${slug}`}>
      <i />
      {status}
    </span>
  );
}
