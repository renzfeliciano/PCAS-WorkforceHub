"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ServerCrash } from "lucide-react";

export default function Error({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="empty">
      <ServerCrash size={48} />
      <h1>Something went wrong</h1>
      <p className="muted">
        An unexpected error occurred. You can try again, or head back to the dashboard.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
        <button type="button" className="button secondary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="button primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
