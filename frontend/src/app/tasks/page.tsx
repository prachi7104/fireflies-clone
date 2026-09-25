import { ListChecks } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <ComingSoon icon={ListChecks} title="Tasks" description="All your meeting tasks in one place." />
  );
}
