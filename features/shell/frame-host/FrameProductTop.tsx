"use client";

// THE TOP OF THE PRODUCT'S SIDEBAR IN THE FRAME (Arman, 2026-10-22: every product sidebar carries the
// conversation sidebar's top — Search, a few chosen related places ›, "More" with every other place
// and "Edit sidebar…"; common-docs projects/app-frame/VISION.md). The component is the shared one
// (`ProductSidebarTop`, @ai-matrx/design-system/item); this file only hands it the frame's data:
//
//   places      the product's declared related places (relatedPlaces.ts), each another product
//               (its live entry; its own menu as the row's flyout) or a shared page (Agents…)
//   chosen      the layered knob `shell.sidebar.places` (system → organization → person), else the
//               first DEFAULT_PLACES_ABOVE_MORE declared places
//   More        every other place, then — when the body is a module menu or a page's sidebar — the
//               product's own other pages under its name (they were the "product rows" strip)
//   Search      finds any of those places and the product's own pages; Enter opens the first
//
// "Edit sidebar…" changes THIS product's entry in the person's own map (setUserKnobMapEntry keeps
// their other entries). The resolver answers the nearest rung's WHOLE map, so once a person has a map
// an organization's entries for other products stop reaching them (they get the declared default)
// — open item in common-docs projects/app-frame/SIDEBARS.md § Known gaps.
import { useState } from "react";
import { openOutbound } from "@ai-matrx/kit/outbound";
import {
  ProductSidebarTop,
  SidebarEditDialog,
  SidebarPlacesChooser,
  type SidebarMoreGroup,
  type SidebarPlace,
} from "@ai-matrx/design-system/item";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { invalidateEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs";
import { setUserKnobMapEntry } from "@/lib/scoped-config/service";
import {
  PAGE_PLACES,
  SIDEBAR_PLACES_KNOB,
  chosenPlacesAboveMore,
  relatedPlacesOf,
  type PagePlaceId,
} from "@/features/shell/frame/relatedPlaces";
import type { FrameProduct } from "@/features/shell/frame/types";

const PAGE_PREFIX = "page:";

/** A product's live menu as places (its pages), ids prefixed so they never meet a place id. */
export function productPagePlaces(product: FrameProduct, prefix: string): SidebarPlace[] {
  return product.menu.flatMap((s) =>
    s.items.map((i) => ({
      id: `${prefix}/${i.id}`,
      label: i.label,
      icon: i.icon,
      href: i.href ?? `${product.homeHref}/${i.id}`,
    })),
  );
}

/** The declared related places of `product`, resolved against the live products. */
export function resolveRelatedPlaces(product: FrameProduct, products: readonly FrameProduct[]): SidebarPlace[] {
  return relatedPlacesOf(product.id).flatMap((ref): SidebarPlace[] => {
    if (ref.startsWith(PAGE_PREFIX)) {
      const page = PAGE_PLACES[ref.slice(PAGE_PREFIX.length) as PagePlaceId];
      return page ? [{ id: ref, label: page.label, icon: page.icon, href: page.href }] : [];
    }
    const other = products.find((p) => p.id === ref);
    if (!other || other.id === product.id) return [];
    const pages = productPagePlaces(other, other.id);
    return [
      {
        id: other.id,
        label: other.name,
        icon: other.icon,
        href: other.homeHref,
        // A product with more than its home opens a flyout of its own pages (the product first).
        children: pages.length > 1 ? pages : undefined,
      },
    ];
  });
}

export function FrameProductTop({
  product,
  products,
  ownPagesInMore,
  onGo,
}: {
  product: FrameProduct;
  products: readonly FrameProduct[];
  /** The body is a module menu or a page's sidebar: the product's own pages go under More. */
  ownPagesInMore: boolean;
  onGo: (href: string) => void;
}) {
  const knob = useSessionKnob(SIDEBAR_PLACES_KNOB);
  const organizationId = useAppSelector((s) => s.appContext?.organization_id ?? null);
  const userId = useAppSelector((s) => s.userAuth?.id ?? null);
  // A saved choice shows at once; the write runs behind it and a refusal puts it back.
  const [ownChoice, setOwnChoice] = useState<{ productId: string; ids: string[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const places = resolveRelatedPlaces(product, products);
  const chosen =
    ownChoice?.productId === product.id ? ownChoice.ids : chosenPlacesAboveMore(product.id, knob);
  const ownPages = productPagePlaces(product, "own");
  const moreGroups: SidebarMoreGroup[] =
    ownPagesInMore && ownPages.length > 0 ? [{ id: "own", label: product.name, places: ownPages }] : [];

  const open = (place: SidebarPlace) => {
    if (!place.href) return;
    setQuery("");
    if (/^https?:\/\//.test(place.href)) openOutbound(place.href, "_blank", "noopener");
    else onGo(place.href);
  };

  const save = () => {
    const ids = draft;
    const previous = chosen;
    setEditing(false);
    if (!userId || !organizationId) {
      toast.error("Sign in and pick an organization to save your sidebar.");
      return;
    }
    setOwnChoice({ productId: product.id, ids });
    void setUserKnobMapEntry({
      feature: SIDEBAR_PLACES_KNOB.feature,
      key: SIDEBAR_PLACES_KNOB.key,
      entryKey: product.id,
      entryValue: ids,
      userId,
      organizationId,
      note: "Edit sidebar",
    }).then((result) => {
      if (result.ok) {
        invalidateEffectiveKnob(SIDEBAR_PLACES_KNOB);
        return;
      }
      setOwnChoice({ productId: product.id, ids: previous });
      toast.error(`Sidebar not saved: ${result.reason}`);
    });
  };

  return (
    <>
      <ProductSidebarTop
        sourceFeature="frame-sidebar"
        search={{
          value: query,
          onChange: setQuery,
          ariaLabel: `Search ${product.name}`,
          pool: ownPages,
        }}
        places={places}
        chosen={chosen}
        onOpenPlace={open}
        moreGroups={moreGroups}
        onEditSidebar={
          userId
            ? () => {
                setDraft(chosen);
                setEditing(true);
              }
            : undefined
        }
      />
      <SidebarEditDialog open={editing} onOpenChange={setEditing} onSave={save}>
        <SidebarPlacesChooser places={places} chosen={draft} onChange={setDraft} />
      </SidebarEditDialog>
    </>
  );
}
