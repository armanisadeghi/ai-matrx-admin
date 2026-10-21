// app/(core)/search/experience/page.tsx
//
// The tabbed search that lived here is now /search itself (one page, Google's layout — owner's
// ruling 2026-10-21). An old link keeps its query and tab.

import { redirect } from "next/navigation";

export default async function SearchExperienceRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) next.append(key, v);
  }
  const qs = next.toString();
  redirect(qs ? `/search?${qs}` : "/search");
}
