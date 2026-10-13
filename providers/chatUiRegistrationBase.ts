// providers/chatUiRegistrationBase.ts
//
// The registrations every build profile needs at shell startup. The larger
// post-v0.4.2884 slot set remains in chatUiRegistration.ts and is selected only
// for full profiles; demos imports it at its chat route boundary.
//
// LAZY vs STATIC (2026-10-13, first-load campaign): component slots load through ONE
// implementation module (chatUiRegistrationBaseImpl.ts) via `lazySlot` below. STATIC on purpose:
//   · DockedSidePanel — the (core) shell's chat dock draws it on first paint.
//   · CopyButtons, AnswerValueView, EntityRef — drawn inside kind trees rendered synchronously
//     (static markup / SSR) and reached statically elsewhere anyway (modelled saving ~0).
//   · EditableContextMenu, MicrophoneIconButton, MicDeviceMenu — the composer on /chat/new.
//   · ConnectorPromptHost — NewChatGreeting draws it above the composer on first paint.
//   · NonEditableContextMenu, SearchGroup (+ its trigger) — wrappers: a loading state would hide
//     their `children` (the SSR'd conversation, a toolbar's contents).
//   · the eight existing next/dynamic slots (ShareModal, WindowPanel, …) — already off the first
//     load behind their own edges; hooks and functions — a hook cannot load lazily.


import dynamic from "next/dynamic";
import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
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
// markup) and are reached statically elsewhere anyway — lazy here saves ~0 (modelled 0.01 MB).
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { AnswerValueView } from "@/components/official/structured-value/AnswerValueView";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
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
} from "@/features/cloud-browser/hooks/useOpenCloudBrowserCanvas";
import { flattenResourcePickerItems } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import { useAttachResourcePicker } from "@/features/connectors/useAttachResourcePicker";
import { usePopoutContainer } from "@/features/window-panels/popout/usePopoutContainer";
import { useUrlSync } from "@/features/window-panels/url-sync/useUrlSync";
import { useOverlaySurfaceRenderAck } from "@/features/window-panels/diagnostics/useOverlaySurfaceRenderAck";
import {
  disposeFullScreenEditorCallbackGroup,
  emitFullScreenEditorSave,
} from "@/features/overlays/callbacks/fullScreenEditor";
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
const InfoHint = lazySlot("InfoHint", SlotLoadingGlyphSmall);
const ErrorAlchemyMenu = lazySlot("ErrorAlchemyMenu", SlotLoadingGlyph);
const AdvancedMenu = lazySlot("AdvancedMenu");
const AuthGateDialog = lazySlot("AuthGateDialog");
const EmailInputDialog = lazySlot("EmailInputDialog");
const TableChooser = lazySlot("TableChooser", SlotLoadingControl);
const FileResourceChip = lazySlot("FileResourceChip", SlotLoadingInline);
const ConnectorMark = lazySlot("ConnectorMark", SlotLoadingGlyphSmall);
const AttachedResourcesSection = lazySlot("AttachedResourcesSection", SlotLoadingBlock);
const WebpageSnapshotView = lazySlot("WebpageSnapshotView", SlotLoadingPanel);
const MessageFilesStrip = lazySlot("MessageFilesStrip");
const RulebookNudge = lazySlot("RulebookNudge");
const NegativeVerdictFollowUp = lazySlot("NegativeVerdictFollowUp");
const SpeakerButton = lazySlot("SpeakerButton", SlotLoadingGlyph);
const GmailReviewCard = lazySlot("GmailReviewCard", SlotLoadingBlock);
const ShareButton = lazySlot("ShareButton", SlotLoadingGlyph);
const ReviewAnswersLink = lazySlot("ReviewAnswersLink");
const RecordChangeApprovalCard = lazySlot("RecordChangeApprovalCard", SlotLoadingBlock);
const SystemInstructionModal = lazySlot("SystemInstructionModal");
const FileRagBadge = lazySlot("FileRagBadge");
const MediaAttachmentThumbnail = lazySlot("MediaAttachmentThumbnail", SlotLoadingGlyph);
const UnifiedImageBlockRenderer = lazySlot("UnifiedImageBlockRenderer", SlotLoadingBlock);
const TranscriptionLoader = lazySlot("TranscriptionLoader", SlotLoadingInline);
const PdfNamedSurfaceSwitcher = lazySlot("PdfNamedSurfaceSwitcher", SlotLoadingControl);
const ChangeDiff = lazySlot("ChangeDiff", SlotLoadingBlock);

const ShareModal = dynamic(
  () =>
    import("@/features/sharing/components/ShareModal").then((m) => ({
      default: m.ShareModal,
    })),
  { ssr: false },
);
const WindowPanel = dynamic(
  () =>
    import("@/features/window-panels/WindowPanel").then((m) => m.WindowPanel),
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

import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import { MicDeviceMenu } from "@/components/audio/MicDeviceMenu";
import { resolvePdfSurfaceIds } from "@/features/pdf/hooks/usePdfSurfaceLinks";
import {
  SearchGroup,
  SearchGroupTrigger,
} from "@/components/icons/SearchToolbar";
import { useFileDocument } from "@/features/files/hooks/useFileDocument";
import { useFileResourceFamily } from "@/features/files/hooks/useFileResourceFamily";
import { useFileActions } from "@/features/files/components/core/FileActions/useFileActions";
import { useRecordAndTranscribe } from "@/features/audio/hooks/useRecordAndTranscribe";
import { requestScribeAudioSeek } from "@/features/transcript-studio/state/scribeAudioBus";
import { readListRpc } from "@/lib/entity-list/readListRpc";

registerChatUi({
  FileRagBadge,
  MediaAttachmentThumbnail,
  UnifiedImageBlockRenderer,
  MicrophoneIconButton,
  TranscriptionLoader,
  MicDeviceMenu,
  PdfNamedSurfaceSwitcher,
  ChangeDiff,
  SearchGroup,
  SearchGroupTrigger,
  useFileDocument,
  useFileResourceFamily,
  useFileActions,
  useRecordAndTranscribe,
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
  usePopoutContainer,
  useUrlSync,
  useOverlaySurfaceRenderAck,
  disposeFullScreenEditorCallbackGroup,
  emitFullScreenEditorSave,
  SystemInstructionModal,
  traceWarRoomRenderPath,
  isWarRoomThreadAgentSurface,
  useOpenCloudBrowserCanvas,
  cloudBrowserCanvasSourceId,
  MessageFilesStrip,
  RulebookNudge,
  NegativeVerdictFollowUp,
  SpeakerButton,
  GmailReviewCard,
  ShareButton,
  ShareModal,
  ReviewAnswersLink,
  RecordChangeApprovalCard,
  CopyButtons,
  InfoHint,
  AnswerValueView,
  ErrorAlchemyMenu,
  EntityRef,
  AdvancedMenu,
  AuthGateDialog,
  EmailInputDialog,
  DockedSidePanel,
  EditableContextMenu,
  NonEditableContextMenu,
  TableChooser,
  FileResourceChip,
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
  fetchConversationAttachments,
  attachConversationResource,
  detachConversationResource,
  getSurfaceManifest,
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
