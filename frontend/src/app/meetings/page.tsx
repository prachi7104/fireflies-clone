import { Suspense } from "react";

import { LibrarySkeleton, MeetingsLibrary } from "@/components/meetings/MeetingsLibrary";

// The library reads its filters from the URL, which needs a Suspense boundary in the App Router.
export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full bg-surface">
          <LibrarySkeleton />
        </div>
      }
    >
      <MeetingsLibrary />
    </Suspense>
  );
}
