import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/** Placeholder for product areas the brief marks as out of scope (bot, integrations, team, ...). */
export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-50 ring-8 ring-brand-25">
        <Icon className="size-7 text-brand-600" />
      </div>
      <span className="mb-3 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Coming soon</span>
      <h1 className="font-display text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
      <Link
        href="/meetings"
        className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
      >
        Back to meetings
      </Link>
    </div>
  );
}
