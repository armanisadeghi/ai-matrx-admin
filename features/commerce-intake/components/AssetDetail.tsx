"use client";

/**
 * AssetDetail — one intake asset: media strip, notes (guarded autosave),
 * identifiers, and the GENERIC EDITABLE ROWS over `intake_asset.attributes`
 * (§2 policy 5 — one generic editable-rows component makes every
 * agent-written value human-correctable; reuses the prototype-proven
 * `EditableRows` + `CommitField` primitives rather than bespoke forms).
 *
 * "Reprocess" here is the SAME `pipeline_state='captured'` status write the
 * capture surface makes — the transition IS the contract (§2 policy 3).
 */

import { StaleDataNotice } from "@ai-matrx/design-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileAudio, Loader2, QrCode, RotateCw, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { CaptureThumb } from "@/features/media-capture/components/CaptureThumb";
import { FileRightClickMenu } from "@/features/files/components/core/FileContextMenu/FileRightClickMenu";
import { openFilePreview } from "@/features/files/components/preview/openFilePreview";
import { AssetPipelineResults } from "@/features/commerce-review/components/AssetPipelineResults";
import {
  CommitField,
  EditableRows,
  PanelSection,
} from "@/features/product-capture/components/pipeline/panel-primitives";
import { toast } from "@/lib/toast";

import type { AssetIdentifier, IntakeArtifact, IntakeAsset } from "../types";
import {
  finishAsset,
  listAssetArtifacts,
  listIdentifiers,
  loadAsset,
  replaceIdentifier,
  setAssetAttributes,
  setAssetNotes,
} from "../service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  COMMERCE_INTAKE_ASSET_SURFACE_NAME,
  createCommerceIntakeAssetScope,
} from "@/features/surfaces/manifests/commerce-intake-asset.manifest";
import { PrintLabelDialog } from "../labels/components/PrintLabelDialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ReadFailure } from "@ai-matrx/design-system";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";

interface AttributeRow {
  key: string;
  value: string;
}

export function AssetDetail({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [asset, setAsset] = useState<IntakeAsset | null>(null);
  const [artifacts, setArtifacts] = useState<IntakeArtifact[]>([]);
  const [identifiers, setIdentifiers] = useState<AssetIdentifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  // A Retry that cannot succeed is the lie the access gate exists to kill, so
  // the gate's retry re-runs the real load rather than re-rendering the shell.
  const [reloadNonce, setReloadNonce] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);
  const [pendingRetire, setPendingRetire] = useState<AssetIdentifier | null>(
    null,
  );

  // A failed re-read after a change is said above the list (RC-B12 r13) —
  // the identifiers on screen may no longer be current.
  const [identifiersRefreshError, setIdentifiersRefreshError] = useState<unknown>(null);
  const reloadIdentifiers = useCallback(async () => {
    try {
      setIdentifiers(await listIdentifiers(assetId));
      setIdentifiersRefreshError(null);
    } catch (err) {
      console.error("[commerce-intake] identifier reload failed", err);
      setIdentifiersRefreshError(err ?? new Error("The identifiers read failed"));
    }
  }, [assetId]);

  const assetRef = useRef<IntakeAsset | null>(null);
  const adopt = useCallback((next: IntakeAsset | null) => {
    assetRef.current = next;
    setAsset(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred a tick — no synchronous setState in the effect body (React
    // Compiler rule); the loading flag and the read start together.
    const timer = setTimeout(() => void (async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const [loaded, arts, ids] = await Promise.all([
          loadAsset(assetId),
          listAssetArtifacts(assetId),
          listIdentifiers(assetId),
        ]);
        if (cancelled) return;
        adopt(loaded);
        setNotesDraft(loaded?.notes ?? "");
        setArtifacts(arts);
        setIdentifiers(ids);
        setLoadError(null);
      } catch (err) {
        console.error("[commerce-intake] asset load failed", err);
        if (!cancelled) setLoadError(err ?? new Error("The asset read failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [assetId, adopt, reloadNonce]);

  const saveNotes = useCallback(async () => {
    const current = assetRef.current;
    if (!current || notesDraft === current.notes) return;
    setSaving(true);
    try {
      adopt(await setAssetNotes(current, notesDraft));
    } catch (err) {
      console.error("[commerce-intake] notes save failed", err);
      toast.error("Could not save the notes.");
    } finally {
      setSaving(false);
    }
  }, [notesDraft, adopt]);

  // Attribute rows are a LOCAL DRAFT over `asset.attributes`: a freshly added
  // row has no name yet, and only named rows persist — deriving the rows from
  // the saved object made "Add attribute" vanish on its own save (the blank
  // row was dropped from the write, then re-derived away). The draft re-seeds
  // when the saved attributes change underneath it (adjust-during-render).
  // Re-seed on CONTENT change, never on object identity: every guarded write
  // (a notes autosave, Mark captured) adopts a fresh row object, and re-seeding
  // on identity dropped the unnamed row a person was still naming. Unnamed
  // draft rows ride across a re-seed untouched.
  const savedAttributes = asset?.attributes ?? null;
  const savedKey = JSON.stringify(savedAttributes ?? {});
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([]);
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  if (savedKey !== seededFrom) {
    setSeededFrom(savedKey);
    setAttributeRows((prev) => [
      ...Object.entries(savedAttributes ?? {}).map(([key, value]) => ({
        key,
        value,
      })),
      ...prev.filter((r) => !r.key.trim()),
    ]);
  }

  const saveAttributes = useCallback(
    async (rows: AttributeRow[]) => {
      const current = assetRef.current;
      if (!current) return;
      setAttributeRows(rows);
      const attributes: Record<string, string> = {};
      for (const row of rows) {
        const k = row.key.trim();
        if (k) attributes[k] = row.value;
      }
      // Only NAMED rows reach the row; an unnamed draft row stays on screen
      // until it is named. Nothing to write when the named set is unchanged.
      const unchanged =
        JSON.stringify(attributes) === JSON.stringify(current.attributes);
      if (unchanged) return;
      try {
        const saved = await setAssetAttributes(current, attributes);
        // Adopt the saved row but keep the unnamed draft rows the user is
        // still typing in.
        const drafts = rows.filter((r) => !r.key.trim());
        setSeededFrom(JSON.stringify(saved.attributes ?? {}));
        setAttributeRows([
          ...Object.entries(saved.attributes).map(([key, value]) => ({ key, value })),
          ...drafts,
        ]);
        adopt(saved);
      } catch (err) {
        console.error("[commerce-intake] attributes save failed", err);
        toast.error("Could not save the attributes.");
      }
    },
    [adopt],
  );

  const reprocess = useCallback(async () => {
    const current = assetRef.current;
    if (!current) return;
    setSaving(true);
    try {
      // Notes-flush-before-close (§2 policy 4), then the status write —
      // nothing else. The transition IS the handoff (§2 policy 3).
      if (notesDraft !== current.notes) {
        adopt(await setAssetNotes(current, notesDraft));
      }
      const closed = await finishAsset(assetRef.current ?? current);
      adopt(closed);
      toast.success("Marked captured — the pipeline picks it up from here.");
    } catch (err) {
      console.error("[commerce-intake] reprocess failed", err);
      toast.error("Could not mark the asset captured.");
    } finally {
      setSaving(false);
    }
  }, [notesDraft, adopt]);

  // Surface `matrx-user/commerce-intake-asset`: the asset as shown; notes and attributes
  // through the page's own guarded writers.
  const readAttributes = (value: unknown): Record<string, string | null> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      refuseSurfaceWrite('asset_attributes: send an object like { "Brand": "Dell", "Color": null }.');
    }
    const out: Record<string, string | null> = {};
    const problems: string[] = [];
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (!key.trim()) problems.push("An attribute name is empty.");
      else if (v !== null && typeof v !== "string") problems.push(`The value for "${key}" must be text or null.`);
      else out[key.trim()] = v as string | null;
    }
    if (problems.length) refuseSurfaceWrite(`${problems.join(" ")} Nothing was changed.`);
    return out;
  };
  const getScope = () =>
    createCommerceIntakeAssetScope({
      asset_id: assetId,
      asset_load_status: loading ? "loading" : loadError ? "failed" : asset ? "loaded" : "not_found",
      asset: asset
        ? {
            id: asset.id,
            batch_id: asset.batchId,
            organization_id: asset.organizationId,
            tracking_mode: asset.trackingMode,
            quantity: asset.quantity,
            pipeline_state: asset.pipelineState,
            composition: asset.composition,
            qr_code: asset.qrCode,
            created_at: asset.createdAt,
          }
        : undefined,
      pipeline_state: asset?.pipelineState,
      asset_notes: asset ? notesDraft : undefined,
      asset_attributes: asset?.attributes,
      identifiers: asset
        ? identifiers.map((i) => ({
            id: i.id,
            kind: i.kind,
            value: i.value,
            is_primary: i.isPrimary,
            replaced_at: i.replacedAt,
          }))
        : undefined,
      photo_count: asset ? artifacts.filter((a) => a.kind === "photo" && !a.isDelineator).length : undefined,
      video_count: asset ? artifacts.filter((a) => a.kind === "video").length : undefined,
      voice_note_count: asset ? artifacts.filter((a) => a.kind === "audio").length : undefined,
    });
  const getWriteHandlers = () => ({
    asset_notes: {
      validate: (value: unknown) => {
        if (!assetRef.current) refuseSurfaceWrite("The asset has not loaded yet.");
        if (typeof value !== "string") refuseSurfaceWrite("asset_notes must be text.");
      },
      apply: async (value: unknown) => {
        const current = assetRef.current;
        if (!current) refuseSurfaceWrite("The asset has not loaded yet.");
        const saved = await setAssetNotes(current as IntakeAsset, value as string);
        adopt(saved);
        setNotesDraft(saved.notes);
        return { summary: "Saved the asset's notes.", data: { asset_id: saved.id, notes: saved.notes } };
      },
    },
    asset_attributes: {
      validate: (value: unknown) => {
        if (!assetRef.current) refuseSurfaceWrite("The asset has not loaded yet.");
        readAttributes(value);
      },
      apply: async (value: unknown) => {
        const current = assetRef.current;
        if (!current) refuseSurfaceWrite("The asset has not loaded yet.");
        const changes = readAttributes(value);
        const next: Record<string, string> = { ...(current as IntakeAsset).attributes };
        for (const [key, v] of Object.entries(changes)) {
          if (v === null) delete next[key];
          else next[key] = v;
        }
        const saved = await setAssetAttributes(current as IntakeAsset, next);
        adopt(saved);
        return { summary: "Saved the attributes.", data: { asset_id: saved.id, attributes: saved.attributes } };
      },
    },
  });
  const withSurface = (node: React.ReactNode) => (
    <SurfaceRuntimeProvider
      surfaceName={COMMERCE_INTAKE_ASSET_SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={getWriteHandlers}
    >
      {node}
    </SurfaceRuntimeProvider>
  );

  if (loading) {
    return withSurface(
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError) {
    // The read itself failed — not "no such asset", and not "no identifiers".
    return withSurface(
      <ReadFailure
        error={loadError}
        what="this intake asset"
        onRetry={() => setReloadNonce((n) => n + 1)}
        size="default"
      />
    );
  }
  if (!asset) {
    // A zero-row read is denied / deleted / never-existed / signed-out, and
    // this surface cannot tell them apart — it used to assert the second one.
    // The gate asks the platform and says the true one, with a way forward.
    return withSurface(
      <AccessGate
        token="commerce_intake_asset"
        id={assetId}
        onRetry={() => setReloadNonce((n) => n + 1)}
        fallbackHref="/commerce/intake/assets"
        fallbackLabel="All intake assets"
      />
    );
  }


  return withSurface(
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-safe">
      {/* Media strip */}
      {artifacts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-2">
          {artifacts.map((a) =>
            a.fileId ? (
              <ArtifactTile key={a.id} fileId={a.fileId} kind={a.kind} />
            ) : null,
          )}
        </div>
      )}

      <PanelSection
        title="Item"
        actions={
          <div className="flex gap-2">
            <Button
              icon={<QrCode />}
              variant="outline"
              onClick={() => setPrintOpen(true)}
            >
              Print label
            </Button>
            <Button
              icon={<Camera />}
              variant="outline"
              onClick={() =>
                router.push(`/commerce/intake?asset=${asset.id}`)
              }
            >
              Capture
            </Button>
            <Button
              icon={<RotateCw />}
              variant="primary"
              disabled={saving}
              onClick={() => void reprocess()}
            >
              {asset.pipelineState === "captured" ? "Reprocess" : "Mark captured"}
            </Button>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">QR code</dt>
          <dd>{asset.qrCode ?? "—"}</dd>
          <dt className="text-muted-foreground">State</dt>
          <dd>{humanizeIdentifier(asset.pipelineState) || asset.pipelineState}</dd>
          <dt className="text-muted-foreground">Tracking</dt>
          <dd>
            {asset.trackingMode}
            {asset.trackingMode === "lot" ? ` × ${asset.quantity}` : ""}
          </dd>
          <dt className="text-muted-foreground">Composition</dt>
          <dd>{asset.composition ?? "—"}</dd>
        </dl>
      </PanelSection>

      <PanelSection title="Notes">
        <ProTextarea
          value={notesDraft}
          rows={4}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => void saveNotes()}
          placeholder="Receiver notes — transcripts converge here."
          className="text-base"
        />
        {saving && (
          <p className="text-xs text-muted-foreground">Saving…</p>
        )}
      </PanelSection>

      <PanelSection title="Identifiers">
        {identifiersRefreshError != null && (
          <StaleDataNotice
            hasData={identifiers.length > 0}
            what="this asset's identifiers"
            onRetry={() => void reloadIdentifiers()}
          />
        )}
        {identifiersRefreshError != null && identifiers.length === 0 ? null : identifiers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No identifiers yet — scan a QR or type a serial in capture.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {identifiers.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {humanizeIdentifier(i.kind)}
                </span>
                <span className="min-w-0 truncate font-mono">{i.value}</span>
                {i.isPrimary && !i.replacedAt && (
                  <span className="text-xs text-primary">primary</span>
                )}
                {i.replacedAt ? (
                  <span className="text-xs text-muted-foreground">
                    replaced
                  </span>
                ) : (
                  <Button
                    variant="quiet"
                    className="ml-auto"
                    onClick={() => setPendingRetire(i)}
                  >
                    Retire
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <AssetPipelineResults
        assetId={asset.id}
        instantAnalysis={
          asset.metadata.instant_analysis &&
          typeof asset.metadata.instant_analysis === "object" &&
          !Array.isArray(asset.metadata.instant_analysis)
            ? (asset.metadata.instant_analysis as Record<string, unknown>)
            : null
        }
      />

      <PanelSection title="Attributes">
        <EditableRows<AttributeRow>
          rows={attributeRows}
          onChange={(rows) => void saveAttributes(rows)}
          makeNew={() => ({ key: "", value: "" })}
          addLabel="Add attribute"
          empty="No attributes yet — agents fill these; correct anything here."
          render={(row, update) => (
            <div className="flex min-w-0 gap-2">
              <CommitField
                value={row.key}
                placeholder="Name"
                onCommit={(key) => update({ ...row, key })}
                className="max-w-[40%]"
              />
              <CommitField
                value={row.value}
                placeholder="Value"
                onCommit={(value) => update({ ...row, value })}
              />
            </div>
          )}
        />
      </PanelSection>

      <PrintLabelDialog
        asset={asset}
        identifiers={identifiers}
        open={printOpen}
        onOpenChange={setPrintOpen}
        onChanged={() => void reloadIdentifiers()}
      />

      {/* Replacement lifecycle: retire stamps replaced_at + reason — never a
          delete; the value's slot in the live unique index frees up. */}
      <ConfirmDialog
        open={pendingRetire !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRetire(null);
        }}
        title="Retire this identifier?"
        description={
          pendingRetire
            ? `"${pendingRetire.value}" is marked replaced (kept for history, no longer live). A new label or ID can then take its place.`
            : ""
        }
        confirmLabel="Retire"
        onConfirm={async () => {
          if (!pendingRetire) return;
          try {
            await replaceIdentifier(pendingRetire.id, "retired_manually");
            setPendingRetire(null);
            await reloadIdentifiers();
            toast.success("Identifier retired.");
          } catch (err) {
            console.error("[commerce-intake] identifier retire failed", err);
            toast.error("Could not retire the identifier.");
          }
        }}
      />
    </div>
  );
}

/**
 * One artifact in the strip. A photo shows its thumbnail; audio and video
 * show their media kind (a thumbnail transport cannot draw them — that is
 * how they used to render as "Image failed to load" tiles). Every tile
 * opens the canonical File Preview and carries the universal file menu.
 */
function ArtifactTile({
  fileId,
  kind,
}: {
  fileId: string;
  kind: IntakeArtifact["kind"];
}) {
  const label =
    kind === "video" ? "Video" : kind === "audio" ? "Voice note" : "Photo";
  return (
    <FileRightClickMenu fileId={fileId}>
      <button
        type="button"
        onClick={() => openFilePreview(fileId)}
        aria-label={`Preview ${label.toLowerCase()}`}
        className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-muted"
      >
        {kind === "photo" ? (
          <CaptureThumb fileId={fileId} alt="Photo" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            {kind === "video" ? (
              <Video className="h-6 w-6" />
            ) : (
              <FileAudio className="h-6 w-6" />
            )}
            <span className="text-[10px]">{label}</span>
          </span>
        )}
      </button>
    </FileRightClickMenu>
  );
}
