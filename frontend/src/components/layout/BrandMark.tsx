import Link from "next/link";
import { useId } from "react";

// Colour stops of the Fireflies "F" mark: a pink-to-blue face, and a dark overlay for the folded corners.
const FACE = [
  ["0", "#E82A73"],
  ["0.113", "#DE2D7A"],
  ["0.3", "#C5388F"],
  ["0.54", "#9B4AB0"],
  ["0.818", "#6262DE"],
  ["0.994", "#3B73FF"],
] as const;
const FACE_BRIGHT = [
  ["0", "#FF3C82"],
  ["0.103", "#F53E88"],
  ["0.274", "#DC4598"],
  ["0.492", "#B251B2"],
  ["0.745", "#7961D7"],
  ["0.994", "#3B73FF"],
] as const;
const SHADE = [
  ["0", "#E82A73"],
  ["0.114", "#DE286E"],
  ["0.303", "#C52361"],
  ["0.544", "#9B1A4D"],
  ["0.825", "#620F30"],
  ["0.994", "#3D081E"],
] as const;

// [gradient key, x1, x2, y1, y2, stops] for each shape below, in order.
const GRADIENTS = [
  ["a", 16.868, -10.77, 18.512, -10.526, FACE],
  ["b", 16.964, -10.674, 18.423, -10.616, FACE_BRIGHT],
  ["c", 21.555, 12.19, 14.055, -19.882, FACE],
  ["d", 12.338, -21.187, 22.824, 12.611, FACE],
  ["e", -2.429, 6.961, -6.152, 15.365, SHADE],
  ["f", 5.359, 14.749, 1.727, 23.245, SHADE],
  ["g", -1.397, 19.87, 1.383, 15.511, SHADE],
  ["h", -464.769, -461.125, 461.172, 489.944, SHADE],
] as const;

const SHAPES: { gradient: string; d: string; shade?: boolean }[] = [
  { gradient: "a", d: "M7.36 2H.787v6.527H7.36z" },
  { gradient: "b", d: "M15.149 9.88H8.574v6.526h6.575z" },
  { gradient: "c", d: "M15.149 2H8.574v6.527h12.212v-.933a5.57 5.57 0 0 0-1.651-3.956A5.66 5.66 0 0 0 15.15 2z" },
  { gradient: "d", d: "M.786 9.88v6.526c0 1.484.594 2.907 1.65 3.956A5.66 5.66 0 0 0 6.423 22h.939V9.88z" },
  { gradient: "e", d: "M.786 2 7.36 8.527H.786z", shade: true },
  { gradient: "f", d: "m8.574 9.88 6.575 6.526H8.574z", shade: true },
  { gradient: "g", d: "M.786 16.406c0 1.484.594 2.907 1.65 3.956A5.66 5.66 0 0 0 6.423 22h.939V9.88z", shade: true },
  { gradient: "h", d: "M15.15 2c1.494 0 2.928.59 3.985 1.638a5.57 5.57 0 0 1 1.65 3.956v.933H8.576z", shade: true },
];

/** The Fireflies "F" logo mark as inline SVG. useId keeps gradient ids unique if it appears more than once. */
export function FirefliesMark({ size = 24 }: { size?: number }) {
  const prefix = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0.786 2 20 20" aria-hidden>
      <defs>
        {GRADIENTS.map(([key, x1, x2, y1, y2, stops]) => (
          <linearGradient key={key} id={`${prefix}${key}`} x1={x1} x2={x2} y1={y1} y2={y2} gradientUnits="userSpaceOnUse">
            {stops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        ))}
      </defs>
      {SHAPES.map((shape) => (
        <path key={shape.gradient} d={shape.d} fill={`url(#${prefix}${shape.gradient})`} opacity={shape.shade ? 0.18 : undefined} />
      ))}
    </svg>
  );
}

/** The logo at the top of the rail, linking Home. */
export function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Fireflies home"
      className="inline-flex rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <FirefliesMark size={26} />
    </Link>
  );
}
