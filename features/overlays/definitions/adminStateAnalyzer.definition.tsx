"use client";

// The `adminStateAnalyzer` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./adminStateAnalyzer.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AdminStateAnalyzerDefinitionData } from "./adminStateAnalyzer.overlay";

export const adminStateAnalyzerOverlay = defineOverlay<AdminStateAnalyzerDefinitionData>()({
  id: "adminStateAnalyzer",
  label: "Admin State Analyzer",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
