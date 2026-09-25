"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
        <TriangleAlert className="size-6 text-red-600" />
      </div>
      <h1 className="font-display text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-gray-500">{error.message || "An unexpected error occurred."}</p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
