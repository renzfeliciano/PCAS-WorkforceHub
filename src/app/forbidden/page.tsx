import Link from "next/link";
import { Lock } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="empty">
      <Lock size={48} />
      <h1>Access denied</h1>
      <p className="muted">
        Your role doesn&apos;t have permission to view this page. If you think this is a mistake,
        contact an Admin or HR.
      </p>
      <Link href="/" className="button primary" style={{ marginTop: 20 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
