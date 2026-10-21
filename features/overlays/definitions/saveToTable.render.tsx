"use client";

/**
 * The `saveToTable` overlay — THE one "Save to a table". The body is the chat package's
 * (`@ai-matrx/chat/window-panels/windows/tables/SaveToTableWindow`, the same one Matrx 2 opens): it
 * mounts records-ui's SaveToTable. This file only binds the web's four host ports to it and draws
 * the web's dialog around it:
 *   · where a new table is born — `whereANewTableIsBorn` (the organization the person is making it
 *     in; closing the organization picker is "not now");
 *   · the store config — `useAppRecordsConfig` (the web's data source, actor and realtime);
 *   · Open — the router, to `/data/<id>`;
 *   · the records screens — through the web's ONE lazy edge to the records-ui root (`recordsUiLazy`).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import {
  SaveToTableBody,
  type SaveToTableBirth,
  type SaveToTableScreens,
} from "@ai-matrx/chat/window-panels/windows/tables/SaveToTableWindow";
import { RecordsMount, SaveToTable } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { whereANewTableIsBorn } from "@/features/data-tables/data-source/where-a-table-is-born";
import { RECORDS_NOTIFY } from "@/features/unified-data/recordsNotify";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { disposeSaveToTableCallbackGroup, emitSaveToTableEvent } from "@/features/overlays/definitions/callbacks/saveToTable";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

const WEB_SCREENS = { RecordsMount, SaveToTable } as unknown as SaveToTableScreens;

/** The web's placement rule as the body's birth port; a closed organization picker is "not now". */
export async function webWhereBorn(organizationId: string | null): Promise<SaveToTableBirth> {
  try {
    const born = await whereANewTableIsBorn(organizationId);
    return born.ok ? { ok: true, organizationId: born.home.organizationId } : { ok: false, error: born.error };
  } catch {
    return { ok: false, cancelled: true };
  }
}

type Grid = { headers: string[]; rows: string[][]; from?: string };

function gridOf(value: unknown): Grid | null {
  const grid = value as { headers?: unknown; rows?: unknown; from?: unknown } | null | undefined;
  if (!grid || !Array.isArray(grid.headers) || !Array.isArray(grid.rows)) return null;
  return { headers: grid.headers as string[], rows: grid.rows as string[][], ...(typeof grid.from === "string" ? { from: grid.from } : {}) };
}

const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

export default function OverlayRender({ data: overlayData, close }: OverlayRenderProps) {
  const data = (overlayData ?? {}) as Record<string, unknown>;
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const callbackGroupId = text(data.callbackGroupId);
  const onClose = useCallback(() => close(), [close]);
  useEffect(() => () => disposeSaveToTableCallbackGroup(callbackGroupId), [callbackGroupId]);
  const recordsHost = useMemo(() => ({ Link, density: "condensed" as const, notify: RECORDS_NOTIFY }), []);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Save to a table</DialogTitle>
          <DialogDescription>Make a new table from these rows, or add them to a table you already have.</DialogDescription>
        </DialogHeader>
        <SaveToTableBody
          text={text(data.text)}
          value={data.value}
          hasValue={data.hasValue === true}
          grid={gridOf(data.grid)}
          title={text(data.title)}
          shapeIndex={typeof data.shapeIndex === "number" ? data.shapeIndex : 0}
          organizationId={text(data.organizationId)}
          makeAtOnce={data.makeAtOnce === true}
          userId={userId ?? null}
          whereBorn={webWhereBorn}
          useRecordsConfig={useAppRecordsConfig}
          recordsHost={recordsHost as never}
          screens={WEB_SCREENS}
          refusalAction={<ErrorAlchemyMenu />}
          onSaved={(tableId, how) => void emitSaveToTableEvent(callbackGroupId, { type: "saved", tableId, how, tableName: null })}
          onOpenTable={(tableId) => {
            onClose();
            router.push(`/data/${tableId}`);
          }}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
