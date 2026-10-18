"use client";
// features/unified-data/components/useCollapsedCustomFieldsDoor.ts
//
// THE AGENT'S DOOR WHILE THE SECTION IS COLLAPSED (final review 4a, 2026-10-18).
//
// A quick look keeps the records-ui screen unloaded until she opens it, and records-ui is what
// registers `custom_fields_add` / `custom_fields_set` with the page's agents. So until "Show" the
// agent had neither the fields it could read nor the write targets. This registers a stand-in door
// WITHOUT mounting the screen: its state is the kept read the line already holds (the same fields
// the real section would show), and its write handlers OPEN the section — which loads the screen and
// registers the real door — wait for that door, then hand the work to it. The real door still owns
// every check and every write; this one only opens it.
import { useEffect, useRef } from "react";
import {
  listCustomFieldsDoors,
  registerCustomFieldsDoor,
  type CustomFieldAddRequest,
  type CustomFieldsAgentDoor,
} from "@ai-matrx/chat/surfaces/runtime/custom-field-targets";
import { useSurfaceDormant } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { customFieldsScopeFromRecord } from "@/features/unified-data/customFieldsRead";

const REAL_DOOR_WAIT_MS = 15_000;

async function realDoorAfterOpening(
  stand: CustomFieldsAgentDoor,
  open: () => void,
  waitMs: number,
): Promise<CustomFieldsAgentDoor | null> {
  open();
  const until = Date.now() + waitMs;
  for (;;) {
    const real = listCustomFieldsDoors().find(
      (d) => d !== stand && d.entityToken === stand.entityToken && d.recordId === stand.recordId,
    );
    if (real) return real;
    if (Date.now() >= until) return null;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

const NOT_LOADED = "The custom fields did not finish loading, so nothing was changed. Try again.";

export function useCollapsedCustomFieldsDoor({
  enabled,
  entityToken,
  recordId,
  entityLabel,
  record,
  open,
  waitMs = REAL_DOOR_WAIT_MS,
}: {
  /** True only while the line is collapsed and the record's fields have been read. */
  enabled: boolean;
  entityToken: string;
  recordId: string;
  entityLabel: string | null;
  /** The kept `custom.entity_record_read` answer. */
  record: unknown;
  /** Opens the section (the same act as "Show"). */
  open: () => void;
  waitMs?: number;
}): void {
  const dormant = useSurfaceDormant();
  const latest = useRef({ record, entityLabel, open, dormant });
  useEffect(() => {
    latest.current = { record, entityLabel, open, dormant };
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const stand: CustomFieldsAgentDoor = {
      isLive: () => !latest.current.dormant,
      entityToken,
      recordId,
      state: () => ({
        entityToken,
        recordId,
        entityLabel: latest.current.entityLabel,
        // Who may add is the real section's answer; this door does not guess it.
        mayAdd: null,
        refusal: null,
        fields: customFieldsScopeFromRecord(entityToken, recordId, latest.current.record)[0]?.fields.map((f) => ({
          key: f.key,
          label: f.name,
          type: f.type,
          value: f.value,
        })) ?? [],
        types: [],
      }),
      // The real door checks the whole request once it exists; nothing is judged here.
      check: () => [],
      addField: async (request: CustomFieldAddRequest) => {
        const real = await realDoorAfterOpening(stand, () => latest.current.open(), waitMs);
        if (!real) return { ok: false, message: NOT_LOADED };
        const problems = real.check([request]);
        if (problems.length > 0) return { ok: false, message: problems.join(" ") };
        return real.addField(request);
      },
      checkValues: () => [],
      setValues: async (values) => {
        const real = await realDoorAfterOpening(stand, () => latest.current.open(), waitMs);
        if (!real?.setValues) return { ok: false, message: NOT_LOADED };
        const problems = real.checkValues?.(values) ?? [];
        if (problems.length > 0) return { ok: false, message: problems.join(" ") };
        return real.setValues(values);
      },
    };
    return registerCustomFieldsDoor(stand);
  }, [enabled, entityToken, recordId, waitMs]);
}
