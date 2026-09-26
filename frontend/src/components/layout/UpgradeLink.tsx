import Link from "next/link";

/** Fireflies' green "Upgrade" button; it opens the plans placeholder page. */
export function UpgradeLink() {
  return (
    <Link
      href="/upgrade"
      className="hidden h-8 items-center rounded-md border border-emerald-600/30 px-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 md:inline-flex dark:text-emerald-400 dark:hover:bg-emerald-950"
    >
      Upgrade
    </Link>
  );
}
