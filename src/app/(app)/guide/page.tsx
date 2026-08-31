import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import GuideClient from "./guide-client";

export const metadata: Metadata = {
  title: "User Guide & Documentation · Kairali PMS",
  description: "Comprehensive workflow guide and user manual for Kairali PMS.",
};

export default async function GuidePage() {
  const user = await requireUser();
  return <GuideClient currentUserRole={user.role} />;
}
