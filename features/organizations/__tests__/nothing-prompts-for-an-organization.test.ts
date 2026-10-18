/**
 * THE GUARD FOR ORGANIZATIONS STATE RULES 11-14: nothing prompts a person to
 * choose an organization. One is active from load and is never none; a person
 * with none sees ONE "Create an organization" door, a failed read says so with
 * Retry, and every other surface just uses the active organization.
 *
 * This scans every non-test .tsx for a rendered "Choose/Pick/Select an
 * organization" (or "Choose organization") phrase on a non-comment line.
 *
 * - ALLOWED: the explicit, user-initiated switch itself (the sidebar menu's
 *   picker). Listed in SWITCH_MENUS.
 * - BASELINE: surfaces that still prompt and have not been converted yet.
 *   SHRINK-ONLY: a file that no longer matches must be removed from the list
 *   (this test fails on a stale entry), and a new file may never be added.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..", "..", "..");
const SCAN_DIRS = ["features", "components", "app", "lib", "hooks", "utils"];
const PHRASE = /\b(?:Choose|Pick|Select|choose|pick|select) an? organi[sz]ation|\b[Cc]hoose organi[sz]ation/;

const SWITCH_MENUS = new Set([
  "features/organizations/components/OrganizationPickerPopover.tsx",
  "features/organizations/components/OrganizationChooser.tsx",
]);

const BASELINE = new Set<string>([
  "app/(admin)/administration/compute/resilience-lab/page.tsx",
  "app/(core)/documents/page.tsx",
  "app/(core)/workbooks/page.tsx",
  "app/(dev)/demos/composer/ComposerPlayground.tsx",
  "app/(dev)/demos/composer/all/ComposerGallery.tsx",
  "app/(dev)/demos/composer/variables/ComposerVariables.tsx",
  "app/(dev)/demos/short-link-kit/page.dev.tsx",
  "app/oauth/consent/ConsentClient.tsx",
  "features/admin/applications/catalogs/components/AddFromLinkDialog.tsx",
  "features/admin/limits/components/AccountAddonsPanel.tsx",
  "features/admin/shared-knowledge/components/AccessExplorerTab.tsx",
  "features/admin/users/components/OrganizationsAdminClient.tsx",
  "features/admin/users/record/useUserActions.tsx",
  "features/agent-connections/components/sections/McpServersSection.tsx",
  "features/agents/components/agent-listings/AgentCard.tsx",
  "features/agents/components/shared/AgentOptionsMenu.tsx",
  "features/agents/components/tools-management/AgentToolsManager.tsx",
  "features/agents/components/variables-management/AgentVariableEditor.tsx",
  "features/agents/org-chart/components/OrgBoxPicker.tsx",
  "features/ai-work/components/AiWorkConnections.tsx",
  "features/bindings/OneBindingWorkspace.tsx",
  "features/bindings/ScopeHolderBar.tsx",
  "features/board/items/AgentFormItemBody.tsx",
  "features/commerce-intake/labels/printers/components/CertifyPrinterWizard.tsx",
  "features/connectors/ConnectorConsentDialog.tsx",
  "features/connectors/import/GoogleContactsImportPanel.tsx",
  "features/connectors/import/GoogleTasksImportPanel.tsx",
  "features/crm/components/PartyCreateForm.tsx",
  "features/crm/components/import/ImportWizard.tsx",
  "features/data-tables/records-ui-host/recordsUiHost.tsx",
  "features/entitlements/components/PlanUsagePanel.tsx",
  "features/entitlements/guardrails/SpendBudgetCard.tsx",
  "features/esign/editor/components/EsignEditor.tsx",
  "features/files/components/core/FilePreview/FilePreview.tsx",
  "features/files/components/core/FilePreview/previewers/OfficePreview.tsx",
  "features/google-workspace/directory/DirectoryReview.tsx",
  "features/hr/settings/activation/HrActivationWizard.tsx",
  "features/marketing/competitors/CompetitorIdentification.tsx",
  "features/marketing/components/brands/BrandEditorDialog.tsx",
  "features/marketing/components/settings/MoveSiteOrganizationCard.tsx",
  "features/marketing/components/sites/NewSiteForm.tsx",
  "features/marketing/content-plan/components/ContentPlanWorkbench.tsx",
  "features/marketing/discovery/youtube/YouTubeDiscovery.tsx",
  "features/marketing/google/ReadOnlySweepWorkspace.tsx",
  "features/marketing/initiatives/InitiativeEditorDialog.tsx",
  "features/marketing/seo/site-context/SiteContextWorkspace.tsx",
  "features/marketing/seo/value-system/discovery/DiscoveryLadder.tsx",
  "features/notes/components/NoteTabBar.tsx",
  "features/podcasts/generator/components/GeneratorForm.tsx",
  "features/projects/components/ProjectFormCore.tsx",
  "features/projects/components/ProjectPicker.tsx",
  "features/prompt-blocks/components/PromptBlockEditor.tsx",
  "features/rag/components/FileRagStatusChip.tsx",
  "features/rag/components/library/LibraryPublishPanel.tsx",
  "features/rag/components/search/RagReviewRepairWorkspace.tsx",
  "features/scopes/components/active-context/miller-columns/MillerColumns.tsx",
  "features/scopes/components/management/ScopesSettingsPanel.tsx",
  "features/scopes/components/pages/ContextItemPicker.tsx",
  "features/scopes/components/quick-assign/ScopeContextTargetPicker.tsx",
  "features/settings/pages/IntegrationsSettingsPage.tsx",
  "features/settings/tabs/AppearanceTab.tsx",
  "features/settings/tabs/NotificationsTab.tsx",
  "features/settings/tabs/PlanUsageTab.tsx",
  "features/settings/tabs/SandboxDefaultsTab.tsx",
  "features/settings/tabs/VoicesTab.tsx",
  "features/settings/universal/ConfigurationExport.tsx",
  "features/settings/universal/UniversalSettingsPane.tsx",
  "features/social-connections/SocialConnectionsPanel.tsx",
  "features/tasks/components/ImportTasksModal.tsx",
  "features/tasks/components/mobile/MobileProjectSelector.tsx",
  "features/tiktok-connections/TikTokConnectionsPanel.tsx",
  "features/trash/review/ChangeReviewWindow.tsx",
  "features/vision-interview/components/NewInterviewDialog.tsx",
  "features/vision-interview/components/NewInterviewExperience.tsx",
  "features/window-panels/lite-window/LiteWindowExamples.tsx",
]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (
      name.endsWith(".tsx") &&
      !/\.(test|spec)\.tsx$/.test(name) &&
      !full.includes(`${"/"}__tests__${"/"}`)
    ) {
      out.push(full);
    }
  }
}

function offenders(): string[] {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
  const hits: string[] = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (SWITCH_MENUS.has(rel)) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    if (lines.some((l) => PHRASE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l))) hits.push(rel);
  }
  return hits.sort();
}

describe("nothing prompts a person to choose an organization", () => {
  const hits = offenders();

  it("no new surface renders a choose-an-organization prompt", () => {
    const fresh = hits.filter((h) => !BASELINE.has(h));
    expect(fresh).toEqual([]);
  });

  it("the baseline only shrinks (no stale entries)", () => {
    const stale = [...BASELINE].filter((b) => !hits.includes(b));
    expect(stale).toEqual([]);
  });
});
