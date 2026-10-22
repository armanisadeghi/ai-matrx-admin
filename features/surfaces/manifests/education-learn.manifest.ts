/**
 * Surface manifest — Study guides (`matrx-user/education-learn`).
 *
 * The PUBLIC READER half of the `/education/learn` prefix: the anonymous,
 * server-rendered study-guide library index (`/education/learn`) and article
 * pages (`/education/learn/[...slug]`), both 100% SSR/ISR marketing/reader
 * content over `education.learn_doc` rows published to the web. NOT the
 * authoring surface — see `education-learn-authoring.manifest.ts`, whose
 * header documents this exact split and explicitly left this half as future
 * work ("authoring it is real work, and honestly a separate job").
 *
 * WHY THIS MANIFEST EXISTS AT ALL. `route-to-surface.ts` maps the whole
 * `/education/learn` prefix to `matrx-user/education-learn`, and `ui.ui_surface`
 * already carries an ACTIVE row for it — but until now that name resolved to
 * nothing: no manifest, no emitter, not even a mount point. THE COMPLETENESS
 * LAW still applies to a server-rendered page: `EducationLearnPage` and
 * `LearnArticlePage` genuinely load doc data (the published list; one
 * published doc's full content), so that data is declared here; the index
 * emits it, the article half does not yet — see the readiness note.
 *
 * THE EMITTER (index only). The pages stay Server Components (ISR, SEO). The
 * index hands its already-loaded published list to `LearnIndexSurface`
 * (`features/education/publishing/components/`), a thin client wrapper that
 * mounts `SurfaceRuntimeProvider` + the page's right-click menu around the
 * server-rendered grid; `learnIndexSurfaceScope.ts` builds the scope from those
 * rows (no fetch). The article page has no wrapper yet — its article_* values
 * are declared vocabulary, not emitted.
 *
 * Curated groups (band 0-899):
 *
 *   reader_view    Which of the two reader pages the visitor is on
 *   guide_library   The index's published guide list
 *   guide_article   The open article's full content
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "reader_view",
    label: "Reader view",
    sortOrder: 100,
    description:
      "Which of the two public study-guide pages the visitor is on — the index or one open article.",
  },
  {
    key: "guide_library",
    label: "Guide library",
    sortOrder: 200,
    description:
      "The index page's list of every published study guide (/education/learn).",
  },
  {
    key: "guide_article",
    label: "Open guide",
    sortOrder: 300,
    description:
      "The full content of the one published study guide open on the article page (/education/learn/[...slug]).",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  // ── Reader view ────────────────────────────────────────────────────────
  {
    name: "view",
    label: "Current view",
    description:
      'Which public reader page is open: "index" (the study-guide library at /education/learn) or "article" (one open guide at /education/learn/[...slug]). The index emits "index" (LearnIndexSurface); the article page does not emit yet.',
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 7,
    sortOrder: 300,
    group: "reader_view",
  },

  // ── Guide library (index) ──────────────────────────────────────────────
  {
    name: "guide_count",
    label: "Published guide count",
    description:
      "How many study guides are published and listed on the index. Zero is possible before the first guide ships. Only meaningful on the index view.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 300,
    group: "guide_library",
  },
  {
    name: "guide_library_xml",
    label: "Guide library (bundle)",
    description:
      "The index's guide grid as one XML bundle: <study_guides total shown> with one <guide href subject updated>title<summary/></guide> per card, most recently updated first (first 25; summaries clipped to 220 chars). This is what the visitor sees on screen. Only on the index view.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 3200,
    inlineUpTo: 4000,
    sortOrder: 305,
    group: "guide_library",
  },
  {
    name: "guide_library",
    label: "Guide library",
    description:
      "Every published study guide listed on the index, as { title, summary, href, subject, updated }, in the order the index shows them (most recently updated first). Full rows for lookup; guide_library_xml is the compact on-screen copy. Only on the index view.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    autoContext: false,
    sortOrder: 310,
    group: "guide_library",
  },

  // ── Open guide (article) ───────────────────────────────────────────────
  {
    name: "article_slug",
    label: "Guide slug",
    description:
      "URL path of the open guide under /education/learn (may contain '/' for hierarchy, e.g. 'biology/cell-structure'). Only meaningful on the article view.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 30,
    sortOrder: 300,
    group: "guide_article",
  },
  {
    name: "article_title",
    label: "Guide title",
    description:
      "Headline of the open guide, rendered as the page's <h1>. Only meaningful on the article view.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 60,
    sortOrder: 310,
    group: "guide_article",
  },
  {
    name: "article_summary",
    label: "Guide summary",
    description:
      "Short summary of the open guide, shown as the hero lede and used verbatim as the meta description. Only meaningful on the article view.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    sortOrder: 320,
    group: "guide_article",
  },
  {
    name: "article_subject",
    label: "Guide subject",
    description:
      "The subject slug the open guide belongs to (e.g. 'biology'), when set. Absent for a guide with no subject assigned.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 12,
    sortOrder: 330,
    group: "guide_article",
  },
  {
    name: "article_keywords",
    label: "Guide keywords",
    description:
      "SEO keywords stored on the open guide. Empty array when none were set.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 100,
    sortOrder: 340,
    group: "guide_article",
  },
  {
    name: "article_updated",
    label: "Guide updated",
    description:
      "The author-controlled content date shown to readers as 'Updated', in YYYY-MM-DD form.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 10,
    sortOrder: 350,
    group: "guide_article",
  },
  {
    name: "article_sections",
    label: "Guide body",
    description:
      "The open guide's article body — the full parsed EduSection[] the page renders (prose, feature-grid, steps, status-cards, stat-bar, faq, cta blocks). The whole content a visitor is reading. Large; bindable-only.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 6000,
    autoContext: false,
    sortOrder: 360,
    group: "guide_article",
  },
  {
    name: "article_related",
    label: "Related links",
    description:
      "The open guide's conversion cross-links — { tools?, subjects?, exams? } slug arrays — deciding which app tools and hub pages the page funnels the reader into.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 160,
    sortOrder: 370,
    group: "guide_article",
  },
];

export const educationLearnManifest: SurfaceManifest = {
  surfaceName: "matrx-user/education-learn",
  situation:
    "They are in the public study guide library: free articles that explain topics and point readers to the study tools. It has {guide_count|an unknown number of} published guides; the guide open is \"{article_title|none}\".",
  inheritsFrom: "matrx-default/education",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "Published Learn library articles, server-rendered (/education/learn).",
  label: "Study guide library",
  urlPattern: "/education/learn",
  intro: `<surface_intro>
You are on the PUBLIC study-guide reader at /education/learn — free, SEO-facing explainer articles, anonymous and server-rendered. This is not the authoring surface (that is a separate super-admin surface) and not a study session; it is what any visitor, signed in or not, reads.
On the index (\`view: "index"\`) \`guide_library_xml\` lists every published guide. On an article (\`view: "article"\`) \`article_sections\` is the full body the reader is looking at, with \`article_title\`/\`article_summary\` as the header and \`article_related\` naming which app tools and hubs the page funnels toward.
On the index, guide_library_xml is the grid the visitor sees (title, subject, updated date, summary, link) and guide_count the number published. The article_* values are not emitted yet. This page has nothing to edit: there are no write targets, so answer, recommend and link (each guide's href) — publishing guides is the separate authoring page.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
};

export const EDUCATION_LEARN_SURFACE_NAME = educationLearnManifest.surfaceName;

/** One row of `guide_library` — what the index card shows, as data. */
export interface LearnGuideLibraryRow {
  title: string;
  summary: string;
  href: string;
  subject: string | null;
  updated: string | null;
}

/**
 * Type-safe payload helper for the index view. Optional keys mirror
 * `alwaysAvailable: false`; the article_* keys are not emitted yet.
 */
export function createEducationLearnIndexScope(values: {
  view: "index";
  guide_count: number;
  guide_library_xml: string;
  guide_library: LearnGuideLibraryRow[];
}): SurfaceScopePayload {
  return values as unknown as SurfaceScopePayload;
}
