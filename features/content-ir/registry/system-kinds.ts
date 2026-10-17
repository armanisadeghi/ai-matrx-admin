/**
 * Eager (compiled-in) system kinds. These are available before any network
 * fetch — the parser can speculate and validate against them from the first
 * streamed byte. They are the pre-warm BOOTSTRAP FALLBACK only: once
 * `ensureWarm()` delivers the flexible_data Block Schemas rows, the DB
 * schemas override these (facets survive — see kind-registry.ts).
 *
 * Shapes mirror the flexible_data "Block Schemas" rows (category
 * `block-schemas`). Families:
 * - flashcards: flashcard_set / flashcard / enhanced_flashcard /
 *   tiered_flashcard / basic_card. `set_title` stays declared (optional) on
 *   flashcard_set as a transition alias for `title` — the OLD agent payload
 *   key — until every producer emits `title`.
 * - the 8 JSON_BLOCK_PATTERNS successors (each bridges to the SAME legacy
 *   component via `legacyBlockType` + `toLegacyServerData`): quiz_set /
 *   quiz_question, presentation_deck / presentation_slide, decision_tree /
 *   decision_node, comparison_set / comparison_criterion, diagram_spec /
 *   diagram_node / diagram_edge, math_problem / math_solution /
 *   math_solution_step, item_presentation, schema_proposal.
 */

import type { KindDefinition } from "@ai-matrx/content-ir";
// The core kinds are the package's (shared with Matrx 2); this list carries them so every reader of
// SYSTEM_KIND_DEFINITIONS (the component floor, the catalog, the registry) sees the whole compiled set.
import { FLASHCARD_AND_QUIZ_KIND_DEFINITIONS } from "@ai-matrx/rich-content/kinds/definitions/core-kind-definitions";
import { STUDY_NOTES_KIND_DEFINITIONS } from "@ai-matrx/rich-content/kinds/definitions/study-notes";
import { LESSON_SCRIPTS_KIND_DEFINITIONS } from "@ai-matrx/rich-content/kinds/definitions/lesson-scripts";
import { STUDY_PACK_KIND_DEFINITIONS } from "@ai-matrx/rich-content/kinds/definitions/study-pack";
import {
  presentationServerDataFromEnvelope,
  presentationMarkdownFromValue,
  presentationDeckKindSchema,
  presentationSlideKindSchema,
} from "../kinds/presentation-deck";
import {
  decisionTreeServerDataFromEnvelope,
  decisionTreeMarkdownFromValue,
} from "../kinds/decision-tree";
import {
  comparisonServerDataFromEnvelope,
  comparisonMarkdownFromValue,
} from "../kinds/comparison-set";
import {
  diagramServerDataFromEnvelope,
  diagramMarkdownFromValue,
} from "../kinds/diagram-spec";
import {
  mathProblemServerDataFromEnvelope,
  mathProblemMarkdownFromValue,
} from "../kinds/math-problem";
import {
  schemaProposalServerDataFromEnvelope,
  schemaProposalMarkdownFromValue,
} from "../kinds/schema-proposal";
import { itemPresentationMarkdownFromValue } from "../kinds/item-presentation";
import { MERMAID_DIAGRAM_KIND_DEFINITION } from "../kinds/mermaid-diagram";
import { SCRAPER_PAGE_KIND_DEFINITIONS } from "../kinds/scraper-page";
import { TASK_LIST_KIND_DEFINITIONS } from "../kinds/task-list";
import { RECORD_PRIMITIVE_KIND_DEFINITIONS } from "../kinds/record-primitives";
import { MAP_TOPIC_PROPOSAL_KIND_DEFINITIONS } from "../kinds/map-topic-proposal";
import { PR_PLAY_MENU_KIND_DEFINITIONS } from "../kinds/pr-play-menu";
import { MEDIA_LIST_KIND_DEFINITIONS } from "../kinds/media-list";
import { NEWS_MONITOR_KIND_DEFINITIONS } from "../kinds/news-monitor";
import { DECISION_ANSWERS_KIND_DEFINITIONS } from "../kinds/decision-answers";
import { LIST_CHANGE_PROPOSAL_KIND_DEFINITIONS } from "../kinds/list-change-proposal";
import { FLASHCARD_DECK_CARDS_KIND_DEFINITIONS } from "../kinds/flashcard-deck-cards";
import { RESOURCE_COLLECTION_KIND_DEFINITIONS } from "../kinds/resource-collection";
import { PROGRESS_TRACKER_KIND_DEFINITIONS } from "../kinds/progress-tracker";
import { TIMELINE_KIND_DEFINITIONS } from "../kinds/timeline";
import { STRUCTURED_INFO_KIND_DEFINITIONS } from "../kinds/structured-info";
import { TRANSCRIPT_KIND_DEFINITIONS } from "../kinds/transcript";
import { TROUBLESHOOTING_KIND_DEFINITIONS } from "../kinds/troubleshooting-guide";
import { COOKING_RECIPE_KIND_DEFINITIONS } from "../kinds/cooking-recipe";
import { RESEARCH_REPORT_KIND_DEFINITIONS } from "../kinds/research-report";
import { QUESTIONNAIRE_KIND_DEFINITIONS } from "../kinds/questionnaire";
import { VIDEO_PROMPT_OPTIONS_KIND_DEFINITIONS } from "../kinds/video-prompt-options";
import { KEYWORD_RESEARCH_KIND_DEFINITIONS } from "../kinds/keyword-research";
import { VIDEO_TRANSCRIPT_RESEARCH_KIND_DEFINITIONS } from "../kinds/video-transcript-research";
import { SEO_AUTHORITY_ROUTE_KIND_DEFINITIONS } from "../kinds/seo-authority-route-analysis";
import { PAGE_BRIEF_KIND_DEFINITIONS } from "../kinds/page-brief";
import { EPISODE_TITLE_OPTIONS_KIND_DEFINITIONS } from "../kinds/episode-title-options";
import { MEDIA_CHAPTERS_KIND_DEFINITIONS } from "../kinds/media-chapters";
import { MASTERWORK_CHECKUP_KIND_DEFINITIONS } from "../kinds/masterwork-checkup-finding";
import { MASTERWORK_RESULT_KIND_DEFINITIONS } from "../kinds/masterwork-result";
import { MASTERWORK_RULE_DRAFT_KIND_DEFINITIONS } from "../kinds/masterwork-rule-draft";
import { SERIAL_OBSERVATION_TIMELINE_KIND_DEFINITIONS } from "../kinds/serial-observation-timeline";
import { MASTERWORK_UNFOLDING_KIND_DEFINITIONS } from "../kinds/masterwork-unfolding";
import { REFUSAL_KIND_DEFINITIONS } from "../kinds/refusal";
import { AGENT_RESULT_KIND_DEFINITIONS } from "../kinds/agent-result";
import { RUNTIME_WRAPPER_KIND_DEFINITIONS } from "../kinds/runtime-wrappers";
import { GENERATED_IMAGE_SET_KIND_DEFINITIONS } from "../kinds/generated-image-set";
import { GENERATED_VIDEO_SET_KIND_DEFINITIONS } from "../kinds/generated-video-set";
import { GENERATED_AUDIO_KIND_DEFINITIONS } from "../kinds/generated-audio";
import { MEDIA_ASSET_KIND_DEFINITIONS } from "../kinds/media-asset";
import { PODCAST_EPISODE_KIND_DEFINITIONS } from "../kinds/podcast-episode";
import { MEMORY_AID_KIND_DEFINITIONS } from "../kinds/memory-aid";
import { SEO_PACKAGE_KIND_DEFINITIONS } from "../kinds/seo-package";
import { PLAN_PAGE_RESEARCH_KIND_DEFINITIONS } from "../kinds/plan-page-research";
import { PLAN_PAGE_OUTLINE_KIND_DEFINITIONS } from "../kinds/plan-page-outline";
import { PLAN_PAGE_DRAFT_KIND_DEFINITIONS } from "../kinds/plan-page-draft";
import { PLAN_PAGE_REVIEW_KIND_DEFINITIONS } from "../kinds/plan-page-review";
import { PLAN_SHAPE_RECOMMENDATION_KIND_DEFINITIONS } from "../kinds/plan-shape-recommendation";
import { CMS_PAGE_BUILD_KIND_DEFINITIONS } from "../kinds/cms-page-build";
import { CMS_HTML_PAGE_RESULT_KIND_DEFINITIONS } from "../kinds/cms-html-page-result";
import { APPLET_BUILD_RESULT_KIND_DEFINITIONS } from "../kinds/applet-build-result";
import { SPACES_RESULT_KIND_DEFINITIONS } from "../kinds/spaces-results";
import { INGESTED_SOURCES_KIND_DEFINITIONS } from "../kinds/ingested-sources";
import { SEARCH_RESULTS_KIND_DEFINITIONS } from "../kinds/search-results";
import { RANK_KINDS_KIND_DEFINITIONS } from "../kinds/rank-kinds";
import { RAG_KINDS_KIND_DEFINITIONS } from "../kinds/rag-kinds";
import { TABLE_KINDS_KIND_DEFINITIONS } from "../kinds/table-kinds";
import { SOCIAL_KINDS_KIND_DEFINITIONS } from "../kinds/social-kinds";
import { ANSWER_KINDS_KIND_DEFINITIONS } from "../kinds/answer-kinds";
import { TRUST_ENVELOPE_KIND_DEFINITIONS } from "../kinds/trust-envelope";
import { COMMERCE_KINDS_KIND_DEFINITIONS } from "../kinds/commerce-kinds";
import { PRINT_LULU_KIND_DEFINITIONS } from "../kinds/print-kinds";

export const SYSTEM_KIND_DEFINITIONS: KindDefinition[] = [
  // Gold-mine sweep (Stage 6 pulled forward): kinds engineered from existing
  // renderables — each definition lives in kinds/<slug>.ts with its bridge.
  // kinds/ modules are cycle-free by construction (core/envelope-value) so
  // these consts are always defined here regardless of import entry point.
  MERMAID_DIAGRAM_KIND_DEFINITION,
  ...SCRAPER_PAGE_KIND_DEFINITIONS,
  ...TASK_LIST_KIND_DEFINITIONS,
  // KINDS-GLUE wave 4.1 (chair V1/V2): `relation` (alias `platform_record`) and `pick_list`.
  // Python-owned models: aidream/aidream/kinds/record_primitives.py.
  ...RECORD_PRIMITIVE_KIND_DEFINITIONS,
  // Topical map: the tree the map author proposes (Lane G, R12). One compiled
  // component, `MapTopicProposalBlock`, over the shared `TopicTree`.
  ...MAP_TOPIC_PROPOSAL_KIND_DEFINITIONS,
  ...PR_PLAY_MENU_KIND_DEFINITIONS,
  ...MEDIA_LIST_KIND_DEFINITIONS,
  ...NEWS_MONITOR_KIND_DEFINITIONS,
  ...DECISION_ANSWERS_KIND_DEFINITIONS,
  ...LIST_CHANGE_PROPOSAL_KIND_DEFINITIONS,
  // Deck-wide AI steps are offered the deck as this input kind (data-only).
  ...FLASHCARD_DECK_CARDS_KIND_DEFINITIONS,
  ...RESOURCE_COLLECTION_KIND_DEFINITIONS,
  ...PROGRESS_TRACKER_KIND_DEFINITIONS,
  ...TIMELINE_KIND_DEFINITIONS,
  ...STRUCTURED_INFO_KIND_DEFINITIONS,
  ...TRANSCRIPT_KIND_DEFINITIONS,
  ...TROUBLESHOOTING_KIND_DEFINITIONS,
  ...COOKING_RECIPE_KIND_DEFINITIONS,
  ...RESEARCH_REPORT_KIND_DEFINITIONS,
  ...QUESTIONNAIRE_KIND_DEFINITIONS,
  ...VIDEO_PROMPT_OPTIONS_KIND_DEFINITIONS,
  ...KEYWORD_RESEARCH_KIND_DEFINITIONS,
  ...VIDEO_TRANSCRIPT_RESEARCH_KIND_DEFINITIONS,
  ...SEO_AUTHORITY_ROUTE_KIND_DEFINITIONS,
  ...PAGE_BRIEF_KIND_DEFINITIONS,
  ...EPISODE_TITLE_OPTIONS_KIND_DEFINITIONS,
  ...MEDIA_CHAPTERS_KIND_DEFINITIONS,
  ...MASTERWORK_CHECKUP_KIND_DEFINITIONS,
  // THE VALUE CONTRACT for the Rulebook surface's `rule_draft` write target.
  // Schema-only (no bridge, no compiled block): its component is a
  // `source='db'` card. See kinds/masterwork-rule-draft.ts.
  ...MASTERWORK_RESULT_KIND_DEFINITIONS,
  ...MASTERWORK_RULE_DRAFT_KIND_DEFINITIONS,
  ...SERIAL_OBSERVATION_TIMELINE_KIND_DEFINITIONS,
  // The UNFOLDING-CASE kinds — the case oracle's growing ledger and the
  // desk's ruling. One component each; see kinds/masterwork-unfolding.ts.
  ...MASTERWORK_UNFOLDING_KIND_DEFINITIONS,
  // THE REFUSAL — an honest "not yet" as a first-class RESULT: the headline,
  // every missing fact with why it matters and how to get it, and whatever
  // the desk can already say. Never an error, never a toast, never an empty
  // screen. See kinds/refusal.ts.
  ...REFUSAL_KIND_DEFINITIONS,
  // The canonical output of EVERY matrx-ai graph action. Registered 2026-08-18
  // after an active, componentless `agent_result` printed the verbatim system
  // prompt and the token bill into a learner's "Study notes" box.
  ...AGENT_RESULT_KIND_DEFINITIONS,
  // The RUNTIME WRAPPER kinds — `node_outcome` / `run_result`. Instance
  // context (which workflow, which node, timing, the kind verdict) with the
  // data kind NESTED inside; their components render provenance chrome only
  // and hand `output` back to this registry. See kinds/runtime-wrappers.ts.
  ...RUNTIME_WRAPPER_KIND_DEFINITIONS,
  // Media workflow-I/O (python-owned models — see each module header).
  ...GENERATED_IMAGE_SET_KIND_DEFINITIONS,
  ...GENERATED_VIDEO_SET_KIND_DEFINITIONS,
  ...GENERATED_AUDIO_KIND_DEFINITIONS,
  ...PODCAST_EPISODE_KIND_DEFINITIONS,
  // `media_asset` (Arman's 2026-09-08 media-kind ruling) — the ONE durable
  // media handle a producing mandate delivers. ADDITIVE ONLY: the markdown
  // splitter's bare-URL floor (detectImageMarkdown / extractAudioLink /
  // detectVideoMarkdown → the image/audio/video blocks) is untouched and still
  // handles anything that arrives without structure. See kinds/media-asset.ts.
  ...MEDIA_ASSET_KIND_DEFINITIONS,
  // Education Memory Tools (VISION §11): the full memory-aid artifact + the
  // per-flashcard hint. Registered 2026-08-17 after both shipped unregistered
  // and streamed as raw JSON in the LiveRunWindow.
  ...MEMORY_AID_KIND_DEFINITIONS,
  ...SEO_PACKAGE_KIND_DEFINITIONS,
  // Website Factory per-page pipeline (`plan.node_artifact`, one kind per
  // step): research → family placement → draft → review → build. Every one is
  // persisted by aidream, which is the ONE writer; these render it.
  ...PLAN_PAGE_RESEARCH_KIND_DEFINITIONS,
  ...PLAN_PAGE_OUTLINE_KIND_DEFINITIONS,
  ...PLAN_PAGE_DRAFT_KIND_DEFINITIONS,
  ...PLAN_PAGE_REVIEW_KIND_DEFINITIONS,
  // Setup's shape planner is also python-owned. Its active root row has a
  // NULL `data[]`, so this mirror is the parser floor that lets the live DB
  // component receive the recommendation instead of a degraded raw object.
  ...PLAN_SHAPE_RECOMMENDATION_KIND_DEFINITIONS,
  ...CMS_PAGE_BUILD_KIND_DEFINITIONS,
  ...CMS_HTML_PAGE_RESULT_KIND_DEFINITIONS,
  // The Applet builder's answer (applets.build / applets.fix): partial-ready.
  ...APPLET_BUILD_RESULT_KIND_DEFINITIONS,
  // The Spaces agents' answers (spaces.build / design_database / move_in): complete-only.
  ...SPACES_RESULT_KIND_DEFINITIONS,
  ...INGESTED_SOURCES_KIND_DEFINITIONS,
  // The package's core study kinds (@ai-matrx/rich-content): study notes, and study_pack_v2
  // (2026-08-22) — the spoken-lesson artifact + the composed pack root that delegates each member
  // to its own kind's component.
  ...STUDY_NOTES_KIND_DEFINITIONS,
  ...LESSON_SCRIPTS_KIND_DEFINITIONS,
  ...STUDY_PACK_KIND_DEFINITIONS,
  // Search kind family (Search Kinds Pilot, 2026-08-20): the merged
  // provider-agnostic web-search collection + item kinds + primitives.
  // Python-owned models: aidream/aidream/services/search_kinds/models.py.
  ...SEARCH_RESULTS_KIND_DEFINITIONS,
  // Rank / SERP-landscape family (Rank Kinds Run, 2026-08-24): the tracked
  // target, the position reading, the paid-call receipt, and the placement
  // whose payload is a union over the SHIPPED search kinds above — a
  // convergence family that mints no second copy of a search result.
  // Python-owned models: aidream/aidream/services/rank_kinds/models.py.
  ...RANK_KINDS_KIND_DEFINITIONS,
  // Social-intelligence family (SI-07c, 2026-10-09): posts, profiles, transcripts,
  // outlier rows, ads, swipe collections. Python-owned: aidream services/social.
  ...SOCIAL_KINDS_KIND_DEFINITIONS,
  // Answer-action kinds (2026-10-11): `contact` (Save contact) and `event` (Add to calendar).
  ...ANSWER_KINDS_KIND_DEFINITIONS,
  // RAG retrieval + citation family (RAG Kinds Run, 2026-08-24). `source_ref`
  // is a SYSTEM-WIDE primitive, not a RAG kind — "here is a fact, and here is
  // where it came from" had been built four times in four vocabularies, and
  // this is the one shape all of them describe. `rag_search_result` and
  // `rag_cross_doc_search_result` are mirrored at their POST-cutover shape; see
  // the module header. Python-owned models:
  // aidream/aidream/services/rag_kinds/models.py.
  ...RAG_KINDS_KIND_DEFINITIONS,
  // Tabular family (Table Kinds Run, 2026-08-25). `data_table` is a SYSTEM-WIDE
  // PRIMITIVE: a SQL result, a user data-table lookup, a parsed CSV and a table
  // lifted out of a PDF are one rows-and-columns shape that was wearing five
  // names and agreeing on no field. Everything that returns rows nests this
  // rather than minting its own. `sql_query_result` / `table_rows` /
  // `pdf_table_extraction` gain an optional `table` projection of it at
  // cutover and are deliberately not mirrored yet — see the module header.
  // Python-owned models: aidream/aidream/services/table_kinds/models.py.
  ...TABLE_KINDS_KIND_DEFINITIONS,
  // Commerce intake-to-listing pipeline (2026-08-29). Python-owned models:
  // aidream/aidream/kinds/commerce.py. The former skeptic_challenge draft is
  // intentionally absent: its emitter reuses value_assessment.
  ...COMMERCE_KINDS_KIND_DEFINITIONS,
  // The Lulu print lane (2026-08-30). Python-owned models:
  // aidream/aidream/kinds/print_lulu.py — a quote, the shipping levels for a
  // destination, a cover canvas, the catalog subset matching a filter, and a
  // print job. Every amount is a decimal string and stays one.
  ...PRINT_LULU_KIND_DEFINITIONS,
  // Compiled MIRROR of the already-registered python-owned `trust_envelope` +
  // `citation` kinds (their DB rows carry a NULL `data[]`, so nothing else can
  // resolve them). Registered here so every kind that carries grounding
  // REFERENCES the one shape instead of inlining a copy — see
  // kinds/trust-envelope.ts.
  ...TRUST_ENVELOPE_KIND_DEFINITIONS,
  // flashcard_set / flashcard / enhanced_flashcard / tiered_flashcard / basic_card and quiz_set /
  // quiz_question: the package's core kinds (@ai-matrx/rich-content), listed here in their place.
  ...FLASHCARD_AND_QUIZ_KIND_DEFINITIONS,

  // ── presentation (legacy root key `presentation`) ───────────────────────
  {
    kind: "presentation_deck",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "presentation",
    toLegacyServerData: presentationServerDataFromEnvelope,
    toMarkdown: presentationMarkdownFromValue,
    artifact: { canvasType: "presentation" },
    persistence: { persistStructured: true },
    // Schema is the single source of truth in kinds/presentation-deck.ts —
    // referenced (not re-declared) so the floor never drifts from the DB row.
    schema: presentationDeckKindSchema,
  },
  {
    kind: "presentation_slide",
    schemaSource: "system",
    tier: "eager",
    schema: presentationSlideKindSchema,
  },

  // ── decision tree (legacy root key `decision_tree`) ─────────────────────
  {
    kind: "decision_tree",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "decision_tree",
    toLegacyServerData: decisionTreeServerDataFromEnvelope,
    toMarkdown: decisionTreeMarkdownFromValue,
    artifact: { canvasType: "decision-tree" },
    persistence: { persistStructured: true },
    schema: {
      kind: "decision_tree",
      fields: {
        title: { type: "string", required: true },
        description: { type: "string" },
        root: { type: "object", kind: "decision_node", required: true },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },
  {
    kind: "decision_node",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "decision_node",
      fields: {
        // A node carries `question` (branching) OR `action` (leaf).
        question: { type: "string" },
        action: { type: "string" },
        description: { type: "string" },
        priority: { type: "string" },
        category: { type: "string" },
        estimatedTime: { type: "string" },
        yes: { type: "object", kind: "decision_node" },
        no: { type: "object", kind: "decision_node" },
      },
    },
  },

  // ── comparison table (legacy root key `comparison`) ─────────────────────
  {
    kind: "comparison_set",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "comparison_table",
    toLegacyServerData: comparisonServerDataFromEnvelope,
    toMarkdown: comparisonMarkdownFromValue,
    artifact: { canvasType: "comparison" },
    persistence: { persistStructured: true },
    schema: {
      kind: "comparison_set",
      fields: {
        title: { type: "string", required: true },
        description: { type: "string" },
        items: { type: "string[]", required: true },
        criteria: {
          type: "array",
          itemKinds: ["comparison_criterion"],
          required: true,
        },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },
  {
    kind: "comparison_criterion",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "comparison_criterion",
      fields: {
        name: { type: "string", required: true },
        // One value per compared item. Authored as strings ("9", "true",
        // "$$") — the schema grammar has no mixed scalar array. Numeric /
        // boolean emissions demote the node to raw but SURVIVE via residue;
        // the bridge reconstructs and the legacy parser normalizes them.
        values: { type: "string[]", required: true },
        type: { type: "string" },
        weight: { type: "number" },
        higherIsBetter: { type: "boolean" },
      },
    },
  },

  // ── diagram (legacy root key `diagram`) ─────────────────────────────────
  {
    kind: "diagram_spec",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "diagram",
    toLegacyServerData: diagramServerDataFromEnvelope,
    toMarkdown: diagramMarkdownFromValue,
    artifact: { canvasType: "diagram" },
    persistence: { persistStructured: true },
    schema: {
      kind: "diagram_spec",
      fields: {
        title: { type: "string", required: true },
        description: { type: "string" },
        type: { type: "string" },
        nodes: { type: "array", itemKinds: ["diagram_node"], required: true },
        edges: { type: "array", itemKinds: ["diagram_edge"] },
        layout: {
          type: "inline_object",
          fields: {
            direction: { type: "string" },
            spacing: { type: "number" },
            algorithm: { type: "string" },
          },
        },
        renderHints: {
          type: "inline_object",
          fields: {
            showLegend: { type: "boolean" },
            showEdgeLabels: { type: "boolean" },
            compactNodes: { type: "boolean" },
            hideArrows: { type: "boolean" },
          },
        },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },
  {
    kind: "diagram_node",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "diagram_node",
      fields: {
        id: { type: "string", required: true },
        label: { type: "string", required: true },
        type: { type: "string" },
        description: { type: "string" },
        details: { type: "string" },
        position: {
          type: "inline_object",
          fields: {
            x: { type: "number", required: true },
            y: { type: "number", required: true },
          },
        },
        // Pedigree fields
        gender: { type: "string" },
        affected: { type: "boolean" },
        deceased: { type: "boolean" },
        proband: { type: "boolean" },
        birthYear: { type: "string" },
        deathYear: { type: "string" },
        generation: { type: "number" },
        // Visual overrides
        color: { type: "string" },
        icon: { type: "string" },
      },
    },
  },
  {
    kind: "diagram_edge",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "diagram_edge",
      fields: {
        id: { type: "string" },
        source: { type: "string", required: true },
        target: { type: "string", required: true },
        label: { type: "string" },
        type: { type: "string" },
        color: { type: "string" },
        dashed: { type: "boolean" },
        strokeWidth: { type: "number" },
        relationship: { type: "string" },
        arrow: { type: "boolean" },
        animated: { type: "boolean" },
      },
    },
  },

  // ── math problem (legacy root key `math_problem`) ───────────────────────
  {
    kind: "math_problem",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "math_problem",
    toLegacyServerData: mathProblemServerDataFromEnvelope,
    toMarkdown: mathProblemMarkdownFromValue,
    artifact: { canvasType: "math_problem" },
    persistence: { persistStructured: true },
    schema: {
      kind: "math_problem",
      fields: {
        title: { type: "string", required: true },
        course_name: { type: "string" },
        topic_name: { type: "string" },
        module_name: { type: "string" },
        description: { type: "string", nullable: true },
        intro_text: { type: "string", nullable: true },
        final_statement: { type: "string", nullable: true },
        problem_statement: {
          type: "inline_object",
          required: true,
          fields: {
            text: { type: "string", required: true },
            equation: { type: "string", required: true },
            instruction: { type: "string", required: true },
          },
        },
        solutions: {
          type: "array",
          itemKinds: ["math_solution"],
          required: true,
        },
        hint: { type: "string", nullable: true },
        resources: { type: "string[]", nullable: true },
        difficulty_level: { type: "string", nullable: true },
        related_content: { type: "string[]", nullable: true },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },
  {
    kind: "math_solution",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "math_solution",
      fields: {
        task: { type: "string", required: true },
        steps: {
          type: "array",
          itemKinds: ["math_solution_step"],
          required: true,
        },
        solutionAnswer: { type: "string", required: true },
        transitionText: { type: "string", nullable: true },
      },
    },
  },
  {
    kind: "math_solution_step",
    schemaSource: "system",
    tier: "eager",
    schema: {
      kind: "math_solution_step",
      fields: {
        title: { type: "string", required: true },
        equation: { type: "string", required: true },
        explanation: { type: "string" },
        simplified: { type: "string" },
      },
    },
  },

  // ── item presentation (legacy root key `item_presentation`) ─────────────
  // No serverData bridge: ItemPresentationBlock parses `content` itself and
  // its parser natively tolerates the FLAT kind shape (`parsed.
  // item_presentation ?? parsed`), streaming included — the type flip alone
  // routes it.
  {
    kind: "item_presentation",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "item_presentation",
    toMarkdown: itemPresentationMarkdownFromValue,
    schema: {
      kind: "item_presentation",
      fields: {
        type: { type: "string", required: true },
        id: { type: "string" },
        name: { type: "string" },
        about: { type: "string" },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },

  // ── schema proposal (legacy root key `name` + object `schema`) ──────────
  {
    kind: "schema_proposal",
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: "schema_proposal",
    toLegacyServerData: schemaProposalServerDataFromEnvelope,
    toMarkdown: schemaProposalMarkdownFromValue,
    schema: {
      kind: "schema_proposal",
      fields: {
        name: { type: "string", required: true },
        // Arbitrary JSON Schema — contents ride residue (zero loss).
        schema: {
          type: "inline_object",
          open: true,
          fields: {},
          required: true,
        },
        strict: { type: "boolean" },
        additionalDetails: { type: "inline_object", open: true, fields: {} },
      },
    },
  },
];
