import { Zap } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Upgrade" };

export default function UpgradePage() {
  return (
    <ComingSoon
      icon={Zap}
      title="Plans and billing"
      description="Upgrade for unlimited transcription, storage and AI credits. Billing isn't part of this demo workspace."
    />
  );
}
