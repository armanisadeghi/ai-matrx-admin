"use client";

/**
 * The chip's panel: the block's current text, which level/variant runs, Declare (typed by hand),
 * Make my own (a personal override with the same name), Open in library.
 */
import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@ai-matrx/design-system";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import { createBlock, listBlocksNamed, listVariants } from "../service";
import { invalidateBlocks, winningRowId } from "../blocksCache";
import { BLOCK_LANE_LABEL, SYSTEM_ORG_ID, laneOf } from "../lanes";
import { resolveBlocks } from "../resolveBlocks";
import { describeCondition, parseCondition } from "../conditions";
import type { PromptBlockRow, PromptBlockVariantRow } from "../types";
import { openOutbound } from "@ai-matrx/kit/outbound";

export interface ChipTarget {
  name: string;
  rect: DOMRect;
}

interface Props {
  target: ChipTarget | null;
  declared: boolean;
  modelName?: string | null;
  creatorId?: string | null;
  organizationId: string | null;
  onDeclare: (name: string) => Promise<void>;
  onClose: () => void;
  onChanged: () => void;
}

interface Shown {
  rows: PromptBlockRow[];
  winner: PromptBlockRow | null;
  variants: PromptBlockVariantRow[];
  variantLabel: string | null;
  /** The server confirmed which variant runs; when false only the default text is known. */
  checked: boolean;
  text: string;
}

export function BlockChipPanel({ target, declared, modelName, creatorId, organizationId, onDeclare, onClose, onChanged }: Props) {
  const dispatch = useAppDispatch();
  const meId = useAppSelector(selectUserId);
  const orgId = organizationId;
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = target?.name ?? null;

  const load = useCallback(async () => {
    if (!name) return;
    try {
      const rows = await listBlocksNamed(name);
      const winnerId = winningRowId(rows, name, meId, SYSTEM_ORG_ID, orgId);
      const winner = rows.find((r) => r.id === winnerId) ?? null;
      const variants = winner ? await listVariants(winner.id) : [];
      let text = winner?.content ?? "";
      let variantLabel: string | null = null;
      let checked = false;
      if (winner && modelName) {
        try {
          const res = await resolveBlocks(dispatch, { names: [name], model: modelName, creator: creatorId ?? undefined });
          const entry = res.report.find((r) => r.name === name);
          if (res.blocks[name]) text = res.blocks[name];
          checked = !!entry;
          if (entry?.variant_id) variantLabel = variants.find((v) => v.id === entry.variant_id)?.label || "Variant";
        } catch {
          // The server check is optional here: the default text of the winning row stands.
        }
      }
      setShown({ rows, winner, variants, variantLabel, checked, text });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the block");
    }
  }, [name, meId, orgId, modelName, creatorId, dispatch]);

  useEffect(() => {
    setShown(null);
    setError(null);
    void load();
  }, [load]);

  const mine = shown?.rows.find((r) => r.visibility === "personal" && r.created_by === meId) ?? null;

  const makeMine = async (visibility: "personal" | "internal") => {
    if (!shown?.winner || !orgId) return;
    setBusy(true);
    try {
      const src = shown.winner;
      const row = await createBlock({
        name: src.name,
        label: src.label,
        content: shown.text || src.content,
        description: src.description,
        source_kind: src.source_kind === "skill" ? "skill" : "authored",
        source_ref: src.source_ref,
        bound_tool: src.bound_tool,
        organization_id: orgId,
        visibility,
      });
      invalidateBlocks();
      onChanged();
      await load();
      toast.success(visibility === "personal" ? "Your own copy is ready" : "Your organization's copy is ready");
      openOutbound(`/agents/prompt-blocks/${row.id}`, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not make a copy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={!!target} onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor asChild>
        <div
          style={{
            position: "fixed",
            left: target?.rect.left ?? 0,
            top: target?.rect.top ?? 0,
            width: target?.rect.width ?? 1,
            height: target?.rect.height ?? 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent align="start" className="w-96 p-3" data-testid="prompt-block-panel">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-sm">{name}</span>
          {shown?.winner && <Badge data-testid="prompt-block-panel-level">{BLOCK_LANE_LABEL[laneOf(shown.winner, meId)]}</Badge>}
          {shown?.winner && (
            <Badge tone={shown.variantLabel ? "info" : "neutral"} data-testid="prompt-block-panel-variant">
              {shown.variantLabel ?? (shown.checked || shown.variants.length === 0 ? "Default text" : "Variant not checked")}
            </Badge>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!error && !shown && <p className="text-xs text-muted-foreground">Loading</p>}
        {shown && !shown.winner && (
          <p className="text-xs text-destructive" data-testid="prompt-block-panel-missing">
            No block named {name} at any level. A run is refused until one exists.
          </p>
        )}
        {shown?.winner && (
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs" data-testid="prompt-block-panel-text">
            {shown.text || "(empty)"}
          </pre>
        )}
        {shown && shown.variants.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {shown.variants.map((v) => (
              <li key={v.id}>
                {v.label || "Variant"}: {describeCondition(parseCondition(v.condition))}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {!declared && name && (
            <Button
              variant="quiet"
              data-testid="prompt-block-declare"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDeclare(name);
                  toast.success(`${name} declared on this agent`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not declare");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Declare
            </Button>
          )}
          {shown?.winner && !mine && (
            <>
              <Button variant="quiet" data-testid="prompt-block-make-mine" disabled={busy} onClick={() => makeMine("personal")}>
                Make my own
              </Button>
              {shown.winner.organization_id === SYSTEM_ORG_ID && (
                <Button variant="quiet" disabled={busy} onClick={() => makeMine("internal")}>
                  Make for organization
                </Button>
              )}
            </>
          )}
          {shown?.winner && (
            <Button variant="quiet" onClick={() => openOutbound(`/agents/prompt-blocks/${(mine ?? shown.winner)?.id}`, "_blank")}>
              Open in library
            </Button>
          )}
          {shown && !shown.winner && (
            <Button variant="quiet" onClick={() => openOutbound(`/agents/prompt-blocks/new?name=${encodeURIComponent(name ?? "")}`, "_blank")}>
              Create it
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
