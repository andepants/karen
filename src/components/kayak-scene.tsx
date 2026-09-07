const COLORS: Record<string, string> = {
  H: "oklch(0.62 0.12 32)",
  D: "oklch(0.48 0.11 32)",
  L: "oklch(0.74 0.09 38)",
  S: "oklch(0.86 0.05 55)",
  K: "oklch(0.78 0.05 50)",
  M: "oklch(0.28 0.04 55)",
  W: "oklch(0.42 0.1 25)",
  G: "oklch(0.45 0.1 145)",
  R: "oklch(0.78 0.06 12)",
  N: "oklch(0.34 0.04 250)",
};

const KAYAK = [
  "......MMMM..............WWWWWWWW......",
  "......MMMM...............WWWWWW.......",
  "......SSSS...............WSSSSW.......",
  "......SSKK...............WSSKKW.......",
  ".....GGGGGG..............RRRRRR.......",
  ".....GGGGGG..............RRRRRR.......",
  ".....GGNNG................RNNR........",
  "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
  "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
  "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
];

function PixelSprite({
  rows,
  className,
}: {
  rows: string[];
  className?: string;
}) {
  const width = rows[0]?.length ?? 0;
  const height = rows.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        Array.from(row, (cell, x) => {
          const fill = COLORS[cell];
          if (!fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />
          );
        }),
      )}
    </svg>
  );
}

function Paddle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 5 16"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="0" width="1" height="12" fill="oklch(0.48 0.06 55)" />
      <rect x="1" y="11" width="3" height="4" fill="oklch(0.86 0.04 95)" />
      <rect x="0" y="12" width="5" height="2" fill="oklch(0.92 0.03 95)" />
    </svg>
  );
}

export function KayakScene() {
  return (
    <div
      className="kayak-pond relative mt-10 h-32 w-full max-w-3xl self-stretch overflow-hidden rounded-[1.75rem] ring-1 ring-border/80 sm:h-36"
      aria-hidden="true"
    >
      <div className="kayak-water pointer-events-none absolute inset-0" />
      <div className="kayak-glint pointer-events-none absolute inset-x-0 top-8 h-10" />

      <div className="kayak-cruise absolute top-8">
        <div className="kayak-bob relative h-16 w-44">
          <div className="kayak-paddle kayak-paddle-aft absolute top-0 left-7 origin-[6px_28px]">
            <Paddle className="h-12 w-[15px]" />
          </div>
          <div className="kayak-paddle kayak-paddle-bow absolute top-0 right-8 origin-[6px_28px]">
            <Paddle className="h-12 w-[15px]" />
          </div>
          <PixelSprite
            rows={KAYAK}
            className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
          />
        </div>
      </div>
    </div>
  );
}
