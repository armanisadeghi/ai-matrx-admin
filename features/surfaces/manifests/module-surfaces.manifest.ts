/**
 * Module surfaces — the "module" level of AI Matrx › module › feature › sub-feature
 * (surface declarations W1, `common-docs/projects/surface-declarations/W1-MODULES.md` §1).
 *
 * One surface per domain-tree domain, key `matrx-default/<domain-slug>`. A module carries ONLY
 * what is true on every page, window and admin page beneath it: the person's active
 * organization (HR adds its one employer resolution). Everything is `alwaysAvailable: false` —
 * null during org bootstrap, and an inherited `true` would become a REQUIRED param in every
 * child's scope builder. The values are filled from shell state (`features/surfaces/utils/
 * module-values.ts`), never by a page. The module's identity ("this is Marketing") is words, so
 * it lives in `label` and `situation`.
 *
 * Never add tools, write targets, client tools or agent roles here: the server walks the chain
 * root-first for tool includes/excludes, so a module tool would change every child's tool list.
 * `taxonomyNode` places every child's mandates under its domain (`mandate.intelligence_placement`
 * walks the parent chain).
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const ORG_GROUP: SurfaceValueGroup = {
  key: "module_organization",
  label: "Organization",
  sortOrder: 800,
  description: "The organization the person is working in.",
};

const HR_GROUP: SurfaceValueGroup = {
  key: "module_hr",
  label: "Employer",
  sortOrder: 810,
  description: "The employer HR is resolved to for this person.",
};

const ORG_VALUES: SurfaceValue[] = [
  {
    name: "active_organization_id",
    label: "Active organization ID",
    description: "UUID of the organization the person is working in. Empty in their personal workspace.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 800,
    group: ORG_GROUP.key,
  },
  {
    name: "active_organization_name",
    label: "Active organization name",
    description: "Name of the organization the person is working in. Empty in their personal workspace.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    sortOrder: 801,
    group: ORG_GROUP.key,
  },
];

const HR_VALUES: SurfaceValue[] = [
  {
    name: "hr_scope_mode",
    label: "HR scope mode",
    description: "Whether HR is showing one employer or several (the HR layout's employer resolution).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 10,
    sortOrder: 810,
    group: HR_GROUP.key,
  },
  {
    name: "hr_employer_names",
    label: "Employers",
    description: "Names of every employer this person can do HR work for.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 811,
    group: HR_GROUP.key,
  },
  {
    name: "hr_active_employer_name",
    label: "Active employer",
    description: "Name of the employer HR is showing right now. Empty while the person picks one.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    sortOrder: 812,
    group: HR_GROUP.key,
  },
  {
    name: "hr_persona",
    label: "HR role",
    description: "The person's role in HR for the active employer (for example admin, manager, employee).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 12,
    sortOrder: 813,
    group: HR_GROUP.key,
  },
];

const ORG_CLAUSE = ", working in {active_organization_name|their personal workspace}.";

function moduleSurface(
  slug: string,
  label: string,
  doing: string,
  extra?: { values: SurfaceValue[]; groups: SurfaceValueGroup[]; situation: string },
): SurfaceManifest {
  return {
    surfaceName: `matrx-default/${slug}`,
    client: "matrx-default",
    executor: MATRX_WEB_APP_EXECUTOR,
    executionMode: "python-stream",
    label,
    description: `The ${label} module: what is true on every page, window and admin page in ${label}.`,
    taxonomyNode: slug,
    situation:
      extra?.situation ?? `{user.name|The person} is in AI Matrx › ${label}, ${doing}${ORG_CLAUSE}`,
    groups: extra ? [ORG_GROUP, ...extra.groups] : [ORG_GROUP],
    values: extra ? [...ORG_VALUES, ...extra.values] : ORG_VALUES,
  };
}

// ── Product ────────────────────────────────────────────────────────────────
export const agentsModuleManifest = moduleSurface("agents", "Agents", "building, testing or running AI agents (agent studio, shortcuts, connections, skills)");
export const appletsModuleManifest = moduleSurface("applets", "Applets", "working with Applets, the apps customers build on top of agents");
export const chatModuleManifest = moduleSurface("chat", "Chat", "in a conversation with an AI agent (chat, AI Work, voice chat, memory)");
export const workflowsModuleManifest = moduleSurface("workflows", "Workflows", "building, scheduling or watching workflows and automations");
export const intelligenceModuleManifest = moduleSurface("intelligence", "Intelligence", "reviewing the jobs AI does across the platform (mandates, reports, hindsight)");
export const masterworkModuleManifest = moduleSurface("masterwork", "Masterwork", "capturing an expert's knowledge (vision interviews, rulebooks)");
export const knowledgeModuleManifest = moduleSurface("knowledge", "Knowledge", "working with their knowledge: sources, data stores, search and research topics");
export const filesModuleManifest = moduleSurface("files", "Files", "working with their files and documents (file browser, PDF tools, connected storage)");
export const mediaModuleManifest = moduleSurface("media", "Media", "working with images and video (manager, generator, editor, camera)");
export const audioModuleManifest = moduleSurface("audio", "Audio", "working with recordings and transcripts");
export const contentModuleManifest = moduleSurface("content", "Content", "writing or editing content (notes, documents, workbooks, maps, presentations)");
export const dataModuleManifest = moduleSurface("data", "Data", "working with structured data (tables, pick lists, scopes and context items)");
export const codeModuleManifest = moduleSurface("code", "Code", "writing code in the code workspace");
export const computerModuleManifest = moduleSurface("computer", "Computer", "working with their own computers through the desktop app (connected devices, terminal, files on that computer)");
export const workspaceModuleManifest = moduleSurface("workspace", "Workspace", "in their workspace (dashboard, projects, tasks, boards, war rooms)");
export const webModuleManifest = moduleSurface("web", "Web", "pulling information from the web (scraper)");
export const publishModuleManifest = moduleSurface("publish", "Publish", "publishing (sites and pages, podcasts, artifacts, printing, sharing)");
export const communicationsModuleManifest = moduleSurface("communications", "Communications", "communicating (messages, meetings, templates, personal staff)");
export const crmModuleManifest = moduleSurface("crm", "CRM", "working with their contacts and relationships in the CRM");
export const marketingModuleManifest = moduleSurface("marketing", "Marketing", "doing marketing work (brands, websites, SEO, content plans, social)");
export const humanResourcesModuleManifest = moduleSurface("human-resources", "Human Resources", "", {
  values: HR_VALUES,
  groups: [HR_GROUP],
  situation:
    "{user.name|The person} is in AI Matrx › Human Resources, doing HR work for {hr_active_employer_name|one of their employers} " +
    "({hr_persona|role not resolved yet})" +
    ORG_CLAUSE,
});
export const integrationsModuleManifest = moduleSurface("integrations", "Integrations", "connecting outside services");
export const accountModuleManifest = moduleSurface("account", "Account", "managing their account, organization, settings, billing or feedback");

// ── Industries ─────────────────────────────────────────────────────────────
export const educationModuleManifest = moduleSurface("education", "Education", "learning or teaching in the Education area");
export const legalModuleManifest = moduleSurface("legal", "Legal", "in the Legal area");
export const commerceModuleManifest = moduleSurface("commerce", "Commerce", "in the Commerce area (intake, listings, labels)");

// ── Behind the scenes (admin only) ─────────────────────────────────────────
export const aiModuleManifest = moduleSurface("ai", "AI", "administering AI models and AI usage");
export const platformModuleManifest = moduleSurface("platform", "Platform", "administering the platform (surfaces, components, docs, search, limits)");
export const architectureModuleManifest = moduleSurface("architecture", "Architecture", "inspecting the system (database, server, streams, sandboxes, kinds)");
export const appsModuleManifest = moduleSurface("apps", "Apps", "administering our own client apps and their sync");

// ── Behind the scenes (logged-out site): no signed-in person, no organization ──
export const publicWebModuleManifest: SurfaceManifest = {
  surfaceName: "matrx-default/public-web",
  client: "matrx-default",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Public Web",
  description: "The Public Web module: the logged-out AI Matrx site.",
  taxonomyNode: "public-web",
  situation: "A visitor who is not signed in is on the public AI Matrx site.",
  groups: [],
  values: [],
};
