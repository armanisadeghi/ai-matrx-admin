"use client";

/**
 * The templates of a file home's "Start a new …" band: a row of tiles (Google shows Blank plus
 * about six) and the full gallery opened in place by "Template gallery". Generic over the kind, so
 * the workbooks, documents and any later home use the same wiring: `<StartBand {...useHomeTemplates(kind)} />`.
 */
import { useEffect, useState } from "react";

import { listTemplates } from "../template-service";
import type { TemplateKind, TemplateSummary } from "../types";
import { TemplateGallery, useCreateFromTemplate } from "./TemplateGallery";
import { TemplateThumb } from "./TemplateThumb";

const BAND_TILES = 4;

export function useHomeTemplates(kind: TemplateKind) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TemplateSummary[] | null>(null);
  const { create, busyId } = useCreateFromTemplate();

  useEffect(() => {
    let cancelled = false;
    listTemplates(kind, { limit: BAND_TILES })
      .then((r) => !cancelled && setRows(r))
      .catch((e) => {
        console.warn(`[templates] ${kind} band did not load`, e);
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const tiles =
    rows && rows.length > 0
      ? rows.slice(0, BAND_TILES).map((t) => (
          <TemplateThumb
            key={t.id}
            template={t}
            busy={busyId === t.id}
            onSelect={(tpl) => void create(tpl)}
            className="w-28 shrink-0 sm:w-36"
          />
        ))
      : null;

  return {
    templates: tiles ? <>{tiles}</> : null,
    gallery: <TemplateGallery kind={kind} />,
    galleryOpen: open,
    onGalleryOpenChange: setOpen,
  };
}
