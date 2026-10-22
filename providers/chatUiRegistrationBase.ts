// providers/chatUiRegistrationBase.ts
//
// The registrations every build profile needs at shell startup. The larger
// post-v0.4.2884 slot set remains in chatUiRegistration.ts and is selected only
// for full profiles; demos imports it at its chat route boundary.
//
// LAZY vs STATIC (2026-10-13, first-load campaign): component slots load through ONE
// implementation module (chatUiRegistrationBaseImpl.ts) via `lazySlot` below. STATIC on purpose:
//   · DockedSidePanel — the (core) shell's chat dock draws it on first paint.
//   · CopyButtons — drawn inside kind trees rendered synchronously (static markup /
//     SSR) and reached statically elsewhere anyway (modeled saving ~0).
//   · AnswerValueView → AnswerValueSlot: text draws at once; a structured value loads the kind
//     stack through the kind front door's existing lazy edge (a static AnswerValueView here put
//     the content-ir component registry in every route's first load).
//   · EditableContextMenu — the composer on /chat/new.
//   · ConnectorPromptHost — NewChatGreeting draws it above the composer on first paint.
//   · NonEditableContextMenu, SearchGroup (+ its trigger) — wrappers: a loading state would hide
//     their `children` (the SSR'd conversation, a toolbar's contents).
//   · the eight existing next/dynamic slots (ShareModal, WindowPanel, …) — already off the first
//     load behind their own edges; hooks and functions — a hook cannot load lazily.


import dynamic from "next/dynamic";
import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
// Binds @ai-matrx/records-ui/entity-ref (EntityRef, doors, toastDoor, RecordStamps) to this app, once.
import "@/features/data-tables/records-ui-host/entityRefHost";
// Binds @ai-matrx/design-system/settings (links, error menu, deep-link anchor, navigate, copy notice) to this app, once.
import "@/features/settings/doors/settingsHost";
import { surfaceManifestHost } from "./surfaceManifestHost";
import {
  lazySlotsFrom,
  SlotLoadingBlock,
  SlotLoadingControl,
  SlotLoadingGlyph,
  SlotLoadingGlyphSmall,
  SlotLoadingInline,
  SlotLoadingPanel,
} from "@/providers/chatSlotLazy";
// Kind-value doors: they render inside kind trees that are drawn synchronously (SSR / static
// markup) and are reached statically elsewhere anyway — lazy here saves ~0 (modeled 0.01 MB).
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { AnswerValueSlot } from "@/components/official/structured-value/AnswerValueSlot";
import { DockedSidePanel } from "@/components/official/side-panel/DockedSidePanel";
import { EditableContextMenu } from "@ai-matrx/context-menu/react";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { useTablesEverywhere } from "@/features/unified-data/hub/useTablesEverywhere";
import { connectorDefinitionFromMcp } from "@/features/connectors/live-connectors";
import { useClipboardPasteWithDataOffer } from "@/features/data-sources/usePasteDataOffer";
import { useCenterControlFit } from "@/features/shell/components/header/useCenterControlFit";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { summarizeContextCell } from "@/features/scopes/utils/referenceCell";
import { useEntityTitles } from "@/features/scopes/hooks/useEntityTitles";
import "@/providers/chatUsageGateRegistration";
import "@/providers/chatGuestChallengeRegistration";
import "@/providers/chatMessageActionSlots";
import { registerKindValueMarkdown } from "@ai-matrx/content-ir/surfaces";
import { useKnowledgeAttachSearch } from "@/features/resource-manager/resource-picker/useKnowledgeAttachSearch";
import { useConversationAttachments } from "@/features/connectors/useConversationAttachments";
import { useHeldWriteTableName } from "@/features/record-change-approvals/useHeldWriteTableName";
import { getManifest as getSurfaceManifest } from "@ai-matrx/chat/surfaces/runtime/registry";
import {
  usePageCapture,
  usePageCaptureContribution,
} from "@/components/agent-copy/page-capture/usePageCapture";
import {
  fetchConversationAttachments,
  attachConversationResource,
  detachConversationResource,
} from "@/features/connectors/attachments.service";
import { ConnectorPromptHost } from "@/features/connectors/ConnectorPromptHost";
import { useConnectMcpServer } from "@/features/connectors/useConnectMcpServer";
import { useFirstPartyConnectors } from "@/features/connectors/useFirstPartyConnectors";
import { useOpenFirstPartyConnect } from "@/features/connectors/useOpenFirstPartyConnect";
import { resolveSystemOrgId } from "@/lib/organizations/systemOrg";
import { createClient as createAppClient } from "@/utils/supabase/client";
import { projectsDb } from "@/utils/supabase/projectsDb";
import { NotesAPI } from "@/features/notes/service/notesApi";
import {
  traceWarRoomRenderPath,
  isWarRoomThreadAgentSurface,
} from "@/features/war-room/utils/renderPathTrace";
import {
  useOpenCloudBrowserCanvas,
  cloudBrowserCanvasSourceId,
  useCloudBrowserSurfaceKind,
} from "@/features/cloud-browser/hooks/useOpenCloudBrowserCanvas";
import { useOpenCloudComputerCanvas } from "@/features/cloud-computer/useOpenCloudComputerCanvas";
import { flattenResourcePickerItems } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import { useAttachResourcePicker } from "@/features/connectors/useAttachResourcePicker";
// Light entries only: ./window and ./url each ship as one module, so a hook imported from them
// carried the whole window section / link manager into every route's first load.
import { useOverlayLink as useUrlSync } from "@ai-matrx/summon/boot-root";
// The full-screen editor's callback module loads on use, never at boot (builder-G 2026-10-18): a
// group only exists once that module created it, so by the first dispose/emit it is in memory.
const loadFullScreenEditorCallbacks = () => import("@/features/overlays/definitions/callbacks/fullScreenEditor");
const disposeFullScreenEditorCallbackGroup = (callbackGroupId: string | null | undefined): void => {
  if (callbackGroupId) void loadFullScreenEditorCallbacks().then((m) => m.disposeFullScreenEditorCallbackGroup(callbackGroupId));
};
const emitFullScreenEditorSave = (callbackGroupId: string | undefined | null, content: string, action?: string): Promise<void> =>
  loadFullScreenEditorCallbacks().then((m) => m.emitFullScreenEditorSave(callbackGroupId, content, action));
import { kindValueToMarkdown } from "@/features/canvas/export/exportArtifactMarkdown";

/**
 * Slots typed by the props the package passes. Components that require their
 * own props cross this boundary as slots so the package keeps the call-site
 * contract rather than the host component's implementation signature.
 */
const asSlot = <T>(impl: T) => impl as unknown as never;

// LAZY SLOTS — one implementation module, one `import()` (providers/chatSlotLazy.tsx explains
// the law and the loading footprints). Registration stays synchronous; only the component loads
// on first render.
const lazySlot = lazySlotsFrom(() =>
  import("@/providers/chatUiRegistrationBaseImpl").then((m) => m.baseSlotImpls),
);
const ErrorAlchemyMenu = lazySlot("ErrorAlchemyMenu", SlotLoadingGlyph);
const AdvancedMenu = lazySlot("AdvancedMenu");
const TableChooser = lazySlot("TableChooser", SlotLoadingControl);
const ConnectorMark = lazySlot("ConnectorMark", SlotLoadingGlyphSmall);
const AttachedResourcesSection = lazySlot("AttachedResourcesSection", SlotLoadingBlock);
const WebpageSnapshotView = lazySlot("WebpageSnapshotView", SlotLoadingPanel);
const MessageFilesStrip = lazySlot("MessageFilesStrip");
const RulebookNudge = lazySlot("RulebookNudge");
const NegativeVerdictFollowUp = lazySlot("NegativeVerdictFollowUp");
const GmailReviewCard = lazySlot("GmailReviewCard", SlotLoadingBlock);
const ShareButton = lazySlot("ShareButton", SlotLoadingGlyph);
const ReviewAnswersLink = lazySlot("ReviewAnswersLink");
const RecordChangeApprovalCard = lazySlot("RecordChangeApprovalCard", SlotLoadingBlock);
const BackgroundRunCard = lazySlot("BackgroundRunCard", SlotLoadingBlock);
const SystemInstructionModal = lazySlot("SystemInstructionModal");
const PdfNamedSurfaceSwitcher = lazySlot("PdfNamedSurfaceSwitcher", SlotLoadingControl);
const ChangeDiff = lazySlot("ChangeDiff", SlotLoadingBlock);

const ShareModal = dynamic(
  () =>
    import("@ai-matrx/sharing/react").then((m) => ({
      default: m.ShareModal,
    })),
  { ssr: false },
);
const WindowPanel = dynamic(
  () =>
    import("@ai-matrx/summon/window").then((m) => m.WindowPanel),
  { ssr: false },
);
const FullScreenOverlay = dynamic(
  () => import("@/components/official/FullScreenOverlay"),
);
const ResourcePickerMenu = dynamic(() =>
  import("@/features/resource-manager/resource-picker/ResourcePickerMenu").then(
    (m) => m.ResourcePickerMenu,
  ),
);
const FilesResourcePicker = dynamic(() =>
  import("@/features/resource-manager/resource-picker/FilesResourcePicker").then(
    (m) => m.FilesResourcePicker,
  ),
);
const NotePickerPopover = dynamic(() =>
  import("@/features/notes/components/NotePickerPopover").then(
    (m) => m.NotePickerPopover,
  ),
);
const SmartInputMessageTemplatePicker = dynamic(() =>
  import("@/features/message-templates/components/SmartInputMessageTemplatePicker").then(
    (m) => m.SmartInputMessageTemplatePicker,
  ),
);
const ResourcePickerWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/ResourcePickerWindow").then(
      (m) => ({
        default: m.ResourcePickerWindow,
      }),
    ),
  { ssr: false },
);

import { resolvePdfSurfaceIds } from "@/features/pdf/hooks/usePdfSurfaceLinks";
import {
  SearchGroup,
  SearchGroupTrigger,
} from "@/components/icons/SearchToolbar";
// The chat package imports the shared voice controls directly; this installs the app's side of them (recorder, device choice, toast, dialogs).
import "@/features/audio/voiceInputPorts";
import { requestScribeAudioSeek } from "@/features/transcript-studio/state/scribeAudioBus";
import { readListRpc } from "@/lib/entity-list/readListRpc";

registerChatUi({
  PdfNamedSurfaceSwitcher,
  ChangeDiff,
  SearchGroup,
  SearchGroupTrigger,
  requestScribeAudioSeek,
  resolvePdfSurfaceIds,
  readListRpc,
  WindowPanel,
  ResourcePickerWindow,
  FullScreenOverlay,
  ResourcePickerMenu: asSlot(ResourcePickerMenu),
  FilesResourcePicker: asSlot(FilesResourcePicker),
  NotePickerPopover: asSlot(NotePickerPopover),
  SmartInputMessageTemplatePicker: asSlot(SmartInputMessageTemplatePicker),
  flattenResourcePickerItems,
  useAttachResourcePicker,
  useUrlSync,
  disposeFullScreenEditorCallbackGroup,
  emitFullScreenEditorSave,
  SystemInstructionModal,
  traceWarRoomRenderPath,
  isWarRoomThreadAgentSurface,
  useOpenCloudBrowserCanvas,
  cloudBrowserCanvasSourceId,
  useOpenCloudComputerCanvas,
  useCloudBrowserSurfaceKind,
  MessageFilesStrip,
  RulebookNudge,
  NegativeVerdictFollowUp,
  GmailReviewCard,
  ShareButton,
  ShareModal,
  ReviewAnswersLink,
  RecordChangeApprovalCard,
  BackgroundRunCard,
  CopyButtons,
  AnswerValueView: AnswerValueSlot,
  ErrorAlchemyMenu,
  AdvancedMenu,
  DockedSidePanel,
  EditableContextMenu,
  NonEditableContextMenu,
  TableChooser,
  ConnectorMark,
  confirm,
  useTablesEverywhere,
  useClipboardPaste: useClipboardPasteWithDataOffer,
  useCenterControlFit,
  connectorDefinitionFromMcp,
  useKnowledgeAttachSearch,
  useConversationAttachments,
  resolveSystemOrgId,
  AttachedResourcesSection,
  ConnectorPromptHost,
  useConnectMcpServer,
  useFirstPartyConnectors,
  useOpenFirstPartyConnect,
  fetchConversationAttachments,
  attachConversationResource,
  detachConversationResource,
  getSurfaceManifest,
  ...surfaceManifestHost,
  usePageCapture,
  usePageCaptureContribution,
  useHeldWriteTableName,
  WebpageSnapshotView,
  readProjectScopeOrganizationId: (tier: "project" | "task", id: string) => {
    const db = projectsDb(createAppClient());
    return tier === "project"
      ? db.from("projects").select("organization_id").eq("id", id).maybeSingle()
      : db.from("tasks").select("organization_id").eq("id", id).maybeSingle();
  },
  summarizeContextCell,
  useEntityTitles,
  notesCreate: (input: Parameters<typeof NotesAPI.create>[0]) =>
    NotesAPI.create(input),
});

registerKindValueMarkdown(kindValueToMarkdown);
