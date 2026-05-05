"use client";

import type { ReactNode } from "react";

const DOODLE_SVG = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
  <g fill='none' stroke='#1f2c34' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='0.9'>
    <circle cx='80' cy='90' r='14'/>
    <path d='M180 60 q22 -18 44 0 q-22 18 -44 0z'/>
    <path d='M310 75 l-8 12 8 12 8 -12z'/>
    <path d='M60 200 q12 -16 28 -8 q12 6 -2 18 q-14 12 -26 -10z'/>
    <circle cx='200' cy='180' r='10'/>
    <circle cx='220' cy='180' r='4'/>
    <path d='M340 180 l10 18 -22 -2z'/>
    <path d='M40 320 l8 -14 16 4 -6 14z'/>
    <path d='M150 300 q14 -10 32 0 q-2 12 -14 14 q-14 2 -18 -14z'/>
    <path d='M260 320 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0'/>
    <path d='M360 300 l-2 18 18 2 2 -18z'/>
    <path d='M100 380 q10 -8 22 0'/>
    <path d='M200 380 q12 -8 26 0 q-12 8 -26 0z'/>
    <path d='M320 380 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0'/>
    <path d='M30 100 l4 12 12 -2z'/>
    <path d='M390 50 q-14 12 0 24 q14 -12 0 -24z'/>
    <path d='M260 40 l-8 4 0 8 8 4 8 -4 0 -8z'/>
    <path d='M120 240 l-3 9 -9 3 9 3 3 9 3 -9 9 -3 -9 -3z'/>
    <path d='M380 240 q-10 -10 -20 0 q10 10 20 0z'/>
    <path d='M70 140 l4 8 8 -4'/>
    <path d='M200 110 l-6 -10 12 0z'/>
  </g>
</svg>
`);

interface DoodleBackgroundProps {
  children: ReactNode;
}

export function DoodleBackground({ children }: DoodleBackgroundProps) {
  return (
    <div
      className="relative h-full w-full"
      style={{
        backgroundColor: "#0b141a",
        backgroundImage: `url("data:image/svg+xml;utf8,${DOODLE_SVG}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "420px 420px",
      }}
    >
      {children}
    </div>
  );
}
