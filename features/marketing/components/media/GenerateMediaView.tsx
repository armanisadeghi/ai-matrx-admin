"use client";

/**
 * GenerateMediaView — order images "off the menu": pick a predetermined image
 * type (hero, share card, infographic…), describe the subject, and the
 * dimensions/style resolve from the brand's websites' media standards + the
 * preset. Brand-level since 2026-08-15: a generated image is a `brand_asset`,
 * owned by the brand and usable by every site under it.
 * Generation runs the SAME headless two-step pipeline as the page image plan
 * (prompt generator → Matrx Image Ultra); results persist immediately as
 * `web.brand_asset` rows (source `generated`) — never a chat-only artifact.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { CaptureThumb } from "@/features/marketing/components/shared/CaptureThumb";
import {
  useBrandAssets,
  useCreateBrandAsset,
} from "@/features/marketing/data/hooks";
import {
  generatePageImageTwoStep,
  type PageImageResult,
} from "@/features/marketing/lib/generate-page-image";
import {
  MEDIA_ORDER_PRESETS,
  buildSiteImageSpec,
  resolveOrderDimensions,
  type MediaOrderPreset,
  type MediaOrderPresetId,
} from "@/features/marketing/lib/media-order-presets";
import { MARKETING_BRAND_ASSETS_SURFACE_NAME } from "@/features/marketing/lib/scopes/brand-assets-scope";
import type { MediaOrderDraft } from "@/features/marketing/lib/site-media-write-targets";
import type { SiteMediaStandards } from "@/features/marketing/data/media-library";
import type { BrandAssetKind } from "@/features/marketing/types";
import { ProTextarea } from "@/components/official/ProTextarea";
import { AGENT_ICON } from "@/components/icons/domain-icons";

/** Which library kind a generated image of each preset lands under. */
const PRESET_ASSET_KIND: Partial<Record<MediaOrderPresetId, BrandAssetKind>> = {
  hero: "hero_image",
  "share-card": "og_image",
};

/**
 * The order form is CONTROLLED by `SiteMediaWorkspace`, which owns the draft so
 * it survives view switches and can be read (`media_order_draft`) and written
 * (`media_order`) by agents on `matrx-user/marketing-brand-assets`. Only the
 * in-flight generation state is local.
 */
export function GenerateMediaView({
  brandId,
  brandName,
  brandUrl,
  organizationId,
  standards,
  resolveStandardsDoor,
  order,
  onOrderChange,
}: {
  brandId: string;
  /** Who the image is FOR — the brand, since the asset belongs to the brand. */
  brandName: string;
  /** The brand's own public URL, when it has one; grounds the image spec. */
  brandUrl: string | null;
  organizationId: string;
  standards: SiteMediaStandards;
  /**
   * THE DOOR LAW: standards are declared per WEBSITE, one level down. When a
   * dimension comes from one, this resolves the website that owns it so the
   * hint can open it instead of naming a place the user has to hunt for.
   */
  resolveStandardsDoor?: (
    slotName: string | null,
  ) => { href: string; siteName: string } | null;
  order: MediaOrderDraft;
  onOrderChange: (
    updater: (current: MediaOrderDraft) => MediaOrderDraft,
  ) => void;
}) {
  const dispatch = useAppDispatch();
  const createAsset = useCreateBrandAsset();
  // access-errors: ok — recent-generations strip; a failed read hides history, and generation itself reports its own errors
  const assetsQuery = useBrandAssets(brandId);

  const [generating, setGenerating] = useState(false);

  const {
    type: presetId,
    brief: subject,
    style: styleOverride,
    width: widthOverride,
    height: heightOverride,
  } = order;
  const patch = (next: Partial<MediaOrderDraft>) =>
    onOrderChange((current) => ({ ...current, ...next }));

  // Not annotated `MediaOrderPreset` on purpose: the const array's literal
  // type keeps `preset.id` a MediaOrderPresetId, which is what indexes
  // PRESET_ASSET_KIND below without a cast.
  const preset =
    MEDIA_ORDER_PRESETS.find((item) => item.id === presetId) ??
    MEDIA_ORDER_PRESETS[0];

  const resolved = useMemo(
    () => resolveOrderDimensions(preset, standards),
    [preset, standards],
  );
  const standardsDoor =
    resolved.source === "standard"
      ? (resolveStandardsDoor?.(resolved.slotName) ?? null)
      : null;
  const width = widthOverride ? Number(widthOverride) : resolved.width;
  const height = heightOverride ? Number(heightOverride) : resolved.height;

  const generatedAssets = useMemo(
    () =>
      (assetsQuery.data ?? [])
        .filter((asset) => asset.source === "generated" && asset.file_id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 12),
    [assetsQuery.data],
  );

  /**
   * Hard ceiling on the whole order. The two-step pipeline's internal waits
   * are bounded, but a hung stream in the execution system can leave its
   * promise pending forever (observed 2026-08-08: server completed both runs
   * and returned the image while the client spinner never resolved). The UI
   * must never spin forever — after this deadline we fail LOUDLY and tell the
   * user the image may still exist server-side.
   */
  const ORDER_DEADLINE_MS = 5 * 60_000;

  const placeOrder = async () => {
    if (!subject.trim()) {
      toast.error("Describe the subject before ordering the image.");
      return;
    }
    setGenerating(true);
    try {
      const spec = buildSiteImageSpec({
        siteName: brandName,
        siteUrl: brandUrl,
        preset,
        subject: subject.trim(),
        dimensions: {
          ...resolved,
          width: Number.isFinite(width) && width > 0 ? width : resolved.width,
          height:
            Number.isFinite(height) && height > 0 ? height : resolved.height,
        },
        standardsNotes: standards.notes || undefined,
      });
      const result: PageImageResult = await Promise.race([
        dispatch(
          generatePageImageTwoStep({
            // The person placed this order.
            initiation: "user",
            spec,
            style: styleOverride.trim() || preset.style,
            surfaceKey: MARKETING_BRAND_ASSETS_SURFACE_NAME,
            // One window per brand's asset desk — a re-order replaces the run
            // in the window the user is already watching.
            liveInstanceId: `brand-assets-image:${brandId}`,
            // The order's real facts by their declared provision names
            // (mapped-only offers — payload-neutral by default).
            facts: {
              image_description: subject.trim(),
              image_type: preset.label,
              site_name: brandName,
              site_url: brandUrl ?? undefined,
              width_px:
                Number.isFinite(width) && width > 0 ? width : resolved.width,
              height_px:
                Number.isFinite(height) && height > 0 ? height : resolved.height,
              file_format: resolved.format ?? undefined,
              site_media_rules: standards.notes || undefined,
            },
          }),
        ),
        new Promise<PageImageResult>((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: false,
                step: "image",
                message:
                  "The run did not report back within 5 minutes. The image may still have been generated — check the Library shortly or retry.",
              }),
            ORDER_DEADLINE_MS,
          ),
        ),
      ]);
      if (!result.ok) {
        toast.error(
          result.step === "mandate"
            ? `No agent is bound to "${result.mandateKey}"`
            : result.step === "prompt"
              ? "Generation failed at the prompt step"
              : "Generation failed at the image step",
          { description: result.message },
        );
        return;
      }
      await createAsset.mutateAsync({
        organizationId,
        brandId,
        kind: PRESET_ASSET_KIND[preset.id] ?? "image",
        sourceUrl: null,
        fileId: result.fileId,
        title: subject.trim().slice(0, 120),
        notes: `AI-generated ${preset.label.toLowerCase()} (${width}×${height}) for ${brandName}.`,
        isPrimary: false,
        source: "generated",
      });
      toast.success("Image generated and saved to the brand library");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard title="Pick the type">
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {MEDIA_ORDER_PRESETS.map((item) => {
            const dims = resolveOrderDimensions(item, standards);
            const active = item.id === presetId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => patch({ type: item.id })}
                aria-pressed={active}
                title={item.description}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="type-title text-foreground">
                    {item.label}
                  </span>
                  {dims.source === "standard" ? (
                    <Badge
                      variant="outline"
                      className="text-success-ink"
                      title={`Dimensions from your “${dims.slotName}” standard`}
                    >
                      std
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 type-meta tabular-nums text-muted-foreground">
                  {dims.width}×{dims.height}
                  {dims.format ? ` · ${dims.format}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Describe the subject"
        about="Dimensions come from the matching media standard on the brand's websites, or the preset default when none matches. Standards are declared per website, in that site's Media, Standards view; override only when this order is special."
      >
        <div className="space-y-3 p-3">
          <ProTextarea
            value={subject}
            onChange={(event) => patch({ brief: event.target.value })}
            minHeight={64}
            maxHeight={160}
            placeholder={`What should this ${preset.label.toLowerCase()} show?`}
            aria-label="Subject"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="type-label">Style (optional override)</span>
              <ProInput
                value={styleOverride}
                onChange={(event) => patch({ style: event.target.value })}
                placeholder={preset.style}
                aria-label="Style"
              />
            </label>
            <label className="block space-y-1">
              <span className="type-label">Width</span>
              {/* ui-exception: a pixel count is a raw number, not writing */}
              <Input
                value={widthOverride}
                onChange={(event) =>
                  patch({ width: event.target.value.replace(/\D/g, "") })
                }
                placeholder={String(resolved.width)}
                inputMode="numeric"
                aria-label="Width"
              />
            </label>
            <label className="block space-y-1">
              <span className="type-label">Height</span>
              {/* ui-exception: a pixel count is a raw number, not writing */}
              <Input
                value={heightOverride}
                onChange={(event) =>
                  patch({ height: event.target.value.replace(/\D/g, "") })
                }
                placeholder={String(resolved.height)}
                inputMode="numeric"
                aria-label="Height"
              />
            </label>
          </div>
          <p className="type-secondary text-muted-foreground">
            {resolved.source === "standard" ? (
              <>
                Size from the “{resolved.slotName}” standard
                {standardsDoor ? (
                  <>
                    {" "}on{" "}
                    <Link
                      href={standardsDoor.href}
                      className="text-foreground underline underline-offset-2 hover:text-primary"
                    >
                      {standardsDoor.siteName}
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              "No matching media standard · preset default size"
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button
              variant="primary"
              disabled={generating || createAsset.isPending}
              onClick={() => void placeOrder()}
            >
              {generating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <AGENT_ICON className="mr-1.5 h-4 w-4" />
              )}
              {generating ? "Generating…" : "Order this image"}
            </Button>
            <span className="type-meta text-muted-foreground">
              Lands in the brand library
            </span>
          </div>
        </div>
      </SectionCard>

      {generatedAssets.length > 0 ? (
        <SectionCard
          title="Recently generated"
          headerExtra={
            <span className="type-meta tabular-nums text-muted-foreground">{generatedAssets.length}</span>
          }
        >
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {generatedAssets.map((asset) => (
              <CaptureThumb
                key={asset.id}
                fileId={asset.file_id!}
                alt={asset.title ?? "Generated image"}
                aspectClassName="aspect-[4/3]"
                footer={
                  <p
                    className="truncate px-1.5 py-1 type-meta text-muted-foreground"
                    title={asset.title ?? undefined}
                  >
                    {asset.title ?? "Generated image"}
                  </p>
                }
              />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
