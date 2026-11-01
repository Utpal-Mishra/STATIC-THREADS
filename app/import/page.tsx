import Link from "next/link";
import { OutfitPhotoImport } from "@/components/OutfitPhotoImport";
export default function ImportPage() {
  return <main className="page-shell"><header className="site-header"><Link className="wordmark" href="/"><span>ST</span>Static Threads</Link><Link href="/#wardrobe">Back to wardrobe</Link></header><OutfitPhotoImport /></main>;
}
