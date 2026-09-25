"use client";

import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";
import type { Health } from "@/lib/types";

// Temporary deployment check: proves the frontend can reach the API across origins.
export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="p-10 font-sans">
      <h1 className="text-2xl font-semibold">Fireflies Clone: deployment check</h1>
      {error && <p className="mt-4 text-red-600">API error: {error}</p>}
      {health && <pre className="mt-4 rounded bg-gray-100 p-4 text-sm">{JSON.stringify(health, null, 2)}</pre>}
      {!health && !error && <p className="mt-4">Checking API…</p>}
    </main>
  );
}
