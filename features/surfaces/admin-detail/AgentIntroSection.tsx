"use client";

/**
 * Agent intro — the text every agent sees first on this surface.
 *
 * Two columns on `ui.ui_surface` (aidream migration 20261021141700):
 * - `intro` — declared in the code manifest and overwritten by every surface sync.
 * - `intro_override` — edited here, never written by the sync.
 * The server sends `coalesce(intro_override, intro)` (aidream `effective_surface_intro`).
 * Saving writes the override; "Reset to code" clears it.
 */

import React, { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProTextarea } from "@/components/official/ProTextarea";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";

export interface SurfaceIntroFields {
  intro: string | null;
  intro_override?: string | null;
  intro_override_updated_at?: string | null;
}

/** Writes (or clears, with null) the admin intro for one surface; throws when no row changed. */
export async function setSurfaceIntroOverride(
  surfaceName: string,
  introOverride: string | null,
): Promise<{ intro_override: string | null; intro_override_updated_at: string | null }> {
  const { data, error } = await createClient()
    .schema("ui")
    .from("ui_surface")
    .update({ intro_override: introOverride })
    .eq("name", surfaceName)
    .select("intro_override, intro_override_updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Agent intro not saved: no access to surface ${surfaceName}`);
  return data;
}

export function AgentIntroSection({
  surfaceName,
  fields,
  onSaved,
}: {
  surfaceName: string;
  fields: SurfaceIntroFields;
  onSaved: (next: Pick<SurfaceIntroFields, "intro_override" | "intro_override_updated_at">) => void;
}) {
  const codeIntro = fields.intro ?? "";
  const override = fields.intro_override ?? null;
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
      const saved = await setSurfaceIntroOverride(surfaceName, next);
      onSaved(saved);
      toast.success(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Agent intro not saved");
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    // Saving the code text unchanged is not an edit: keep following the code.
    const next = draft.trim() === "" || (!edited && draft === codeIntro) ? null : draft;
    void save(next, "Agent intro saved");
  };

  const onReset = async () => {
    const ok = await confirm({
      title: "Reset to code?",
      description: "The edited intro is removed; agents get the code intro.",
      confirmLabel: "Reset",
    });
    if (ok) void save(null, "Agent intro reset to code");
  };

  return (
    <section className="space-y-2" data-testid="surface-agent-intro">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Agent intro
        </h2>
        <Badge variant={edited ? "secondary" : "outline"} className="text-[10px]">
          {edited ? "Edited here" : "From code"}
        </Badge>
        {edited && fields.intro_override_updated_at && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(fields.intro_override_updated_at).toLocaleString()}
          </span>
        )}
      </div>
      <div className="space-y-3 rounded-md border border-border bg-card p-3">
        <ProTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          placeholder="What agents should know on this page"
          className="bg-background text-foreground font-mono disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontSize: "16px" }}
          disabled={busy}
          aria-label="Agent intro"
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
                  {showCode ? "Hide code intro" : "Show code intro"}
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
            data-testid="surface-agent-intro-code"
          >
            {codeIntro || "No code intro"}
          </pre>
        )}
      </div>
    </section>
  );
}
