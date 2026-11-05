import Link from "next/link";
import { MobileDock } from "@/components/MobileDock";
import { OutfitLibrary } from "@/components/OutfitLibrary";

export default function OutfitsPage() {
  return <main className="page-shell">
    <header className="site-header">
      <Link className="wordmark" href="/"><span>ST</span>Static Threads</Link>
      <nav aria-label="Outfit library navigation"><Link href="/wardrobe/">Personal wardrobe</Link><Link href="/account/">Account</Link></nav>
    </header>
    <OutfitLibrary />
    <MobileDock accountPage />
  </main>;
}
