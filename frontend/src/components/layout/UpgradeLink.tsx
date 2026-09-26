import Link from "next/link";

/** Fireflies' green "Upgrade" button; it opens the plans placeholder page. */
export function UpgradeLink() {
  return (
    <Link
      href="/upgrade"
      className="hidden h-8 items-center rounded bg-gradient-to-b from-[#ecfdf3] to-[#d1fadf] px-2 text-sm font-medium text-[#107569] shadow-[0_2px_4px_rgba(0,0,0,0.15)] ring-1 ring-[#d1fae8] hover:to-[#a6f4c5] md:inline-flex dark:from-[#14281f] dark:to-[#14281f] dark:text-emerald-400 dark:shadow-none dark:ring-[#1f4633] dark:hover:to-[#1a3528]"
    >
      Upgrade
    </Link>
  );
}
