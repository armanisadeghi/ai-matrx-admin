import type { WALinkItem } from "../types";

const NOW = new Date("2026-05-04T21:30:00");
function iso(offset: number): string {
  return new Date(NOW.getTime() + offset).toISOString();
}
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export const MOCK_LINKS: WALinkItem[] = [
  {
    id: "link-1",
    url: "http://localhost:3000@localhost:3000/image-studio/manager",
    hostname: "localhost",
    title: "http://localhost:3000@localhost:3000/ima…",
    description: "What was built: All image-related features (manager…",
    message: '"What was built: All image-related features (manager…"',
    senderName: "Kelvin React Dev",
    senderAvatarUrl: null,
    createdAt: iso(-6 * HOUR),
  },
  {
    id: "link-2",
    url: "https://github.com/aimatrx/matrx-frontend/pull/4421",
    hostname: "github.com",
    title: "feat(images): consolidate all image functio…",
    description: "Yes, I have just finished refactoring. I created a PR…",
    message: '"Yes, I have just finished refactoring. I created a PR…"',
    senderName: "Kelvin React Dev",
    senderAvatarUrl: null,
    createdAt: iso(-6 * HOUR - 17 * 60_000),
    iconUrl: "/matrx/icons/github.svg",
  },
  {
    id: "link-3",
    url: "https://status.supabase.com",
    hostname: "status.supabase.com",
    title: "Supabase Status",
    description: "Check their status website",
    message: '"Check their status website- https://status.su…"',
    senderName: "Kelvin React Dev",
    senderAvatarUrl: null,
    createdAt: iso(-7 * HOUR - 10 * 60_000),
  },
  {
    id: "link-4",
    url: "https://db.matrxserver.com",
    hostname: "db.matrxserver.com",
    title: "https://db.matrxserver.com",
    description: "Done. I've pushed my updates that now not only…",
    message: '"Done. I’ve pushed my updates that now not only…"',
    senderName: "You",
    senderAvatarUrl: null,
    createdAt: iso(-9 * HOUR),
  },
  {
    id: "link-5",
    url: "https://docs.google.com/spreadsheets/d/abc",
    hostname: "docs.google.com",
    title: "docs.google.com",
    description: "here is complete sheet and each client has own T…",
    message: '"here is complete sheet and each client has own T…"',
    senderName: "Aamir Hussain",
    senderAvatarUrl: null,
    createdAt: iso(-14 * HOUR),
    iconUrl: "/matrx/icons/google-sheets.svg",
  },
  {
    id: "link-6",
    url: "https://www.paypal.com/invoice/abc",
    hostname: "www.paypal.com",
    title: "Invoice",
    description: "No caption",
    message: "No caption",
    senderName: "Kelvin React Dev",
    senderAvatarUrl: null,
    createdAt: iso(-19 * HOUR),
  },
  {
    id: "link-7",
    url: "https://mymatrx.com/articles/image-module-consolidation",
    hostname: "mymatrx.com",
    title: "AI Matrix — Image Module Consolidatio",
    description: "I'm going to bed soon but I wanted to send you this…",
    message: '"I’m going to bed soon but I wanted to send you this…"',
    senderName: "You",
    senderAvatarUrl: null,
    createdAt: iso(-20 * HOUR),
  },
  {
    id: "link-8",
    url: "https://github.com/ruvnet/ruflo",
    hostname: "github.com",
    title: "GitHub - ruvnet/ruflo: 🌊 The leading agen…",
    description: "No caption",
    message: "No caption",
    senderName: "You",
    senderAvatarUrl: null,
    createdAt: iso(-DAY - 16 * HOUR),
    iconUrl: "/matrx/icons/github.svg",
  },
];

export function getMockLinks(): WALinkItem[] {
  return MOCK_LINKS;
}
