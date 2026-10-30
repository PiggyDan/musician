import { notFound } from "next/navigation";
import { InstrumentAcademy } from "@/components/learn/instrument-academy";
import { INSTRUMENT_LESSONS } from "@/content/lessons/instruments";

// Piano has its own static route (/learn/piano); this serves the other instruments.
export const ensureStatic = "navigation";

type Other = keyof typeof INSTRUMENT_LESSONS;
const isOther = (id: string): id is Other => id in INSTRUMENT_LESSONS;

export function generateStaticParams() {
  return Object.keys(INSTRUMENT_LESSONS).map((instrument) => ({ instrument }));
}

export default async function InstrumentPage({ params }: PageProps<"/learn/[instrument]">) {
  const { instrument } = await params;
  if (!isOther(instrument)) notFound();
  return <InstrumentAcademy instrument={instrument} />;
}
