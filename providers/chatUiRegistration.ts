// Full chat UI profile. Base registrations are shared with the demos shell.
// Import that module once instead of recreating its eight next/dynamic wrappers:
// both profiles coexist on chat demos, so copies create duplicate chunk groups
// and replace the registered component identities when the route loads.
//
// LAZY vs STATIC (2026-10-13, first-load campaign): component slots load through ONE
// implementation module (chatUiRegistrationImpl.ts) via `lazySlot` below. STATIC on purpose:
//   · ProTextarea, VoiceTextarea, ProInput — the composer and every writing box.
//   · AppLink, ErrorBoundaryWithCapture, WorkspaceGate, OrganizationContextNotice, AccessGate —
//     SSR / first paint of /chat/new and the (core) shell.
//   · MatrxFloatingFrame — the shell chat dock's floating mode.
//   · KindValueFrontDoor, StructuredValueView, CitationChip — kind-value doors
//     drawn synchronously inside kind trees (static markup / SSR); modeled saving ~0.
//   · JsonInspector — ResultJson draws it inside kind results rendered as static markup; kept
//     static though lazy would save ~0.86 MB (ambiguous SSR use — the owner decides).
//   · BlockHoverPreview, KindDataGate, MatrxDynamicPanelHost — wrappers: a loading state would
//     hide their `children`.
//   · AnswerTextPreview — its module is already static here through `answerPreviewText`.
//   · CreatorRunPanel — CreatorRunPanelLazy is itself a front door; LibraryPreviewPage and
//     NoteVersionHistoryPanel — already next/dynamic. Hooks and functions stay static.
import "@/providers/chatUiRegistrationBase";
import dynamic from "next/dynamic";
import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
import {
  lazySlotsFrom,
  SlotLoadingBlock,
  SlotLoadingGlyph,
  SlotLoadingInline,
  SlotLoadingPanel,
} from "@/providers/chatSlotLazy";
// Kind-value doors: they render inside kind trees that are drawn synchronously (SSR / static
// markup) and are reached statically elsewhere anyway — lazy here saves ~0 (modeled 0.01 MB).
import { KindValueFrontDoor } from "@/components/official/structured-value/KindValueFrontDoor";
import { StructuredValueView } from "@/components/official/structured-value/StructuredValueView";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import { NotesAPI } from "@/features/notes/service/notesApi";

const asSlot = <T,>(impl: T) => impl as unknown as never;

// LAZY SLOTS — one implementation module, one `import()` (providers/chatSlotLazy.tsx explains
// the law and the loading footprints). Registration stays synchronous; only the component loads
// on first render.
// The ONE `import()` of the implementation module. Component slots and the deferred functions
// below (thunks and services run after first paint) all resolve through it: one async edge.
const loadImpl = () => import("@/providers/chatUiRegistrationImpl");
const lazySlot = lazySlotsFrom(() => loadImpl().then((m) => m.fullSlotImpls));
type FnImpls = Awaited<ReturnType<typeof loadImpl>>["fullFnImpls"];
type ImplDispatch = (action: unknown) => unknown;
/** A thunk creator whose real thunk loads with the impl module; the package only dispatches it. */
const lazyThunk =
  <K extends keyof FnImpls>(name: K) =>
  (...args: unknown[]) =>
  async (dispatch: ImplDispatch) => {
    const create = (await loadImpl()).fullFnImpls[name] as unknown as (...a: unknown[]) => unknown;
    return dispatch(create(...args));
  };
const HtmlPreviewFullScreenEditor = lazySlot("HtmlPreviewFullScreenEditor");
const AgentEditAccessBadge = lazySlot("AgentEditAccessBadge", SlotLoadingInline);
const DataRefPreviewContent = lazySlot("DataRefPreviewContent", SlotLoadingBlock);
const NoteEditorCore = lazySlot("NoteEditorCore", SlotLoadingPanel);
const ToolResultCanvasOpener = lazySlot("ToolResultCanvasOpener");
const CloudBrowserHandoffCanvasOpener = lazySlot("CloudBrowserHandoffCanvasOpener");
const SimpleTerminal = lazySlot("SimpleTerminal", SlotLoadingPanel);
const ServerNotes = lazySlot("ServerNotes");
const ReferenceCopyButton = lazySlot("ReferenceCopyButton", SlotLoadingGlyph);
const MandateNotesPanel = lazySlot("MandateNotesPanel", SlotLoadingBlock);
const SurfaceBoundAgentsList = lazySlot("SurfaceBoundAgentsList", SlotLoadingBlock);
const AddToMyMenu = lazySlot("AddToMyMenu");
const ProposedDirectivesZone = lazySlot("ProposedDirectivesZone");
const EntityCommentPopover = lazySlot("EntityCommentPopover", SlotLoadingGlyph);
const MatrxEnvelopeBlock = lazySlot("MatrxEnvelopeBlock", SlotLoadingBlock);
const AgentOptionsMenu = lazySlot("AgentOptionsMenu", SlotLoadingGlyph);
const AgentSaveStatus = lazySlot("AgentSaveStatus", SlotLoadingInline);
const AgentSaveTapButton = lazySlot("AgentSaveTapButton", SlotLoadingGlyph);
const AgentPeekDuplicateButton = lazySlot("AgentPeekDuplicateButton", SlotLoadingGlyph);
const CustomDataBindingSummary = lazySlot("CustomDataBindingSummary", SlotLoadingInline);
const CustomDataBindingPreview = lazySlot("CustomDataBindingPreview", SlotLoadingBlock);
const Cost = lazySlot("Cost", SlotLoadingInline);
const CanvasItemCard = lazySlot("CanvasItemCard", SlotLoadingBlock);

import { canvasArtifactService } from "@/features/canvas/services/canvasArtifactService";
import { SandboxFilesystemAdapter } from "@/features/code/adapters/SandboxFilesystemAdapter";
import { sklActions } from "@/features/agent-connections/redux/skl/slice";
import { BlockHoverPreview } from "@/features/agents/components/previews/BlockHoverPreview";
// The preview hook loads its markdown renderer (KaTeX, ~680 KB) when a preview first opens (lane AF).
import { useHtmlPreviewStateOnDemand } from "@/features/html-pages/hooks/useHtmlPreviewStateOnDemand";
import { fetchArtifactsForMessageThunk, updateArtifactThunk, registerArtifactThunk } from "@/lib/redux/thunks/artifactThunks";
import { selectHtmlPageArtifactForMessage } from "@/lib/redux/selectors/artifactSelectors";
// The compiler (@ai-matrx/code-runtime + the ~2 MB Babel standalone) loads on the first stored
// body a chat run actually compiles — never in the shell's eager client set (lane AE, 2026-10-08;
// guard: pnpm check:shell-eager-graph). The package awaits this slot (@ai-matrx/chat ≥ 0.5.0).
import type { CompileStoredArgs } from "@/lib/code-runtime/compile-stored";
import { reportCanvasOpenDrop } from "@/features/canvas/openRequest";
import { refreshNoteContent, fetchNotesList, saveNoteField } from "@/features/notes/redux/thunks";
import { loadProjectsWithTasks } from "@/features/tasks/redux/thunks";
import { humanLines } from "@/features/marketing/lib/copy-payloads";
import { useCanvasOpenGuard } from "@/features/canvas/hooks/useCanvasOpenGuard";
import { useRegisterChatAttachTarget } from "@/features/knowledge/command-bar/useKnowledgeAttachTarget";
import { useAutoLabel, generateLabelFromContent } from "@/features/notes/hooks/useAutoLabel";
import { usePickListForSelection } from "@/features/data-tables/pick-lists/hooks/usePickListForSelection";
import { useGitHubConnection } from "@/features/github-integration/useGitHubConnection";
import { useOutputFeedback } from "@/lib/output-feedback/useOutputFeedback";
import { saveOutputFeedback } from "@/lib/output-feedback/service";
import { precedingQuestion } from "@/features/masterwork/oracle/precedingQuestion";
import type { reconcileMessagesArtifacts } from "@/features/canvas/materialization/reconcileArtifacts";
import { looksLikeContact } from "@ai-matrx/chat/window-panels/windows/crm/contact-selection";
import { invalidateCanvasItemCache } from "@/features/canvas/hooks/useCanvasItem";
import { studioDocumentContentChanged } from "@/features/transcript-studio/redux/slice";
import { selectEditorState } from "@/features/code-editor/redux/editor-state.slice";
import { selectActiveSandboxId, selectActiveSandboxProxyUrl, selectEditorMode } from "@/features/code/redux/codeWorkspaceSlice";
import { receivedFsChange } from "@/features/code/redux/fsChangesSlice";
import { materializeMessageArtifacts } from "@/features/canvas/materialization/materializeMessageArtifacts";
import { noteBrowserActivity, selectCloudBrowserRunLive } from "@/features/cloud-browser/redux/cloudBrowserSlice";
import { resolveGmailSendConnection } from "@/features/google-workspace/connection";
import { selectAllContentBlocksArray, selectContentBlocksByScope, selectContentBlocksByScopeRef, selectActiveContentBlocks } from "@/features/agent-connections/redux/skl/content-block-compat";
import { createElement } from "react";
import { Loader2 } from "lucide-react";

const LibraryPreviewPage = dynamic(
  () => import("@/features/rag/components/library/LibraryPreviewPage").then((m) => m.LibraryPreviewPage),
  { ssr: false, loading: () => createElement("div", { className: "flex h-full items-center justify-center gap-2 text-sm text-muted-foreground" }, createElement(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading document…") },
);
const NoteVersionHistoryPanel = dynamic(
  () => import("@/features/notes/components/diff/NoteVersionHistoryPanel").then((m) => ({ default: m.NoteVersionHistoryPanel })),
  { ssr: false, loading: () => createElement("div", { className: "flex h-32 items-center justify-center text-xs text-muted-foreground" }, "Loading version history…") },
);

type HtmlPageSlots = typeof import("@ai-matrx/chat/window-panels/windows/html-pages/html-page-service").htmlPageSlots;
const loadHtmlPageSlots = async (): Promise<HtmlPageSlots> =>
  (await import("@ai-matrx/chat/window-panels/windows/html-pages/html-page-service")).htmlPageSlots;

registerChatUi({
  HtmlPreviewFullScreenEditor,
  AgentEditAccessBadge,
  DataRefPreviewContent,
  BlockHoverPreview,
  NoteEditorCore,
  ToolResultCanvasOpener,
  CloudBrowserHandoffCanvasOpener,
  SimpleTerminal,
  useHtmlPreviewState: useHtmlPreviewStateOnDemand,
  fetchArtifactsForMessageThunk,
  updateArtifactThunk,
  registerArtifactThunk,
  selectHtmlPageArtifactForMessage,
  compileStoredComponent: async (args: CompileStoredArgs) =>
    (await import("@/lib/code-runtime/compile-stored")).compileStoredComponent(args),
  reportCanvasOpenDrop,
  refreshNoteContent,
  fetchNotesList,
  saveNoteField,
  loadProjectsWithTasks,
  humanLines,
  useCanvasOpenGuard,
  useRegisterChatAttachTarget,
  useAutoLabel,
  generateLabelFromContent,
  usePickListForSelection,
  useGitHubConnection,
  useOutputFeedback,
  saveOutputFeedback,
  precedingQuestion,
  looksLikeContact,
  invalidateCanvasItemCache,
  studioDocumentContentChanged,
  selectEditorState,
  selectActiveSandboxId,
  selectActiveSandboxProxyUrl,
  selectEditorMode,
  receivedFsChange,
  // Deferred (2026-10-16, first-load register items 2+3): dispatched or awaited after first paint,
  // so their machinery loads with the impl module, never in the shell's eager set.
  loadCodeEditHistoryThunk: lazyThunk("loadCodeEditHistoryThunk"),
  materializeMessageArtifacts,
  reconcileMessagesArtifacts: async (...args: Parameters<typeof reconcileMessagesArtifacts>) =>
    (await loadImpl()).fullFnImpls.reconcileMessagesArtifacts(...args),
  noteBrowserActivity,
  selectCloudBrowserRunLive,
  adoptCloudBrowserRunFromStream: lazyThunk("adoptCloudBrowserRunFromStream"),
  dispatchWarRoomTool: lazyThunk("dispatchWarRoomTool"),
  dispatchWarRoomMasterTool: lazyThunk("dispatchWarRoomMasterTool"),
  resolveGmailSendConnection,
  canvasGetVersionHistory: (id: string) => canvasArtifactService.getVersionHistory(id),
  canvasGetById: (id: string) => canvasArtifactService.getById(id),
  createSandboxFilesystemAdapter: (instanceId: string) => new SandboxFilesystemAdapter(instanceId),
  notesGetById: (id: string) => NotesAPI.getById(id),
  // Publish / Share as webpage: the chat package's HTML-page service (aidream /cms/html-pages) and its
  // markdown converter (loads @ai-matrx/print/markdown, KaTeX ~680 KB, on the first share only) — the
  // same two functions Matrx 2 registers.
  createHtmlPage: async (...args: Parameters<HtmlPageSlots["createHtmlPage"]>) => (await loadHtmlPageSlots()).createHtmlPage(...args),
  convertMarkdownToHtml: async (markdown: string) => (await loadHtmlPageSlots()).convertMarkdownToHtml(markdown),
  sklActions: sklActions,
  selectAllContentBlocksArray,
  selectContentBlocksByScope,
  selectContentBlocksByScopeRef,
  selectActiveContentBlocks,
  LibraryPreviewPage: LibraryPreviewPage,
  NoteVersionHistoryPanel: NoteVersionHistoryPanel,
});


import { WorkspaceGate as Host_WorkspaceGate } from "@/features/organizations/components/WorkspaceGate";
registerChatUi({
  WorkspaceGate: Host_WorkspaceGate,
});

import { OrganizationContextNotice as Host_OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
registerChatUi({
  OrganizationContextNotice: Host_OrganizationContextNotice,
});

registerChatUi({
  JsonInspector: JsonInspector,
});


registerChatUi({
});

registerChatUi({
  StructuredValueView: StructuredValueView,
});

registerChatUi({
  KindValueFrontDoor: KindValueFrontDoor,
});

import { KindDataGate as Host_KindDataGate } from "@/components/official/structured-value/KindDataGate";
registerChatUi({
  KindDataGate: Host_KindDataGate,
});

registerChatUi({
  ServerNotes: ServerNotes,
});

// Loaded when a floating frame first renders: the light-window section never rides the boot graph.
const Host_MatrxFloatingFrame = dynamic(() => import("@ai-matrx/summon/lite").then((m) => m.LiteWindow));
registerChatUi({
  MatrxFloatingFrame: Host_MatrxFloatingFrame,
});

import { AnswerTextPreview as Host_AnswerTextPreview } from "@/components/official/structured-value/AnswerTextPreview";
registerChatUi({
  AnswerTextPreview: Host_AnswerTextPreview,
});

import { AccessGate as Host_AccessGate } from "@/features/access-gate/components/AccessGate";
registerChatUi({
  AccessGate: Host_AccessGate,
});

registerChatUi({
  ReferenceCopyButton: ReferenceCopyButton,
});

registerChatUi({
  MandateNotesPanel: MandateNotesPanel,
});

registerChatUi({
  SurfaceBoundAgentsList: SurfaceBoundAgentsList,
});

// custom-experience: "Add to my menu" in the Intelligence dropdown.
registerChatUi({
  AddToMyMenu: AddToMyMenu,
});

registerChatUi({
  ProposedDirectivesZone: ProposedDirectivesZone,
});

registerChatUi({
  EntityCommentPopover: EntityCommentPopover,
});

import { ProTextarea as Host_ProTextarea } from "@/components/official/ProTextarea";
registerChatUi({
  ProTextarea: Host_ProTextarea,
});

import { VoiceTextarea as Host_VoiceTextarea } from "@/components/official/VoiceTextarea";
registerChatUi({
  VoiceTextarea: Host_VoiceTextarea,
});

import Host_AppLink from "@/components/navigation/AppLink";
registerChatUi({
  AppLink: Host_AppLink,
});

registerChatUi({
});

registerChatUi({
  MatrxEnvelopeBlock: MatrxEnvelopeBlock,
});

import { ErrorBoundaryWithCapture as Host_ErrorBoundaryWithCapture } from "@/lib/error-boundary/ErrorBoundaryWithCapture";
registerChatUi({
  ErrorBoundaryWithCapture: Host_ErrorBoundaryWithCapture,
});


import { useOrganizationRequired as Host_useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
registerChatUi({
  useOrganizationRequired: Host_useOrganizationRequired,
});

import { useAuthGuardedAction as Host_useAuthGuardedAction } from "@/features/auth/components/useAuthGuardedAction";
registerChatUi({
  useAuthGuardedAction: Host_useAuthGuardedAction,
});

import { readOf as Host_readOf } from "@ai-matrx/design-system";
registerChatUi({
  readOf: Host_readOf,
});

import { pushAppHref as Host_pushAppHref } from "@/lib/deployment/navigate";
import { replaceAppHref as Host_replaceAppHref } from "@/lib/deployment/navigate";
registerChatUi({
  pushAppHref: Host_pushAppHref,
  replaceAppHref: Host_replaceAppHref,
});

import { peekSystemOrgId as Host_peekSystemOrgId } from "@/lib/organizations/systemOrg";
registerChatUi({
  peekSystemOrgId: Host_peekSystemOrgId,
});


import { peekMandateCatalogueEntry as Host_peekMandateCatalogueEntry } from "@/features/mandates/catalogue";
import { invalidateMandateCatalogueCache as Host_invalidateMandateCatalogueCache } from "@/features/mandates/catalogue";
registerChatUi({
  peekMandateCatalogueEntry: Host_peekMandateCatalogueEntry,
  invalidateMandateCatalogueCache: Host_invalidateMandateCatalogueCache,
});


import { useLoginHref as Host_useLoginHref } from "@/hooks/auth/useLoginHref";
registerChatUi({
  useLoginHref: Host_useLoginHref,
});

import { useAccess as Host_useAccess } from "@/utils/permissions/access";
registerChatUi({
  useAccess: Host_useAccess,
});

import { selectShouldPromptForOrganization as Host_selectShouldPromptForOrganization } from "@/lib/redux/slices/appContextSlice";
registerChatUi({
  selectShouldPromptForOrganization: Host_selectShouldPromptForOrganization,
});


import { resolveEntityToken as Host_resolveEntityToken } from "@/features/scopes/registry/entityRegistry";
registerChatUi({
  resolveEntityToken: Host_resolveEntityToken,
});

import { entityTitleFallback as Host_entityTitleFallback } from "@/features/scopes/service/entityTitles";
import { fetchEntityTitles as Host_fetchEntityTitles } from "@/features/scopes/service/entityTitles";
import { getCachedEntityTitle as Host_getCachedEntityTitle } from "@/features/scopes/service/entityTitles";
registerChatUi({
  entityTitleFallback: Host_entityTitleFallback,
  fetchEntityTitles: Host_fetchEntityTitles,
  getCachedEntityTitle: Host_getCachedEntityTitle,
});

import { bookmarksToReferenceDirectives as Host_bookmarksToReferenceDirectives } from "@/features/matrx-envelope/bookmarkToReference";
registerChatUi({
  bookmarksToReferenceDirectives: Host_bookmarksToReferenceDirectives,
});

import { ensureOrgAvailability as Host_ensureOrgAvailability } from "@ai-matrx/sharing/core";
registerChatUi({
  ensureOrgAvailability: Host_ensureOrgAvailability,
});


import { requireAuthenticatedSupabaseSession as Host_requireAuthenticatedSupabaseSession } from "@/utils/supabase/webDb";
registerChatUi({
  requireAuthenticatedSupabaseSession: Host_requireAuthenticatedSupabaseSession,
});

import { notifyPrintOutcome as Host_notifyPrintOutcome } from "@/lib/print/print-outcome-toast";
registerChatUi({
  notifyPrintOutcome: Host_notifyPrintOutcome,
});


import { awaitEffectiveOrganizationId as Host_awaitEffectiveOrganizationId } from "@/features/organizations/awaitWorkspace";
registerChatUi({
  awaitEffectiveOrganizationId: Host_awaitEffectiveOrganizationId,
});





// Agent builder contributions drawn into chat (AGENT-CORE-PLAN B1).
import { CreatorRunPanelLazy as Host_CreatorRunPanel } from "@/features/agents/components/run-controls/CreatorRunPanelLazy";
registerChatUi({
  AgentOptionsMenu: AgentOptionsMenu,
  AgentSaveStatus: AgentSaveStatus,
  AgentSaveTapButton: AgentSaveTapButton,
  AgentPeekDuplicateButton: AgentPeekDuplicateButton,
  CreatorRunPanel: Host_CreatorRunPanel,
});




registerChatUi({
  CustomDataBindingSummary: CustomDataBindingSummary,
});

registerChatUi({
  CustomDataBindingPreview: CustomDataBindingPreview,
});


import { ProInput as Host_ProInput } from "@/components/official/ProInput";
registerChatUi({
  ProInput: Host_ProInput,
});

import { MatrxDynamicPanelHost as Host_MatrxDynamicPanelHost } from "@/components/matrx/resizable/MatrxDynamicPanelHost";
registerChatUi({
  MatrxDynamicPanelHost: Host_MatrxDynamicPanelHost,
});


import { useClippedContentGuard as Host_useClippedContentGuard } from "@/lib/layout/useClippedContentGuard";
registerChatUi({
  useClippedContentGuard: Host_useClippedContentGuard,
});

import { answerPreviewText as Host_answerPreviewText } from "@/components/official/structured-value/AnswerTextPreview";
registerChatUi({
  answerPreviewText: Host_answerPreviewText,
});

import { beginPlaybackSession as Host_beginPlaybackSession } from "@/features/audio/session/audioSessionRegistry";
registerChatUi({
  beginPlaybackSession: Host_beginPlaybackSession,
});


import { currentCostUnit as Host_currentCostUnit } from "@/components/cost/costUnit";
registerChatUi({
  currentCostUnit: Host_currentCostUnit,
});

registerChatUi({
  Cost: Cost,
});

import { currentPointsRate as Host_currentPointsRate } from "@/components/cost/pointsRate";
import { useCostDisplay as Host_useCostDisplay } from "@/components/cost/useCostDisplay";
registerChatUi({
  currentPointsRate: Host_currentPointsRate,
  useCostDisplay: Host_useCostDisplay,
});


registerChatUi({
  CanvasItemCard: CanvasItemCard,
});
