import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { getLesson, INSTRUMENT_LESSONS } from "@/content/lessons/instruments";

export const ensureStatic = "navigation";

type Other = keyof typeof INSTRUMENT_LESSONS;
const isOther = (id: string): id is Other => id in INSTRUMENT_LESSONS;

export function generateStaticParams() {
  return Object.entries(INSTRUMENT_LESSONS).flatMap(([instrument, lessons]) => lessons.map((l) => ({ instrument, id: l.slug })));
}

export default async function InstrumentLessonPage({ params }: PageProps<"/learn/[instrument]/lesson/[id]">) {
  const { instrument, id } = await params;
  if (!isOther(instrument) || !getLesson(instrument, id)) notFound();
  return <LessonPlayer instrument={instrument} slug={id} />;
}
