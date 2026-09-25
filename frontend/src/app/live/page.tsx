import { Bot } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Live Notetaker" };

export default function LivePage() {
  return (
    <ComingSoon
      icon={Bot}
      title="Live notetaker"
      description="A bot that joins your calls, records them and transcribes them in real time. For now, upload or paste a transcript instead."
    />
  );
}
