import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { getPianoLesson, PIANO_LESSONS } from "@/content/lessons/piano";
import en from "@/i18n/dictionaries/en";

// Fully static route: unknown ids are resolved before any bytes are sent, so
// notFound() produces a real 404 status instead of a streamed 200.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return PIANO_LESSONS.map((lesson) => ({ id: lesson.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/piano/lesson/[id]">): Promise<Metadata> {
  const { id } = await params;
  const lesson = getPianoLesson(id);
  // Metadata is prerendered once, so it uses the default (English) title.
  return { title: lesson ? en.lessons[lesson.i18nKey].title : "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/learn/piano/lesson/[id]">) {
  const { id } = await params;
  if (!getPianoLesson(id)) notFound();
  return <LessonPlayer slug={id} />;
}
