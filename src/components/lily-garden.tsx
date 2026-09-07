"use client";

import { motion } from "motion/react";

type LilyProps = {
  className?: string;
  delay?: number;
};

function LilySvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M60 158 C58 110 52 72 60 28"
        stroke="currentColor"
        strokeWidth="3"
        className="text-[oklch(0.42_0.09_145)]"
      />
      <path
        d="M60 92 C42 86 28 70 22 58"
        stroke="currentColor"
        strokeWidth="2"
        className="text-[oklch(0.42_0.09_145)]"
      />
      <path
        d="M26 74 C18 78 12 70 20 62 C32 58 40 68 26 74Z"
        className="fill-[oklch(0.55_0.12_145)]"
      />
      <path
        d="M60 48 C48 18 28 22 32 48 C38 68 52 62 60 48Z"
        className="fill-[oklch(0.97_0.02_95)]"
        stroke="oklch(0.86 0.06 12)"
        strokeWidth="1"
      />
      <path
        d="M60 48 C72 18 92 22 88 48 C82 68 68 62 60 48Z"
        className="fill-[oklch(0.94_0.04_12)]"
        stroke="oklch(0.82 0.08 12)"
        strokeWidth="1"
      />
      <path
        d="M60 50 C60 22 78 16 82 42 C84 58 70 62 60 50Z"
        className="fill-[oklch(0.99_0.015_95)]"
        stroke="oklch(0.88 0.05 12)"
        strokeWidth="1"
      />
      <path
        d="M60 50 C60 24 42 16 38 42 C36 58 50 62 60 50Z"
        className="fill-[oklch(0.96_0.035_8)]"
        stroke="oklch(0.84 0.07 12)"
        strokeWidth="1"
      />
      <circle cx="60" cy="52" r="4" className="fill-[oklch(0.78_0.14_85)]" />
    </svg>
  );
}

export function Lily({ className, delay = 0 }: LilyProps) {
  return (
    <motion.div
      className={className}
      initial={{ rotate: -2, y: 8, opacity: 0 }}
      animate={{ rotate: 0, y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      whileHover={{
        rotate: [0, -6, 5, -2, 0],
        y: -6,
        transition: { duration: 1.1, ease: "easeInOut" },
      }}
    >
      <LilySvg className="h-full w-full drop-shadow-sm" />
    </motion.div>
  );
}

export function LilyGarden() {
  const lilies = [
    { className: "absolute left-[6%] bottom-[4%] h-40 w-28 md:h-56 md:w-40", delay: 0.1 },
    { className: "absolute left-[18%] bottom-[0%] h-28 w-20 md:h-40 md:w-28", delay: 0.25 },
    { className: "absolute right-[10%] bottom-[6%] h-44 w-32 md:h-60 md:w-44", delay: 0.15 },
    { className: "absolute right-[24%] bottom-[-2%] h-24 w-16 md:h-36 md:w-24", delay: 0.35 },
    { className: "absolute left-[46%] bottom-[-8%] h-32 w-24 hidden sm:block", delay: 0.2 },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 md:h-80">
      {lilies.map((lily) => (
        <div key={lily.className} className="pointer-events-auto">
          <Lily className={lily.className} delay={lily.delay} />
        </div>
      ))}
    </div>
  );
}

export function LilyMark({ className }: { className?: string }) {
  return <LilySvg className={className} />;
}
