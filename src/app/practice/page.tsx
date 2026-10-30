import type { Metadata } from "next";
import { PianoStudio } from "@/components/studio/piano-studio";

export const metadata: Metadata = { title: "Piano Studio" };

export default function PracticePage() {
  return <PianoStudio />;
}
