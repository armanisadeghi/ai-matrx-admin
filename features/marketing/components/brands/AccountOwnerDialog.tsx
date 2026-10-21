"use client";

/**
 * Whose account is this? The brand's own, or a person's (picked from the organization's CRM people).
 * One small dialog opened from an account row's menu on the brand Overview and on Social -> Accounts.
 * A person's account never counts toward the brand's audience, posts or KPIs.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { Button, SearchField, SegmentedControl } from "@ai-matrx/design-system/controls";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { searchPartiesByName } from "@/features/crm/service";
import { setPropertyOwner } from "@/features/marketing/data/service";
import { accountName } from "@/features/marketing/social/mappers";
import type { AccountRow } from "@/features/marketing/social/types";

export type Owner = "company" | "person";

export function AccountOwnerDialog({
  account,
  organizationId,
  onClose,
}: {
  /** The row being changed; null keeps the dialog closed. */
  account: AccountRow | null;
  organizationId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(account)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-sm">
        {account ? <OwnerForm key={account.rowId} account={account} organizationId={organizationId} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function OwnerForm({ account, organizationId, onClose }: { account: AccountRow; organizationId: string; onClose: () => void }) {
  const client = useQueryClient();
  const [owner, setOwner] = useState<Owner>(account.ownerKind === "person" ? "person" : "company");
  const [person, setPerson] = useState<{ id: string; name: string } | null>(
    account.ownerPartyId ? { id: account.ownerPartyId, name: account.ownerName ?? "" } : null,
  );
  const [saving, setSaving] = useState(false);

  const unchanged =
    owner === (account.ownerKind ?? "company") && (owner === "company" || (person?.id ?? null) === (account.ownerPartyId ?? null));

  const save = async () => {
    if (!account.propertyId) return;
    setSaving(true);
    try {
      await setPropertyOwner({
        propertyId: account.propertyId,
        organizationId,
        ownerKind: owner,
        ownerPartyId: owner === "person" ? (person?.id ?? null) : null,
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["marketing", "social", "brand-accounts"] }),
        client.invalidateQueries({ queryKey: ["marketing", "brand-overview"] }),
      ]);
      toast.success(owner === "person" ? `${accountName(account)} is now a personal account` : `${accountName(account)} is now the brand's`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the owner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate">Whose account is {accountName(account)}?</DialogTitle>
      </DialogHeader>
      <AccountOwnerPicker
        owner={owner}
        onOwnerChange={setOwner}
        person={person}
        onPersonChange={setPerson}
        organizationId={organizationId}
        initialSearch={account.ownerKind === "person" ? "" : (account.profileName ?? "")}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={unchanged || saving || !account.propertyId} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * The owner choice itself — The brand / A person (searched in the organization's CRM people). Shared by the
 * owner dialog and the Add account dialog, so a personal account can be added as one instead of landing as the brand's.
 */
export function AccountOwnerPicker({
  owner,
  onOwnerChange,
  person,
  onPersonChange,
  organizationId,
  initialSearch = "",
}: {
  owner: Owner;
  onOwnerChange: (owner: Owner) => void;
  person: { id: string; name: string } | null;
  onPersonChange: (person: { id: string; name: string }) => void;
  organizationId: string;
  initialSearch?: string;
}) {
  const [term, setTerm] = useState(initialSearch);
  const [results, setResults] = useState<{ id: string; name: string }[] | null>(null);
  const [searchError, setSearchError] = useState<unknown>(null);

  useEffect(() => {
    if (owner !== "person") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await searchPartiesByName({ orgId: organizationId, search: term });
        if (!cancelled) {
          setSearchError(null);
          setResults(rows.filter((r) => r.party_kind === "person").map((r) => ({ id: r.id, name: r.display_name ?? "" })));
        }
      } catch (error) {
        if (!cancelled) setSearchError(error);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [owner, term, organizationId]);

  return (
    <div className="grid gap-3">
      <SegmentedControl
        aria-label="Owner"
        value={owner}
        onValueChange={(v) => onOwnerChange(v === "person" ? "person" : "company")}
        data={[
          { value: "company", label: "The brand" },
          { value: "person", label: "A person" },
        ]}
      />
      {owner === "person" ? (
        <div className="grid gap-2">
          <SearchField aria-label="Search people" placeholder="Search people" value={term} onChange={(e) => setTerm(e.target.value)} />
          <ul className="max-h-48 overflow-auto rounded-md border border-border">
            {searchError ? (
              <li>
                <ReadFailure error={searchError} what="people" size="compact" />
              </li>
            ) : results === null ? (
              <li className="p-2">
                <Skeleton className="h-5 w-full" />
              </li>
            ) : results.length === 0 ? (
              <li className="px-2 py-1.5 type-secondary text-muted-foreground">No people found</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <Button
                    variant={person?.id === p.id ? "primary" : "quiet"}
                    className="w-full justify-start"
                    aria-pressed={person?.id === p.id}
                    onClick={() => onPersonChange(p)}
                  >
                    {p.name}
                  </Button>
                </li>
              ))
            )}
          </ul>
          <span className="type-meta text-muted-foreground">{person ? `Owner: ${person.name}` : "No person picked yet"}</span>
        </div>
      ) : null}
    </div>
  );
}
