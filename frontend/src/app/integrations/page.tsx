import { Puzzle } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <ComingSoon
      icon={Puzzle}
      title="Integrations"
      description="Connect Zoom, Google Meet, Microsoft Teams, your calendar and your CRM so meetings are captured and shared automatically."
    />
  );
}
