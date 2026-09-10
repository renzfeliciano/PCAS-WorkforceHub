import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="empty">
      <FileQuestion size={48} />
      <h1>Page not found</h1>
      <p className="muted">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className="button primary" style={{ marginTop: 20 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
