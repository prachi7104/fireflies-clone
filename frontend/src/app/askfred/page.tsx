import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "AskFred" };

export default function AskFredPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AskFred"
      description="Ask questions across all your meetings and get answers with links to the exact moments they were discussed."
    />
  );
}
