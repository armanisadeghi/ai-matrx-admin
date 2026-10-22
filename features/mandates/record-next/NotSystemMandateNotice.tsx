"use client";

/**
 * The management page's answer for a mandate that is not a system one: one compact row that
 * names WHO owns it (its organization, else the person who made it), with the support door as
 * the primary action and the way back to the system list beside it.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import { useOrganizationLabel } from "@/features/organizations/hooks/useOrganizationLabel";
import { createClient } from "@/utils/supabase/client";
import { ErrorBoundaryWithCapture } from "@/lib/error-boundary/ErrorBoundaryWithCapture";

interface Owner {
  organizationId: string | null;
  createdBy: string | null;
}

function useMandateOwner(mandateId: string): Owner | null | "unknown" {
  const [owner, setOwner] = useState<Owner | null | "unknown">(null);
  useEffect(() => {
    let live = true;
    void createClient()
      .schema("mandate")
      .from("definition")
      .select("organization_id, created_by")
      .eq("id", mandateId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error || !data) {
          if (error) console.error("[mandate-notice] could not read the mandate's owner", error);
          setOwner("unknown");
          return;
        }
        setOwner({ organizationId: data.organization_id ?? null, createdBy: data.created_by ?? null });
      });
    return () => {
      live = false;
    };
  }, [mandateId]);
  return owner;
}

function OwnerName({ owner }: { owner: Owner }) {
  const label = useOrganizationLabel(owner.organizationId);
  if (owner.organizationId) {
    return (
      <EntityRef token="organization" id={owner.organizationId} name={label?.name ?? null} showIcon={false} />
    );
  }
  if (owner.createdBy) return <AdminUserRef userId={owner.createdBy} />;
  return <span>a person</span>;
}

export function NotSystemMandateNotice({
  mandateId,
  supportHref,
  listHref,
}: {
  mandateId: string;
  supportHref: string;
  listHref: string;
}) {
  const owner = useMandateOwner(mandateId);
  return (
    <div className="p-4">
      <div
        role="status"
        data-testid="not-a-system-mandate"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-card px-3 py-2"
      >
        <p className="type-body flex min-w-0 flex-wrap items-center gap-x-1.5">
          <span className="font-medium">Not a system mandate.</span>
          <span className="text-muted-foreground">Owned by</span>
          <span className="min-w-0 font-medium">
            {owner === null ? (
              <span className="text-muted-foreground">…</span>
            ) : owner === "unknown" ? (
              <span className="text-muted-foreground">an organization or a person</span>
            ) : (
              // The refusal and its door never depend on the owner's name: a name that
              // cannot draw leaves the plain words, never a blank page.
              <ErrorBoundaryWithCapture
                boundary="NotSystemMandateNotice.owner"
                fallback={<span className="text-muted-foreground">an organization or a person</span>}
              >
                <OwnerName owner={owner} />
              </ErrorBoundaryWithCapture>
            )}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline">
            <Link href={supportHref}>Open in Mandate support lookup</Link>
          </Button>
          <Button asChild variant="quiet">
            <Link href={listHref}>System mandates</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
