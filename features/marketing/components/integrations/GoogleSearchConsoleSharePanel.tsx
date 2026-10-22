"use client";

// Share ONE product of a Google connection: Search Console, with a person or with
// an organization. Gmail, Drive and everything else on the account stay the owner's.
// Rules live on the server (aidream product_shares); this is only the control.

import { useState } from "react";
import { Loader2, Share2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { describeBackendFailure } from "@ai-matrx/api";
import { useActiveOrganizationPicker } from "@/features/organizations/hooks/useActiveOrganizationPicker";
import { useOrganizationMembers } from "@/features/organizations/hooks";
import { useShareSearchConsole } from "@/features/marketing/google/hooks";
import {
  sharesOfConnection,
  type ShareGranteeType,
} from "@/features/marketing/google/product-shares";
import type { GoogleConnectionSummary } from "@/features/marketing/google/types";

export function GoogleSearchConsoleSharePanel({
  connection,
}: {
  connection: GoogleConnectionSummary;
}) {
  const organizations = useActiveOrganizationPicker();
  const { members } = useOrganizationMembers(organizations.activeOrgId ?? undefined);
  const share = useShareSearchConsole();
  const [choice, setChoice] = useState("");

  const orgName = new Map(organizations.organizations.map((o) => [o.id, o.name]));
  const personName = new Map(
    members.map((m) => [
      m.userId,
      m.user?.displayName || m.user?.email || "Member",
    ]),
  );
  const current = sharesOfConnection(connection);
  const held = new Set(current.map((entry) => `${entry.kind}:${entry.id}`));

  const options: { value: string; label: string }[] = [
    // "Everyone in my organization" is the ACTIVE organization — a person can belong to
    // hundreds, and sharing with all of them is never one click.
    ...(organizations.activeOrgId &&
    !held.has(`organization:${organizations.activeOrgId}`)
      ? [
          {
            value: `organization:${organizations.activeOrgId}`,
            label: `Everyone in ${organizations.activeOrgName ?? "my organization"}`,
          },
        ]
      : []),
    ...members
      .filter(
        (m) =>
          m.userId !== connection.owner_user_id && !held.has(`user:${m.userId}`),
      )
      .map((m) => ({
        value: `user:${m.userId}`,
        label: m.user?.displayName || m.user?.email || "Member",
      })),
  ];

  const run = async (
    granteeType: ShareGranteeType,
    granteeId: string,
    remove: boolean,
  ) => {
    try {
      await share.mutateAsync({
        connectionId: connection.id,
        granteeType,
        granteeId,
        remove,
      });
      toast.success(remove ? "Search Console sharing removed." : "Search Console shared.");
      setChoice("");
    } catch (error) {
      toast.error(
        remove ? "Sharing could not be removed" : "Search Console could not be shared",
        { description: describeBackendFailure(error).headline },
      );
    }
  };

  return (
    <div className="mt-2 max-w-3xl rounded-md border border-border bg-muted/20 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold">Share Search Console</span>
        <Badge variant="outline">Search Console only</Badge>
      </div>
      {current.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {current.map((entry) => (
            <li
              key={`${entry.kind}:${entry.id}`}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px]"
            >
              {entry.kind === "organization"
                ? `Everyone in ${orgName.get(entry.id) ?? "organization"}`
                : (personName.get(entry.id) ?? "Person")}
              <Button
                aria-label="Stop sharing"
                variant="quiet"
                icon={<X />}
                disabled={share.isPending}
                onClick={() => void run(entry.kind, entry.id, true)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Select value={choice || undefined} onValueChange={setChoice}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Person or organization" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          data-share-label="form commit: grants the chosen person or group"
          icon={share.isPending ? <Loader2 className="animate-spin" /> : <Share2 />}
          variant="outline"
          disabled={!choice || share.isPending}
          onClick={() => {
            const [kind, ...rest] = choice.split(":");
            void run(kind as ShareGranteeType, rest.join(":"), false);
          }}
        >
          Share
        </Button>
      </div>
    </div>
  );
}
