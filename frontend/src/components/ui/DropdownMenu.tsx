"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, align = "end", ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={clsx(
          "z-50 max-h-80 min-w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-popover",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none " +
  "data-[highlighted]:bg-gray-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50";

export function DropdownMenuItem({ className, danger, ...props }: ComponentProps<typeof Menu.Item> & { danger?: boolean }) {
  return <Menu.Item className={clsx(itemClass, danger ? "text-red-600" : "text-gray-700", className)} {...props} />;
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={clsx(itemClass, "text-gray-700", className)} {...props}>
      <span className="flex size-4 items-center justify-center rounded border border-gray-300 data-[state=checked]:border-brand-500">
        <Menu.ItemIndicator>
          <Check className="size-3 text-brand-600" strokeWidth={3} />
        </Menu.ItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={clsx("px-2.5 py-1.5 text-xs font-medium text-gray-500", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={clsx("my-1 h-px bg-gray-200", className)} {...props} />;
}
