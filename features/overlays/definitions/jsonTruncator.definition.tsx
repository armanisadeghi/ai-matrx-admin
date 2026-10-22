"use client";

// The `jsonTruncator` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./jsonTruncator.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { JsonTruncatorDefinitionData } from "./jsonTruncator.overlay";

export const jsonTruncatorOverlay = defineOverlay<JsonTruncatorDefinitionData>()({
  id: "jsonTruncator",
  label: "Json Truncator",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { input: null },
    windowId: "json-truncator",
  },
  link: {
    key: "json_truncator",
    hydrate: (ctx) => import("./jsonTruncator.link").then((m) => m.hydrate(ctx)),
  },
});
