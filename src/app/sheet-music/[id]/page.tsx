import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoreViewer } from "@/components/sheet-music/score-viewer";
import { COMPOSERS, getScore, SCORES } from "@/content/sheet-music/catalog";

// Fully static: unknown ids resolve before streaming, so notFound() returns a real 404.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return SCORES.map((score) => ({ id: score.id }));
}

export async function generateMetadata({ params }: PageProps<"/sheet-music/[id]">): Promise<Metadata> {
  const { id } = await params;
  const score = getScore(id);
  if (!score) return { title: "Sheet music" };
  return {
    title: `${score.title.en} — ${COMPOSERS[score.composer].name.en}`,
    description: `Free ${score.instrument} sheet music: ${score.source.en}`,
  };
}

export default async function ScorePage({ params }: PageProps<"/sheet-music/[id]">) {
  const { id } = await params;
  if (!getScore(id)) notFound();
  return <ScoreViewer id={id} />;
}
