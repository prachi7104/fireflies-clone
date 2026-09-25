import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings" };

// The chosen section is read from the URL, which needs a Suspense boundary in the App Router.
export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
