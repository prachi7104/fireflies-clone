import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "AI Skills" };

export default function SkillsPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AI Skills"
      description="Run custom AI prompts over a meeting, such as objection handling or a sales scorecard."
    />
  );
}
