import type { Metadata } from "next";
import { LearnDashboard } from "@/components/learn/learn-dashboard";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return <LearnDashboard />;
}
