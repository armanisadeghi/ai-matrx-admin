// providers/chatUiRegistrationBaseImpl.ts
//
// The implementations behind chatUiRegistrationBase.ts's lazily-loaded component slots. Loaded
// through that file's ONE `import()` the first time any of these slots renders — never in a
// route's first load (THE FRAGMENTATION LAW: one impl module per registration file, one async
// edge). Import this module from nowhere else.

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import AdvancedMenu from "@/components/official/AdvancedMenu";
import { TableChooser } from "@/features/unified-data/hub/TableChooser";
import { ConnectorMark } from "@/features/connectors/ConnectorMark";
import { AttachedResourcesSection } from "@/features/connectors/AttachedResourcesSection";
import { WebpageSnapshotView } from "@/features/resource-manager/webpage/WebpageSnapshotView";
import { MessageFilesStrip } from "@/features/code/views/history/MessageFilesStrip";
import { RulebookNudge } from "@/features/masterwork/oracle/RulebookNudge";
import { NegativeVerdictFollowUp } from "@/features/review-walk/components/NegativeVerdictFollowUp";
import { GmailReviewCard } from "@/features/google-workspace/agent/GmailReviewCard";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { ReviewAnswersLink } from "@/features/agents/decision-review/components/ReviewAnswersLink";
import { RecordChangeApprovalCard } from "@/features/record-change-approvals/RecordChangeApprovalCard";
import { DockRunCard } from "@/features/records-tool-display/DockRunCard";
import { SystemInstructionModal } from "@/features/agents/components/builder/message-builders/system-instructions/SystemInstructionModal";
import { PdfNamedSurfaceSwitcher } from "@/features/pdf/components/PdfNamedSurfaceSwitcher";
import { ChangeDiff } from "@/components/ui/change-diff";

export const baseSlotImpls = {
  ErrorAlchemyMenu,
  AdvancedMenu,
  TableChooser,
  ConnectorMark,
  AttachedResourcesSection,
  WebpageSnapshotView,
  MessageFilesStrip,
  RulebookNudge,
  NegativeVerdictFollowUp,
  GmailReviewCard,
  ShareButton,
  ReviewAnswersLink,
  RecordChangeApprovalCard,
  BackgroundRunCard: DockRunCard,
  SystemInstructionModal,
  PdfNamedSurfaceSwitcher,
  ChangeDiff,
};
