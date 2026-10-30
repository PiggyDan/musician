import { AiTeacherTeaser } from "@/components/home/ai-teacher-teaser";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { InstrumentShowcase } from "@/components/home/instrument-showcase";
import { PianoPreview } from "@/components/home/piano-preview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PianoPreview />
      <InstrumentShowcase />
      <AiTeacherTeaser />
      <FinalCta />
    </>
  );
}
