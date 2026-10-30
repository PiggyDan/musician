import type { Metadata } from "next";
import { PianoAcademy } from "@/components/learn/piano-academy";

export const metadata: Metadata = { title: "Piano Foundations" };

export default function PianoAcademyPage() {
  return <PianoAcademy />;
}
