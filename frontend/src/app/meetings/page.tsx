import { Suspense } from "react";

import { LibrarySkeleton, MeetingsLibrary } from "@/components/meetings/MeetingsLibrary";

// The library reads its filters from the URL, which needs a Suspense boundary in the App Router.
export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <LibrarySkeleton />
        </div>
      }
    >
      <MeetingsLibrary />
    </Suspense>
  );
}
