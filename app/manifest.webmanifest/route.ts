// Route handler for /manifest.webmanifest.
//
// We use a route handler instead of the Next.js metadata file convention
// (`app/manifest.ts`) because the metadata-file approach has been intermittently
// 404-ing on Vercel for this project (Feb 2026: see commits 15c577cfb,
// c036d87df, 3201c0bea). The route-handler pattern matches the working
// `app/robots.txt/route.ts` and `app/sitemap.xml/route.ts` files and is
// reliably picked up by Next.js's build pipeline.

const manifest = {
  name: "AI Matrx",
  short_name: "AI Matrx",
  description:
    "No-code AI platform that orchestrates, automates, and elevates business processes.",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  icons: [
    {
      src: "/matrx/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/matrx/android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
} as const;

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
