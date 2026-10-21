"use client";

/**
 * `usePageGuidanceRecord(read)` — the record in view, handed to the page guide.
 *
 * The page guide (`@ai-matrx/chat` ScrollAssistantLauncher) already runs on
 * the MANDATE DOOR of whichever rung answers — page → module → system, from
 * `ambientAssistantMandateChain(pathname)` — and sends route/module/section/
 * org at launch. The record the person is looking at changes after launch, so
 * it rides the first turn through the host-values channel instead: this
 * registers one submit-time provider per rung of this page's chain, and only
 * the rung that answered has a conversation carrying its key, so exactly one
 * fires. Every page-guidance provision declares `primary_record_id / _type /
 * _title` (mapped-only), typed here against `ambient.page_guidance`.
 *
 * No chat package change needed: the chain helper is already exported.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ambientAssistantMandateChain } from "@ai-matrx/chat/agents/components/ambient-assistant/ambientAssistantMandates";
import { provideHostValues, type HostValuesFor, type ProvideOptions } from "@ai-matrx/chat/mandates/host-values/host-values";

export interface PageGuidanceRecord {
  id: string | null | undefined;
  type: string;
  title?: string | null;
}

/**
 * `options.everyTurn`: every turn goes through the mandate door with the
 * record id, so the server re-resolves the record (Education record screens:
 * the `study_record` packet) and the guide always reads the record on screen.
 */
export function usePageGuidanceRecord(
  read: () => PageGuidanceRecord | null,
  options: Pick<ProvideOptions, "everyTurn"> = {},
): void {
  const everyTurn = Boolean(options.everyTurn);
  const pathname = usePathname() ?? "/";
  const latest = useRef(read);
  useEffect(() => {
    latest.current = read;
  });
  useEffect(() => {
    const chain = ambientAssistantMandateChain(pathname);
    const values = (): HostValuesFor<"ambient.page_guidance"> => {
      const record = latest.current();
      if (!record?.id) return {};
      return {
        primary_record_id: record.id,
        primary_record_type: record.type,
        primary_record_title: record.title ?? null,
      };
    };
    const keys = [...new Set([chain.page, chain.module, chain.system].filter((k) => k != null))];
    const releases = keys.map((key) =>
      provideHostValues(key, "ambient.page_guidance", values, { everyTurn }),
    );
    return () => releases.forEach((release) => release());
  }, [pathname, everyTurn]);
}
