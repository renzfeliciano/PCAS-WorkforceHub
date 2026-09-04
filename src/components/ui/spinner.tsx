import { Loader2 } from "lucide-react";

export function Spinner({ size = 14 }: Readonly<{ size?: number }>) {
  return <Loader2 size={size} className="spinner" aria-hidden="true" />;
}
