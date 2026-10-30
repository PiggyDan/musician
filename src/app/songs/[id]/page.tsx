import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongDetail } from "@/components/songs/song-detail";
import { loadCatalog, songIdFromSlug, songSlug } from "@/lib/catalog/service";

// Fully static: unknown ids resolve before streaming, so notFound() returns a real 404.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  return (await loadCatalog()).map((song) => ({ id: songSlug(song.id) }));
}

async function findSong(slug: string) {
  const id = songIdFromSlug(slug);
  return (await loadCatalog()).find((song) => song.id === id);
}

export async function generateMetadata({ params }: PageProps<"/songs/[id]">): Promise<Metadata> {
  const song = await findSong((await params).id);
  return { title: song ? `${song.metadata.title.en} — ${song.metadata.artist.en}` : "Song" };
}

export default async function SongPage({ params }: PageProps<"/songs/[id]">) {
  const song = await findSong((await params).id);
  if (!song) notFound();
  return <SongDetail song={song} />;
}
