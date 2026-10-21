"use client";

/**
 * The brand palette: the brand's own colors as tall side-by-side swatches (primary first), each with a human
 * name and its hex on hover / click-to-copy, and its fonts as real type specimens. Colors read from the site and
 * not yet confirmed show as "We found your palette" with Yes / Not ours on each — the same answer path as the
 * Identity page (`useVisualSuggestionAnswer`). Nothing here is ever chosen for the person.
 */
import { useEffect, useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { useVisualSuggestionAnswer } from "@/features/marketing/brand-guide/BrandVisualSuggestions";
import { colorName, prefersDarkText } from "@/features/marketing/lib/color-name";
import { isJsonRecord, type BrandAsset } from "@/features/marketing/types";

export interface PaletteColor {
  asset: BrandAsset;
  value: string;
}

const MAX_COLORS = 8;
const MAX_FONTS = 4;

/** Read from the site and waiting for the person's Yes. */
function isSuggestion(asset: BrandAsset): boolean {
  return asset.source === "discovered" && !asset.confirmed_at;
}

function fontFamily(asset: BrandAsset): string {
  const family = isJsonRecord(asset.data) ? asset.data.family : null;
  return (typeof family === "string" && family) || asset.title || asset.source_url || "";
}

const SYSTEM_FONTS = new Set(["arial", "helvetica", "georgia", "times new roman", "verdana", "system-ui", "sans-serif", "serif", "monospace", "inter"]);
const requestedFonts = new Set<string>();

/** Loads a Google Fonts family once, on demand, so the specimen shows the real face. */
function useGoogleFont(family: string) {
  useEffect(() => {
    const key = family.trim().toLowerCase();
    if (!key || SYSTEM_FONTS.has(key) || requestedFonts.has(key) || typeof document === "undefined") return;
    requestedFonts.add(key);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, "+")}&display=swap`;
    document.head.appendChild(link);
  }, [family]);
}

function AnswerButtons({ asset, label, onAnswer, busy }: { asset: BrandAsset; label: string; onAnswer: (asset: BrandAsset, answer: "yes" | "no") => void; busy: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Button variant="quiet" icon={<Check />} aria-label={`Yes, ${label} is ours`} title="Yes, ours" disabled={busy} onClick={() => onAnswer(asset, "yes")} />
      <Button variant="quiet" icon={<X />} aria-label={`${label} is not ours`} title="Not ours" disabled={busy} onClick={() => onAnswer(asset, "no")} />
    </span>
  );
}

function Swatch({ color, canEdit, busy, onAnswer }: { color: PaletteColor; canEdit: boolean; busy: boolean; onAnswer: (asset: BrandAsset, answer: "yes" | "no") => void }) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const hex = color.value.toUpperCase();
  const name = colorName(color.value) ?? hex;
  const dark = prefersDarkText(color.value);
  const suggestion = isSuggestion(color.asset);
  return (
    <li className="flex min-w-0 basis-1/3 flex-col sm:basis-0 sm:flex-1">
      <button
        type="button"
        onClick={() => void copyText(hex, `${hex} copied`)}
        title={`${name} · ${hex} · click to copy`}
        aria-label={`Copy ${name} ${hex}`}
        className="group relative h-24 w-full sm:h-40"
        /* ui-exception: a swatch renders the brand's own color value; its label color is picked for contrast on that color */
        style={{ background: color.value, color: dark ? "rgb(0 0 0 / 0.78)" : "rgb(255 255 255 / 0.92)" }}
      >
        <Copy className="absolute right-2 top-2 size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
      </button>
      <span className="flex min-h-11 min-w-0 items-center gap-1 border-t border-border bg-card px-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate type-secondary font-medium text-foreground">{name}</span>
          <span className="block truncate font-mono type-meta text-muted-foreground">{hex}</span>
        </span>
        {suggestion && canEdit ? <AnswerButtons asset={color.asset} label={name} busy={busy} onAnswer={onAnswer} /> : null}
      </span>
    </li>
  );
}

function FontSpecimen({ asset, canEdit, busy, onAnswer }: { asset: BrandAsset; canEdit: boolean; busy: boolean; onAnswer: (asset: BrandAsset, answer: "yes" | "no") => void }) {
  const family = fontFamily(asset);
  useGoogleFont(family);
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-3xl leading-none text-foreground" style={{ fontFamily: `"${family}", inherit` }} aria-hidden="true">
        Aa
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate type-title text-foreground" style={{ fontFamily: `"${family}", inherit` }}>
          {family}
        </span>
        <span className="block truncate type-meta text-muted-foreground">{isSuggestion(asset) ? "Found on your site" : "Brand font"}</span>
      </span>
      {isSuggestion(asset) && canEdit ? <AnswerButtons asset={asset} label={family} busy={busy} onAnswer={onAnswer} /> : null}
    </li>
  );
}

export function BrandPalette({
  colors,
  fonts,
  canEdit,
  onOpen,
}: {
  /** Brand colors, primary first. */
  colors: PaletteColor[];
  fonts: BrandAsset[];
  canEdit: boolean;
  /** Opens the brand's assets. */
  onOpen: () => void;
}) {
  const answer = useVisualSuggestionAnswer();
  const [busy, setBusy] = useState(false);
  const onAnswer = (asset: BrandAsset, choice: "yes" | "no") => {
    setBusy(true);
    answer(asset, choice)
      .catch((error: unknown) => toast.error(extractErrorMessage(error)))
      .finally(() => setBusy(false));
  };
  const shownColors = colors.slice(0, MAX_COLORS);
  const shownFonts = fonts.filter((font) => fontFamily(font)).slice(0, MAX_FONTS);
  const toConfirm = [...shownColors.map((c) => c.asset), ...shownFonts].filter(isSuggestion).length;
  const empty = shownColors.length === 0 && shownFonts.length === 0;

  return (
    <SectionCard
      title={toConfirm ? "We found your palette" : "Brand palette"}
      anchor="overview-palette"
      about="The brand's colors and fonts. Click a color to copy it. Colors read from your site wait for your Yes."
      headerExtra={toConfirm ? <span className="type-meta text-muted-foreground">{toConfirm} to confirm</span> : undefined}
      action={{ label: "All assets", onClick: onOpen }}
    >
      {empty ? (
        <div className="flex min-h-[52px] items-center gap-2 px-3">
          <span className="flex-1 type-secondary text-muted-foreground">No colors or fonts yet</span>
          <Button variant="outline" icon={<Plus />} onClick={onOpen}>
            Add
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 p-3">
          {shownColors.length ? (
            <ul className="flex flex-wrap overflow-hidden rounded-xl border border-border shadow-sm sm:flex-nowrap">
              {shownColors.map((color) => (
                <Swatch key={color.asset.id} color={color} canEdit={canEdit} busy={busy} onAnswer={onAnswer} />
              ))}
            </ul>
          ) : null}
          {shownFonts.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {shownFonts.map((font) => (
                <FontSpecimen key={font.id} asset={font} canEdit={canEdit} busy={busy} onAnswer={onAnswer} />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
