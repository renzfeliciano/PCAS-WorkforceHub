type SkeletonProps = Readonly<{
  width?: string | number;
  height?: string | number;
  className?: string;
}>;

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <span
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{ width, height }}
    />
  );
}
