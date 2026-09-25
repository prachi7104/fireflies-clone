import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={ChartColumn}
      title="Conversation analytics"
      description="Talk-time, sentiment and topic trends across your team's meetings."
    />
  );
}
