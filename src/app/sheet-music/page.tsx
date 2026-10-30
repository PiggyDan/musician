import type { Metadata } from "next";
import { SheetMusicLibrary } from "@/components/sheet-music/sheet-music-library";

export const metadata: Metadata = {
  title: "Free Sheet Music",
  description: "Public-domain and original sheet music for piano, guitar, ukulele, harmonica, violin and cello.",
};

export default function SheetMusicPage() {
  return <SheetMusicLibrary />;
}
