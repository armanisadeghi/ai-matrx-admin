// providers/chatUiRegistrationImpl.ts
//
// The implementations behind chatUiRegistration.ts's lazily-loaded component slots. Loaded
// through that file's ONE `import()` the first time any of these slots renders — never in a
// route's first load (THE FRAGMENTATION LAW: one impl module per registration file, one async
// edge). Import this module from nowhere else.

import HtmlPreviewFullScreenEditor from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";
import { AgentEditAccessBadge } from "@/features/agents/components/context-policies-management/AgentEditAccessControl";
import { DataRefPreviewContent } from "@/features/agents/components/previews/DataRefHoverPreview";
import { NoteEditorCore } from "@/features/notes/components/NoteEditorCore";
import { ToolResultCanvasOpener } from "@/features/canvas/tool-results/ToolResultCanvasOpener";
import { CloudBrowserHandoffCanvasOpener } from "@/features/cloud-browser/components/CloudBrowserHandoffCanvasOpener";
import { SimpleTerminal } from "@/features/code/terminal/SimpleTerminal";
import { EntityDoorControls } from "@/components/official/entity-ref/EntityDoorControls";
import { ServerNotes } from "@/components/official/ServerNotes";
import { ReferenceCopyButton } from "@/features/matrx-envelope/components/ReferenceCopyButton";
import { MandateNotesPanel } from "@/features/mandates/components/MandateNotesPanel";
import { SurfaceBoundAgentsList } from "@/features/surfaces/components/bind/SurfaceBoundAgentsList";
import { ProposedDirectivesZone } from "@/features/matrx-envelope/components/ProposedDirectivesZone";
import { EntityCommentPopover } from "@/components/comments/EntityCommentPopover";
import MatrxEnvelopeBlock from "@/features/matrx-envelope/MatrxEnvelopeBlock";
import { AgentOptionsMenu } from "@/features/agents/components/shared/AgentOptionsMenu";
import { AgentSaveStatus } from "@/features/agents/components/shared/AgentSaveStatus";
import { AgentSaveTapButton } from "@/features/agents/components/shared/AgentSaveTapButton";
import { AgentPeekDuplicateButton } from "@/features/agents/components/shared/AgentPeekDuplicateButton";
import { CustomDataBindingSummary } from "@/features/agents/components/variables-management/custom-data/CustomDataBindingSummary";
import { CustomDataBindingPreview } from "@/features/agents/components/variables-management/custom-data/CustomDataBindingPreview";
import { Cost } from "@/components/cost/Cost";
import { CanvasItemCard } from "@/features/canvas/components/CanvasItemCard";

export const fullSlotImpls = {
  HtmlPreviewFullScreenEditor,
  AgentEditAccessBadge,
  DataRefPreviewContent,
  NoteEditorCore,
  ToolResultCanvasOpener,
  CloudBrowserHandoffCanvasOpener,
  SimpleTerminal,
  EntityDoorControls,
  ServerNotes,
  ReferenceCopyButton,
  MandateNotesPanel,
  SurfaceBoundAgentsList,
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
  CanvasItemCard,
};
