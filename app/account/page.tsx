import Link from "next/link";
import { AccountPanel } from "@/components/AccountPanel";

export default function AccountPage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Static Threads home">
          <span>ST</span>
          Static Threads
        </Link>
        <nav aria-label="Account navigation">
          <Link href="/">Back to wardrobe</Link>
        </nav>
      </header>
      <AccountPanel />
    </main>
  );
}
