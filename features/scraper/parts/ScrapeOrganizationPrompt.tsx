"use client";

// The scraper's answer to "no organization": never a prompt to choose one
// (STATE rules 11-14). The platform's ONE notice for the state draws it — a
// quiet "Create an organization" door for a person in none, a plain "could not
// check" with Retry when the read failed, nothing once one is active. The
// scrape re-runs by itself once an organization exists
// (`useRetryWhenOrganizationPicked`).

import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { useRetryWhenOrganizationPicked } from "@/features/scraper/hooks/useRetryWhenOrganizationPicked";

export function ScrapeOrganizationPrompt({
  onPicked,
  className,
}: {
  /** Re-run the scrape the person already asked for. */
  onPicked: () => void;
  className?: string;
}) {
  useRetryWhenOrganizationPicked(true, onPicked);
  const { organizationState } = useOrganizationRequired();
  return (
    <OrganizationContextNotice
      compact
      state={organizationState}
      what="Reading this page"
      title="An organization is needed to read this page"
      description="Create one and the page loads by itself."
      className={className}
    />
  );
}
