import { Suspense, type ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { UploadButton } from "./UploadButton";

/** Fireflies-style frame: fixed sidebar on the left, top bar, and a scrolling content area. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      {/* Both read the URL's search params, which needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<div className="hidden w-60 shrink-0 border-r border-gray-200 md:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-16 shrink-0 border-b border-gray-200" />}>
          <Topbar actions={<UploadButton />} />
        </Suspense>
        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-25">{children}</main>
      </div>
    </div>
  );
}
