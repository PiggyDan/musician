import type { Metadata } from "next";
import { LearnerProfile } from "@/components/profile/learner-profile";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <LearnerProfile />;
}
