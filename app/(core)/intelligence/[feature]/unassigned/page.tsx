import { redirect } from "next/navigation";

/**
 * /intelligence/[domain]/unassigned — retired: a Domain's own jobs now sit at
 * the top of the Domain's page (features/mandates/feature-intelligence).
 */
export default async function DomainUnassignedRoute({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  redirect(`/intelligence/${encodeURIComponent(feature)}`);
}
