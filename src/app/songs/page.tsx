import type { Metadata } from "next";
import { SongsLibrary } from "@/components/songs/songs-library";
import { loadCatalog } from "@/lib/catalog/service";

export const metadata: Metadata = {
  title: "Songs",
  description: "Discover worship, gospel, pop, rock, K-pop, classical and Mongolian songs — and practise the ones you can play on MusicPath.",
};

export default async function SongsPage() {
  const songs = await loadCatalog();
  return <SongsLibrary songs={songs} />;
}
