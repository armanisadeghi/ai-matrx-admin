"use client";

/**
 * Vercel Speed Insights (real-user Core Web Vitals per route), loaded browser-only after mount so it
 * adds one tiny chunk and nothing to the server or first-paint graph. Mounted once, in the root layout.
 */
import dynamic from "next/dynamic";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

export default function SpeedInsightsAfterMount() {
  return <SpeedInsights />;
}
