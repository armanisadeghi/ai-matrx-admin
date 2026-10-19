"use client";

/**
 * A new tile before its record exists, for a feature whose canonical create path is one async call
 * (a workbook, a presentation). Nothing is created until the person presses Create: never on mount,
 * so a remount, a reload or a tile taken off the board leaves no stray record. Create runs the
 * feature's own "New" path (`ensureOrgId`: the active organization, never a prompt, and it refuses
 * with its honest reason, shown here) and the tile then refers to the new record through `onMade`.
 */

import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

export type MadeRecord = { id: string; name: string };

/** Creates the record in the organization. Resolves the new id and name, or throws the honest reason. */
export type CreateRecord = (organizationId: string) => Promise<MadeRecord>;

async function make(create: CreateRecord, organizationId: string | null): Promise<MadeRecord | { failure: string }> {
  try {
    return await create(await ensureOrgId(organizationId));
  } catch (err) {
    console.error("[board] could not create the record", err);
    return { failure: err instanceof Error ? err.message : String(err) };
  }
}

export function RecordDraftBody({
  noun,
  hint,
  icon,
  create,
  onMade,
}: {
  /** "workbook" — in "This workbook could not be created" and the button. */
  noun: string;
  hint: string;
  icon: ReactNode;
  create: CreateRecord;
  onMade: (made: MadeRecord) => void;
}) {
  const organizationId = useAppSelector(selectOrganizationId);
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const busy = useRef(false);

  const press = async () => {
    if (busy.current) return;
    busy.current = true;
    setCreating(true);
    setFailure(null);
    const result = await make(create, organizationId);
    busy.current = false;
    setCreating(false);
    if ("failure" in result) setFailure(result.failure);
    else onMade(result);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-card p-6 text-center">
      {failure ? (
        <ErrorNotice size="compact" title={`This ${noun} could not be created`} message={failure} operation={`Create a ${noun} on the board`} />
      ) : (
        <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
      )}
      <Button icon={creating ? <Loader2 className="animate-spin" /> : icon} variant="primary" type="button" onClick={() => void press()} disabled={creating}>
        {failure ? "Try again" : `Create ${noun}`}
      </Button>
    </div>
  );
}
