"use client";

/**
 * Spokespeople on a brand's Voice page. A spokesperson is a person-scoped voice
 * (measured on that person's own Writing voice page) linked to the brand, so
 * drafts written as that person for this brand are checked against THEIR voice.
 */

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@ai-matrx/design-system/controls";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveUserAvatarUrl,
  selectDisplayName,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** A voice label made by the system ("person-87a6e699") is an id, never a name. */
const RAW_ID_LABEL = /^(person|brand|org)-[0-9a-f]{6,}$/i;
import {
  listBrandSpokespeople,
  listFingerprints,
  setSpokespersonBrand,
  type FingerprintRow,
} from "./service";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
export function SpokespeoplePanel({
  brandId,
  brandName,
  organizationId,
  onMeasureMine,
}: {
  /** Start measuring the signed-in person's own voice here, filed in this brand's organization. */
  onMeasureMine?: () => void;
  brandId: string;
  brandName: string;
  /** The brand's organization: a voice can only be linked within the same organization. */
  organizationId: string | null;
}) {
  const userId = useAppSelector(selectUserId);
  const myName = useAppSelector(selectDisplayName);
  const myAvatar = useAppSelector(selectActiveUserAvatarUrl);
  const [linked, setLinked] = useState<FingerprintRow[] | null>(null);
  const [mine, setMine] = useState<FingerprintRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [brandRows, ownRows] = await Promise.all([
        listBrandSpokespeople(brandId),
        userId ? listFingerprints("person", userId) : Promise.resolve([]),
      ]);
      setLinked(brandRows);
      setMine(ownRows.filter((row) => row.brand_id !== brandId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [brandId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load
    void load();
  }, [load]);

  const change = async (row: FingerprintRow, next: string | null) => {
    setBusyId(row.id);
    try {
      await setSpokespersonBrand(row.id, next);
      toast.success(next ? `Linked to ${brandName}` : "Unlinked");
      await load();
    } catch (e) {
      toast.error("Could not change the link", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  const alreadyLinked = (linked ?? []).some((row) => row.person_user_id === userId);
  const nameOf = (row: FingerprintRow): string =>
    row.person_user_id === userId && userId
      ? myName
      : RAW_ID_LABEL.test(row.label)
        ? "Teammate"
        : row.label;
  const eligible = mine.filter((row) => !organizationId || row.organization_id === organizationId);

  return (
    <SectionCard
      title="Spokespeople"
      about="A person's own measured voice, linked to this brand. Drafts written as that person for this brand are checked against their voice."
      headerExtra={
        onMeasureMine && userId ? (
          <Button variant="outline" icon={<Link2 />} onClick={onMeasureMine}>
            {alreadyLinked ? "Re-measure" : "Measure my voice"}
          </Button>
        ) : null
      }
    >
      <div data-testid="voice-spokespeople">
        {error ? <p className="px-3 py-2 type-secondary text-destructive">{error}<ErrorAlchemyMenu error={error} /></p> : null}
        {linked === null && !error ? (
          <p className="flex items-center gap-2 px-3 py-2 type-secondary text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading spokespeople
          </p>
        ) : null}
        {/* read-gate-exempt: linked stays null when the read fails; the failure shows above */}
        {linked?.length === 0 ? <p className="px-3 py-2 type-secondary text-muted-foreground">No spokesperson linked</p> : null}
        {(linked ?? []).length > 0 ? (
          <ul className="divide-y divide-border">
            {(linked ?? []).map((row) => (
              <li key={row.id} className="flex min-h-10 items-center gap-2 px-3 py-1.5">
                <Avatar className="h-6 w-6">
                  {row.person_user_id === userId && myAvatar ? <AvatarImage src={myAvatar} alt="" /> : null}
                  <AvatarFallback className="type-meta">{nameOf(row).slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate type-body text-foreground">{nameOf(row)}</span>
                <Badge variant={row.status === "confirmed" ? "default" : "secondary"}>
                  {row.status === "confirmed" ? "Confirmed" : "Draft"}
                </Badge>
                {row.person_user_id === userId ? (
                  <Button variant="quiet" icon={<Unlink />} disabled={busyId === row.id} onClick={() => void change(row, null)}>
                    Unlink
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {eligible.length ? (
          <div className="border-t border-border">
            <h3 className="px-3 pt-2 type-label">Your voices</h3>
            <ul className="divide-y divide-border">
              {eligible.map((row) => (
                <li key={row.id} className="flex min-h-10 items-center gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="type-body text-foreground">{nameOf(row)}</span>
                    <span className="ml-2 type-meta text-muted-foreground">
                      {row.status === "confirmed" ? "Confirmed" : "Draft"} · {row.sample_count} samples · measured{" "}
                      {new Date(row.last_extracted_at).toLocaleDateString()}
                    </span>
                  </span>
                  <Button variant="quiet" icon={<Link2 />} disabled={busyId === row.id} onClick={() => void change(row, brandId)}>
                    Link as spokesperson
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {mine.length - eligible.length > 0 ? (
          <p className="border-t border-border px-3 py-2 type-meta text-muted-foreground">
            {mine.length - eligible.length} of your voices are filed in another organization
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
