import type { WAMediaItem } from "../types";

const MAR = "2026-03";
const APR = "2026-04";

function gradientThumb(seed: number): string {
  const hueA = (seed * 47) % 360;
  const hueB = (hueA + 60) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='hsl(${hueA},65%,55%)'/>
      <stop offset='100%' stop-color='hsl(${hueB},65%,35%)'/>
    </linearGradient></defs>
    <rect width='160' height='160' fill='url(#g)'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function chartThumb(seed: number): string {
  const path = Array.from({ length: 24 }, (_, i) => {
    const x = (i / 23) * 160;
    const y = 80 + Math.sin(i * 0.6 + seed) * 30 + Math.cos(i * 0.3 + seed) * 12;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
    <rect width='160' height='160' fill='#0e1a23'/>
    <path d='${path}' stroke='#3b82f6' stroke-width='1.4' fill='none'/>
    <line x1='0' y1='130' x2='160' y2='130' stroke='#1f2d3a' stroke-width='0.5'/>
    <text x='6' y='150' font-size='8' fill='#5a6b78' font-family='monospace'>2/29/26</text>
    <text x='80' y='150' font-size='8' fill='#5a6b78' font-family='monospace'>3/30/26</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function docThumb(seed: number): string {
  const lines = Array.from({ length: 10 }, (_, i) => {
    const w = 60 + ((seed * (i + 1)) % 70);
    return `<rect x='14' y='${20 + i * 12}' width='${w}' height='6' fill='#cfd6db' rx='1'/>`;
  }).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
    <rect width='160' height='160' fill='#ffffff'/>
    ${lines}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MOCK_MEDIA: WAMediaItem[] = [
  // April (Last week-ish)
  {
    id: "med-a-1",
    kind: "image",
    url: chartThumb(1),
    thumbnailUrl: chartThumb(1),
    conversationName: "Aamir Hussain SEO Admin",
    createdAt: `${APR}-30T12:00:00Z`,
  },
  {
    id: "med-a-2",
    kind: "image",
    url: chartThumb(2),
    thumbnailUrl: chartThumb(2),
    conversationName: "You",
    createdAt: `${APR}-29T12:00:00Z`,
  },
  {
    id: "med-a-3",
    kind: "image",
    url: chartThumb(3),
    thumbnailUrl: chartThumb(3),
    conversationName: "You",
    createdAt: `${APR}-29T11:00:00Z`,
  },
  {
    id: "med-a-4",
    kind: "image",
    url: chartThumb(4),
    thumbnailUrl: chartThumb(4),
    conversationName: "You",
    createdAt: `${APR}-28T12:00:00Z`,
  },
  {
    id: "med-a-5",
    kind: "image",
    url: chartThumb(5),
    thumbnailUrl: chartThumb(5),
    conversationName: "Kamal Accounting",
    createdAt: `${APR}-28T11:00:00Z`,
  },
  {
    id: "med-a-6",
    kind: "image",
    url: docThumb(6),
    thumbnailUrl: docThumb(6),
    conversationName: "Kamal Accounting",
    createdAt: `${APR}-27T12:00:00Z`,
  },
  {
    id: "med-a-7",
    kind: "image",
    url: gradientThumb(7),
    thumbnailUrl: gradientThumb(7),
    caption: "Team dinner in Mexico City",
    conversationName: "You",
    createdAt: `${APR}-27T11:00:00Z`,
  },

  // March
  {
    id: "med-m-1",
    kind: "image",
    url: docThumb(11),
    thumbnailUrl: docThumb(11),
    conversationName: "Aamir Hussain SEO Admin",
    createdAt: `${MAR}-28T12:00:00Z`,
  },
  {
    id: "med-m-2",
    kind: "image",
    url: docThumb(12),
    thumbnailUrl: docThumb(12),
    conversationName: "Aamir Hussain SEO Admin",
    createdAt: `${MAR}-26T12:00:00Z`,
  },
  {
    id: "med-m-3",
    kind: "image",
    url: docThumb(13),
    thumbnailUrl: docThumb(13),
    conversationName: "Aamir Hussain SEO Admin",
    createdAt: `${MAR}-24T12:00:00Z`,
  },
  {
    id: "med-m-4",
    kind: "video",
    url: gradientThumb(14),
    thumbnailUrl: gradientThumb(14),
    durationSec: 10,
    conversationName: "Rubit",
    createdAt: `${MAR}-22T12:00:00Z`,
  },
  {
    id: "med-m-5",
    kind: "image",
    url: gradientThumb(15),
    thumbnailUrl: gradientThumb(15),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-21T12:00:00Z`,
  },
  {
    id: "med-m-6",
    kind: "image",
    url: docThumb(16),
    thumbnailUrl: docThumb(16),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-19T12:00:00Z`,
  },
  {
    id: "med-m-7",
    kind: "image",
    url: docThumb(17),
    thumbnailUrl: docThumb(17),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-18T12:00:00Z`,
  },
  {
    id: "med-m-8",
    kind: "image",
    url: docThumb(18),
    thumbnailUrl: docThumb(18),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-17T12:00:00Z`,
  },
  {
    id: "med-m-9",
    kind: "image",
    url: docThumb(19),
    thumbnailUrl: docThumb(19),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-15T12:00:00Z`,
  },
  {
    id: "med-m-10",
    kind: "image",
    url: docThumb(20),
    thumbnailUrl: docThumb(20),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-12T12:00:00Z`,
  },
  {
    id: "med-m-11",
    kind: "image",
    url: chartThumb(21),
    thumbnailUrl: chartThumb(21),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-08T12:00:00Z`,
  },
  {
    id: "med-m-12",
    kind: "image",
    url: docThumb(22),
    thumbnailUrl: docThumb(22),
    conversationName: "Kamal Accounting",
    createdAt: `${MAR}-05T12:00:00Z`,
  },
];

export function getMockMedia(): WAMediaItem[] {
  return MOCK_MEDIA;
}
