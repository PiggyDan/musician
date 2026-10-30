import { getScore, SCORES } from "@/content/sheet-music/catalog";
import { scoreMusicXml } from "@/lib/sheet-music/library";

export function generateStaticParams() {
  return SCORES.map((score) => ({ id: score.id }));
}

/** Download of a score as MusicXML (prerendered for every catalog entry). */
export async function GET(_request: Request, { params }: RouteContext<"/sheet-music/[id]/musicxml">) {
  const { id } = await params;
  const score = getScore(id);
  if (!score) return new Response("Not found", { status: 404 });
  return new Response(scoreMusicXml(score), {
    headers: {
      "Content-Type": "application/vnd.recordare.musicxml+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${score.id}.musicxml"`,
    },
  });
}
