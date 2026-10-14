import { redirect } from "next/navigation";
import { smartAddPath } from "@/features/marketing/smart-add/smartAddUrl";

/** The bare Smart Add address opens the company page, keeping whatever the link carried. */
export default async function SmartAddBrandRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value !== undefined) query.set(key, value);
  }
  const q = query.toString();
  redirect(q ? `${smartAddPath("company")}?${q}` : smartAddPath("company"));
}
