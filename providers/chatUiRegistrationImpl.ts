// providers/chatUiRegistrationImpl.ts
//
// The implementations behind chatUiRegistration.ts's lazily-loaded component slots. Loaded
// through that file's ONE `import()` the first time any of these slots renders — never in a
// route's first load (THE FRAGMENTATION LAW: one impl module per registration file, one async
// edge). Import this module from nowhere else.

import type HtmlPreviewFullScreenEditorType from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";
import { AgentEditAccessBadge } from "@/features/agents/components/context-policies-management/AgentEditAccessControl";
import { DataRefPreviewContent } from "@/features/agents/components/previews/DataRefHoverPreview";
import type { ComponentProps, ComponentType } from "react";
import { clientLazy } from "@ai-matrx/kit/client-lazy";
import { SlotLoadingBlock, SlotLoadingInline, SlotLoadingPanel } from "@/providers/chatSlotLazy";
import type { ToolResultCanvasOpener as ToolResultCanvasOpenerType } from "@/features/canvas/tool-results/ToolResultCanvasOpener";
import type { CloudBrowserHandoffCanvasOpener as CloudBrowserHandoffCanvasOpenerType } from "@/features/cloud-browser/components/CloudBrowserHandoffCanvasOpener";
import { SimpleTerminal } from "@/features/code/terminal/SimpleTerminal";
import { ServerNotes } from "@/components/official/ServerNotes";
import { ReferenceCopyButton } from "@/features/matrx-envelope/components/ReferenceCopyButton";
import { MandateNotesPanel } from "@/features/mandates/components/MandateNotesPanel";
import { SurfaceBoundAgentsList } from "@/features/surfaces/components/bind/SurfaceBoundAgentsList";
import { AddToMyMenuTile } from "@/features/shell/shell-layout/editor/AddToMyMenu";
import type { ProposedDirectivesZone as ProposedDirectivesZoneType } from "@/features/matrx-envelope/components/ProposedDirectivesZone";
import { EntityCommentPopover } from "@/components/comments/EntityCommentPopover";
import MatrxEnvelopeBlock from "@/features/matrx-envelope/MatrxEnvelopeBlock";
import { AgentOptionsMenu } from "@/features/agents/components/shared/AgentOptionsMenu";
import { AgentSaveStatus } from "@/features/agents/components/shared/AgentSaveStatus";
import { AgentSaveTapButton } from "@/features/agents/components/shared/AgentSaveTapButton";
import { AgentPeekDuplicateButton } from "@/features/agents/components/shared/AgentPeekDuplicateButton";
import type { CustomDataBindingSummary as CustomDataBindingSummaryType } from "@/features/agents/components/variables-management/custom-data/CustomDataBindingSummary";
import type { CustomDataBindingPreview as CustomDataBindingPreviewType } from "@/features/agents/components/variables-management/custom-data/CustomDataBindingPreview";
import { Cost } from "@/components/cost/Cost";
import { CostDoor } from "@/components/cost/CostDoor";
import type { CanvasItemCard as CanvasItemCardType } from "@/features/canvas/components/CanvasItemCard";
import type { NoteEditorCore as NoteEditorCoreType } from "@/features/notes/components/NoteEditorCore";
import { loadCodeEditHistoryThunk } from "@/features/code/redux/codeEditHistoryHydration";
import { reconcileMessagesArtifacts } from "@/features/canvas/materialization/reconcileArtifacts";
import { adoptCloudBrowserRunFromStream } from "@/features/cloud-browser/redux/adoptRunFromStream";
import { dispatchWarRoomTool } from "@/features/agents/war-room-tools/dispatcher/dispatch-war-room-tool.thunk";
import { dispatchWarRoomMasterTool } from "@/features/agents/war-room-master-tools/dispatcher/dispatch-war-room-master-tool.thunk";

// HEAVY MEMBERS keep their own boundary. This module evaluates for EVERY lazy chat slot, so a
// static import of anything heavy here loads it the first time ANY slot renders (the Notes
// editor, the canvas column and the content-ir registry all rode in on /chat/new before input —
// pnpm check:smoke). Each loads on the click/render of the surface that shows it; the same
// loading footprint as its slot. Guard: providers/__tests__/a-chat-impl-module-never-*.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heavy = <C extends ComponentType<any>>(load: () => Promise<C>, loading?: ComponentType) =>
  clientLazy<ComponentProps<C> & object>(load as never, loading ? { loading } : {}) as unknown as C;
const HtmlPreviewFullScreenEditor = heavy<typeof HtmlPreviewFullScreenEditorType>(
  () => import("@/features/html-pages/components/HtmlPreviewFullScreenEditor").then((m) => m.default),
);
const ToolResultCanvasOpener = heavy<typeof ToolResultCanvasOpenerType>(
  () => import("@/features/canvas/tool-results/ToolResultCanvasOpener").then((m) => m.ToolResultCanvasOpener),
);
const CloudBrowserHandoffCanvasOpener = heavy<typeof CloudBrowserHandoffCanvasOpenerType>(
  () => import("@/features/cloud-browser/components/CloudBrowserHandoffCanvasOpener").then((m) => m.CloudBrowserHandoffCanvasOpener),
);
const ProposedDirectivesZone = heavy<typeof ProposedDirectivesZoneType>(
  () => import("@/features/matrx-envelope/components/ProposedDirectivesZone").then((m) => m.ProposedDirectivesZone),
);
const CustomDataBindingSummary = heavy<typeof CustomDataBindingSummaryType>(
  () => import("@/features/agents/components/variables-management/custom-data/CustomDataBindingSummary").then((m) => m.CustomDataBindingSummary),
  SlotLoadingInline,
);
const CustomDataBindingPreview = heavy<typeof CustomDataBindingPreviewType>(
  () => import("@/features/agents/components/variables-management/custom-data/CustomDataBindingPreview").then((m) => m.CustomDataBindingPreview),
  SlotLoadingBlock,
);
const CanvasItemCard = heavy<typeof CanvasItemCardType>(
  () => import("@/features/canvas/components/CanvasItemCard").then((m) => m.CanvasItemCard),
  SlotLoadingBlock,
);
const NoteEditorCore = heavy<typeof NoteEditorCoreType>(
  () => import("@/features/notes/components/NoteEditorCore").then((m) => m.NoteEditorCore),
  SlotLoadingPanel,
);

export const fullSlotImpls = {
  HtmlPreviewFullScreenEditor,
  AgentEditAccessBadge,
  DataRefPreviewContent,
  NoteEditorCore,
  ToolResultCanvasOpener,
  CloudBrowserHandoffCanvasOpener,
  SimpleTerminal,
  ServerNotes,
  ReferenceCopyButton,
  MandateNotesPanel,
  SurfaceBoundAgentsList,
  AddToMyMenu: AddToMyMenuTile,
  ProposedDirectivesZone,
  EntityCommentPopover,
  MatrxEnvelopeBlock,
  AgentOptionsMenu,
  AgentSaveStatus,
  AgentSaveTapButton,
  AgentPeekDuplicateButton,
  CustomDataBindingSummary,
  CustomDataBindingPreview,
  Cost,
  CostDoor,
  CanvasItemCard,
};

// The deferred functions: thunks and services the package runs after first paint (a tool call, a
// conversation load's follow-ups, a share). chatUiRegistration.ts binds each to this module.
export const fullFnImpls = {
  loadCodeEditHistoryThunk,
  reconcileMessagesArtifacts,
  adoptCloudBrowserRunFromStream,
  dispatchWarRoomTool,
  dispatchWarRoomMasterTool,
};
