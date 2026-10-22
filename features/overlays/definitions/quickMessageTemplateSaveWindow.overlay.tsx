"use client";

import type { MessageRole } from "@/features/message-templates/types/message-templates-db";
import type { UntypedOverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickMessageTemplateSaveWindow" as const;

export interface OpenQuickMessageTemplateSaveWindowOptions {
  initialContent: string;
  defaultName?: string;
  defaultRole?: MessageRole;
}

const opener = appOpener<OpenQuickMessageTemplateSaveWindowOptions>(OVERLAY_ID);

export const useOpenQuickMessageTemplateSaveWindow = opener.useOpen;

export const QuickMessageTemplateSaveWindowController = opener.Controller;

export type QuickMessageTemplateSaveWindowDefinitionData = OpenQuickMessageTemplateSaveWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickMessageTemplateSaveWindow: UntypedOverlayWire;
  }
}
