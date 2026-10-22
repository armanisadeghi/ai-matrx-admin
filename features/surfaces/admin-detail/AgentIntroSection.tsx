"use client";

/**
 * Agent intro and agent situation — the text every agent sees first on this surface.
 *
 * Each is two columns on `ui.ui_surface`:
 * - `intro` / `situation` — declared in the code manifest and mirrored by the surface sync.
 * - `intro_override` / `situation_override` — edited here, never written by the sync
 *   (aidream migrations 20261021141700 and 20261022402000; surface declarations D4).
 * The server sends `coalesce(<field>_override, <field>)` (aidream `effective_surface_intro` /
 * `effective_surface_situation`). Saving writes the override; "Reset to code" clears it.
 */

import React, { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProTextarea } from "@/components/official/ProTextarea";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";

/** Which code/override pair the section edits. */
export type SurfaceOverrideField = "intro" | "situation";

export interface SurfaceIntroFields {
  intro: string | null;
  intro_override?: string | null;
  intro_override_updated_at?: string | null;
  situation?: string | null;
  situation_override?: string | null;
  situation_override_updated_at?: string | null;
}

const COPY: Record<
  SurfaceOverrideField,
  { title: string; placeholder: string; saved: string; reset: string; resetBody: string; showCode: string; hideCode: string; noCode: string; failed: string }
> = {
  intro: {
    title: "Agent intro",
    placeholder: "What agents should know on this page",
    saved: "Agent intro saved",
    reset: "Agent intro reset to code",
    resetBody: "The edited intro is removed; agents get the code intro.",
    showCode: "Show code intro",
    hideCode: "Hide code intro",
    noCode: "No code intro",
    failed: "Agent intro not saved",
  },
  situation: {
    title: "Agent situation",
    placeholder: "{user.name|The person} is … {value|words when missing}",
    saved: "Agent situation saved",
    reset: "Agent situation reset to code",
    resetBody: "The edited situation is removed; agents get the code situation.",
    showCode: "Show code situation",
    hideCode: "Hide code situation",
    noCode: "No code situation",
    failed: "Agent situation not saved",
  },
};

/** Writes (or clears, with null) the admin override of one field; throws when no row changed. */
export async function setSurfaceTextOverride(
  surfaceName: string,
  field: SurfaceOverrideField,
  value: string | null,
): Promise<Partial<SurfaceIntroFields>> {
  const column = `${field}_override` as const;
  // A dynamic column of the same table: the patch is one of the two override columns only.
  const patch = { [column]: value } as { intro_override: string | null };
  const { data, error } = await createClient()
    .schema("ui")
    .from("ui_surface")
    .update(patch)
    .eq("name", surfaceName)
    .select(`${column}, ${column}_updated_at`)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`${COPY[field].failed}: no access to surface ${surfaceName}`);
  return data as Partial<SurfaceIntroFields>;
}

/** Writes (or clears, with null) the admin intro for one surface; throws when no row changed. */
export async function setSurfaceIntroOverride(
  surfaceName: string,
  introOverride: string | null,
): Promise<Partial<SurfaceIntroFields>> {
  return setSurfaceTextOverride(surfaceName, "intro", introOverride);
}

export function AgentIntroSection({
  surfaceName,
  fields,
  onSaved,
  field = "intro",
}: {
  surfaceName: string;
  fields: SurfaceIntroFields;
  onSaved: (next: Partial<SurfaceIntroFields>) => void;
  /** `situation` edits the situation template (D4); default the intro. */
  field?: SurfaceOverrideField;
}) {
  const copy = COPY[field];
  const codeIntro = (field === "intro" ? fields.intro : fields.situation) ?? "";
  const override = (field === "intro" ? fields.intro_override : fields.situation_override) ?? null;
  const overrideUpdatedAt =
    field === "intro" ? fields.intro_override_updated_at : fields.situation_override_updated_at;
  const edited = override !== null && override.trim() !== "";
  const effective = edited ? override : codeIntro;

  const [draft, setDraft] = useState(effective);
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    setDraft(effective);
  }, [surfaceName, effective]);

  const dirty = draft !== effective;

  const save = async (next: string | null, message: string) => {
    setBusy(true);
    try {
      const saved = await setSurfaceTextOverride(surfaceName, field, next);
      onSaved(saved);
      toast.success(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    // Saving the code text unchanged is not an edit: keep following the code.
    const next = draft.trim() === "" || (!edited && draft === codeIntro) ? null : draft;
    void save(next, copy.saved);
  };

  const onReset = async () => {
    const ok = await confirm({
      title: "Reset to code?",
      description: copy.resetBody,
      confirmLabel: "Reset",
    });
    if (ok) void save(null, copy.reset);
  };

  return (
    <section className="space-y-2" data-testid={`surface-agent-${field}`}>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.title}
        </h2>
        <Badge variant={edited ? "secondary" : "outline"} className="text-[10px]">
          {edited ? "Edited here" : "From code"}
        </Badge>
        {edited && overrideUpdatedAt && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(overrideUpdatedAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="space-y-3 rounded-md border border-border bg-card p-3">
        <ProTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          placeholder={copy.placeholder}
          className="bg-background text-foreground font-mono disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontSize: "16px" }}
          disabled={busy}
          aria-label={copy.title}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {edited && (
              <>
                <Button
                  variant="quiet"
                  icon={<RotateCcw />}
                  onClick={() => void onReset()}
                  disabled={busy}
                >
                  Reset to code
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => setShowCode((v) => !v)}
                  disabled={busy}
                >
                  {showCode ? copy.hideCode : copy.showCode}
                </Button>
              </>
            )}
          </div>
          <Button
            variant="primary"
            icon={busy ? <Loader2 className="animate-spin" /> : <Check />}
            onClick={onSave}
            disabled={busy || !dirty}
          >
            Save
          </Button>
        </div>
        {edited && showCode && (
          <pre
            className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-2 font-mono text-xs text-muted-foreground"
            data-testid={`surface-agent-${field}-code`}
          >
            {codeIntro || copy.noCode}
          </pre>
        )}
      </div>
    </section>
  );
}
