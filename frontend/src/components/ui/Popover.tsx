"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import clsx from "clsx";
import type { ComponentProps } from "react";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

/** Floating panel (focus managed, Esc and outside-click close it). */
export function PopoverContent({ className, align = "start", ...props }: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={clsx("z-50 rounded-xl border border-line bg-surface shadow-popover focus:outline-none", className)}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
