"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import "./globals.css";

/**
 * Only catches errors thrown by the root layout itself (ThemeProvider,
 * global-loader, etc.) — everything else is caught by error.tsx. Next.js
 * requires this file to render its own <html>/<body> since it fully
 * replaces the root layout when it fires.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="empty">
          <AlertOctagon size={48} />
          <h1>Something went wrong</h1>
          <p className="muted">
            The app hit an unexpected error while loading. Try again, or reload the page.
          </p>
          {/* Deliberately a button, not a Link: the root layout itself just failed, so this
              boundary avoids assuming client-side routing is in a safe state. */}
          <button
            type="button"
            className="button primary"
            style={{ marginTop: 20 }}
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
