"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { CreateMeetingProvider } from "@/components/meetings/CreateMeetingContext";
import { TooltipProvider } from "@/components/ui/Tooltip";

import { IconRail } from "./IconRail";
import { Topbar } from "./Topbar";

/**
 * Fireflies-style frame: icon rail on the left, a top bar, and a scrolling content area.
 * A meeting page has its own breadcrumb bar instead of the global top bar, as in Fireflies.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMeetingPage = /^\/meetings\/[^/]+$/.test(pathname);

  return (
    <TooltipProvider delayDuration={200}>
      <CreateMeetingProvider>
        <div className="flex h-dvh overflow-hidden bg-canvas">
          <IconRail />
          <div className="flex min-w-0 flex-1 flex-col">
            {isMeetingPage ? null : (
              // The top bar reads the URL's search params, which needs a Suspense boundary in the App Router.
              <Suspense fallback={<div className="h-14 shrink-0 border-b border-line bg-surface" />}>
                <Topbar />
              </Suspense>
            )}
            <main className="min-h-0 flex-1 overflow-y-auto bg-canvas">{children}</main>
          </div>
        </div>
      </CreateMeetingProvider>
    </TooltipProvider>
  );
}
