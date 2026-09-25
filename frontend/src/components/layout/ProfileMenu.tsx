"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useMe } from "@/lib/queries";

export function ProfileMenu() {
  const { data: me } = useMe();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label="Account menu"
      >
        {me ? <Avatar id={me.id} name={me.name} /> : <span className="block size-8 rounded-full bg-gray-100" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-gray-900">{me?.name ?? "Loading…"}</p>
          <p className="truncate text-xs text-gray-500">{me?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User className="size-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled title="Authentication is mocked in this demo">
          <LogOut className="size-4" /> Sign out
          <span className="ml-auto text-[10px] text-gray-400">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
