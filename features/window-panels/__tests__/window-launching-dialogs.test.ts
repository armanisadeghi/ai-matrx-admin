import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const coexistenceHosts = [
  "features/admin/users/components/OrganizationsAdminClient.tsx",
  "features/agents/components/builder/message-builders/AddBlockButton.tsx",
  "features/agents/components/builder/message-builders/system-instructions/SystemPromptOptimizer.tsx",
  "../aidream/apps/shared/chat/src/agents/components/messages-display/message-options/EditHistoryDialog.tsx",
  "features/cms/components/CmsPageAiActionDialog.tsx",
  "features/marketing/change-tracking/SeoChangeTrackingWorkspace.tsx",
  "features/marketing/components/pages/CaptureObservations.tsx",
  "features/marketing/seo/value-system/dimensions/MatcherEditor.tsx",
  "features/messaging/components/NewConversationDialog.tsx",
  "features/rag/components/documents/DocumentViewer.tsx",
  "features/transcript-studio/components/columns/AudioImportDialog.tsx",
] as const;

describe("dialogs that launch WindowPanels", () => {
  it.each(coexistenceHosts)(
    "%s remains non-modal and open while its child window is used",
    (relativePath) => {
      const source = fs.readFileSync(path.join(root, relativePath), "utf8");

      expect(source).toContain("modal={false}");
      expect(source).toMatch(
        /onInteractOutside=\{\(event\) => event\.preventDefault\(\)\}/,
      );
    },
  );
});
