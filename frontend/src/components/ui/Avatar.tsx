import clsx from "clsx";

import { initials, participantColor } from "@/lib/colors";

type Size = "xs" | "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

export function Avatar({ id, name, size = "md", className }: { id: number; name: string; size?: Size; className?: string }) {
  return (
    <span
      title={name}
      aria-label={name}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: participantColor(id) }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { id: number; name: string }[];
  max?: number;
  size?: Size;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-1.5" aria-label={people.map((person) => person.name).join(", ")}>
      {shown.map((person) => (
        <Avatar key={person.id} id={person.id} name={person.name} size={size} />
      ))}
      {rest > 0 ? (
        <span
          className={clsx(
            "inline-flex items-center justify-center rounded-full bg-gray-100 font-medium text-gray-600 ring-2 ring-white",
            SIZES[size],
          )}
          title={people.slice(max).map((person) => person.name).join(", ")}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
