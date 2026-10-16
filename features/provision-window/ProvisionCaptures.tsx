"use client";

/**
 * Every capture of one call point for one subject (newest first), each opening the Provision
 * window. Used on Smart Add after Create and on the brand page.
 *
 * A capture holds provision VALUES, which stay on the server (Arman, 2026-10-15/16: "we get them only in debug
 * mode"): the list renders, and reads, only for an admin with the debug switch on.
 */
import { useEffect, useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { extractErrorMessage } from "@/utils/errors";
import { useOpenProvisionWindow } from "@/features/overlays/openers/provisionWindow";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectAdminFeature } from "@/lib/redux/selectors/userSelectors";
import { TRIGGER_LABEL, listProvisionSnapshots, type ProvisionCapture } from "./data";

export function ProvisionCaptures({
  pointKey,
  subjectId,
  title,
  refreshKey,
  limit = 4,
  label,
}: {
  pointKey: string;
  subjectId: string;
  title: string;
  /** Change it to re-read the list (e.g. when a background step just captured). */
  refreshKey?: string | number;
  limit?: number;
  /** When set, shown before the buttons, and the whole row is absent while there are no captures. */
  label?: string;
}) {
  const [captures, setCaptures] = useState<ProvisionCapture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = useOpenProvisionWindow();
  const canSee = useAppSelector(
    (s) => selectAdminFeature(s, "provision.open-any-snapshot") && Boolean(selectIsDebugMode(s)),
  );

  useEffect(() => {
    if (!canSee) return;
    let live = true;
    listProvisionSnapshots(pointKey, subjectId).then(
      (rows) => live && setCaptures(rows),
      (e: unknown) => live && setError(extractErrorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [pointKey, subjectId, refreshKey, canSee]);

  if (!canSee) return null;
  if (label && (!captures || !captures.length) && !error) return null;
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (!captures) return <span className="text-xs text-muted-foreground">Loading</span>;
  if (!captures.length) return <span className="text-xs text-muted-foreground">No captures yet</span>;
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="provision-captures">
      {label ? <span className="mr-1 font-semibold">{label}</span> : null}
      {captures.slice(0, limit).map((c) => (
        <Button key={c.id} variant="outline" onClick={() => open(c.id, title)} title={new Date(c.createdAt).toLocaleString()}>
          {TRIGGER_LABEL[c.trigger] ?? c.trigger} · {formatCount(c.totalChars)}
        </Button>
      ))}
    </div>
  );
}
