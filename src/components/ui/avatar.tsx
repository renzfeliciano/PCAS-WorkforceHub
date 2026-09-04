export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type AvatarProps = Readonly<{
  name: string;
  tone?: "coral" | "blue";
}>;

export function Avatar({ name, tone = "blue" }: AvatarProps) {
  return <span className={`avatar ${tone}`}>{getInitials(name)}</span>;
}
