import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-100">
        <SearchX className="size-6 text-gray-500" />
      </div>
      <h1 className="font-display text-xl font-semibold text-gray-900">We couldn&apos;t find that page</h1>
      <p className="mt-1 text-sm text-gray-500">It may have been deleted, or the link is wrong.</p>
      <Link
        href="/meetings"
        className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go to meetings
      </Link>
    </div>
  );
}
