"use client";

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";

export function NotificationsButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <div className="flex flex-col items-center px-4 py-6 text-center">
          <BellOff className="mb-2 size-5 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">You&apos;re all caught up</p>
          <p className="mt-0.5 text-xs text-gray-500">Meeting and mention alerts are coming soon.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
