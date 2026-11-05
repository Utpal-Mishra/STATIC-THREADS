import Link from "next/link";
import { MobileDock } from "@/components/MobileDock";
import { PersonalWardrobe } from "@/components/PersonalWardrobe";
export default function WardrobePage() {
  return <main className="page-shell"><header className="site-header"><Link className="wordmark" href="/"><span>ST</span>Static Threads</Link><nav aria-label="Personal wardrobe navigation"><Link href="/#wardrobe">Demo wardrobe</Link><Link href="/outfits/">My outfits</Link><Link href="/account/">Account</Link></nav></header><PersonalWardrobe /><MobileDock accountPage /></main>;
}
