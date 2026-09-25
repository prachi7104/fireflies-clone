"use client";

import { Bot, Globe, Palette, Puzzle } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMe } from "@/lib/queries";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-gray-200 py-6 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">{children}</div>
    </section>
  );
}

function PlaceholderRow({ icon: Icon, label, hint }: { icon: typeof Bot; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="size-5 text-gray-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Coming soon</span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: me, isPending } = useMe();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your profile and workspace preferences.</p>

      <Section title="Profile" description="Authentication is mocked, so the demo user is always signed in.">
        {isPending || !me ? (
          <Skeleton className="h-12 w-72" />
        ) : (
          <div className="flex items-center gap-4">
            <Avatar id={me.id} name={me.name} size="lg" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{me.name}</p>
              <p className="text-sm text-gray-500">{me.email}</p>
            </div>
          </div>
        )}
      </Section>

      <Section title="Preferences" description="Language and appearance for your workspace.">
        <PlaceholderRow icon={Globe} label="Transcript language" hint="English" />
        <PlaceholderRow icon={Palette} label="Theme" hint="Light" />
      </Section>

      <Section title="Notetaker and integrations" description="Recording bot and connected apps.">
        <PlaceholderRow icon={Bot} label="Auto-join meetings" hint="Let the notetaker join calendar events" />
        <PlaceholderRow icon={Puzzle} label="Connected apps" hint="Zoom, Google Meet, calendars and CRMs" />
      </Section>
    </div>
  );
}
