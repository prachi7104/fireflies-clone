import { Sparkles } from "lucide-react";
import Link from "next/link";

/** Original mark for this clone; deliberately not the Fireflies.ai logo. */
export function Logo() {
  return (
    <Link href="/meetings" className="flex items-center gap-2.5 px-2" aria-label="Fireflies Clone home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 shadow-card">
        <Sparkles className="size-4 text-white" />
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-gray-900">
        fireflies<span className="text-brand-500">.clone</span>
      </span>
    </Link>
  );
}
