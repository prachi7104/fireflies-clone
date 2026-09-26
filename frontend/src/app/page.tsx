import type { Metadata } from "next";

import { HomeView } from "@/components/home/HomeView";

export const metadata: Metadata = { title: { absolute: "Home - Fireflies.ai" } };

export default function HomePage() {
  return <HomeView />;
}
