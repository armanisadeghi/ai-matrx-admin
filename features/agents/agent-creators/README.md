# Agent Creators — Status & Roadmap

## Architecture Principle

Every creation flow follows a **core component** pattern:

1. A **core component** contains all logic and UI (no modal/sheet/overlay wrapping).
2. **Routes** (`app/(a)/agents/new/*`) render the core component as a full page.
3. **Modals, sheets, or window panels** can later wrap the same core component.

All creation flows end the same way: **DB insert → redirect to `/agents/[id]/build`** — the existing SSR pipeline (layout, hydrator, header) handles everything from there.

---

## What's Done

### SSR Infrastructure

| File | Status | Description |
|------|--------|-------------|
| [`lib/agents/actions.ts`](../../../lib/agents/actions.ts) | Done | Server Action: `createAgentFromSeed()` — inserts seed into `agx_agent`, redirects to builder |
| [`app/(a)/agents/new/layout.tsx`](../../../app/(a)/agents/new/layout.tsx) | Done | Metadata for `/agents/new` route group |
| [`app/(a)/agents/new/page.tsx`](../../../app/(a)/agents/new/page.tsx) | Done | SSR landing page — 5 Link-based option cards, zero client JS |

### Creation Sub-Routes

| Route | File | Status | Description |
|-------|------|--------|-------------|
| `/agents/new/manual` | [`app/(a)/agents/new/manual/page.tsx`](../../../app/(a)/agents/new/manual/page.tsx) | Done | Server Action auto-submits with `TEMPLATE_DATA`, redirects to builder |
| `/agents/new/generate` | [`app/(a)/agents/new/generate/page.tsx`](../../../app/(a)/agents/new/generate/page.tsx) | **Done** | Route wrapping `AgentGenerator` core component |
| `/agents/new/builder` | [`app/(a)/agents/new/builder/page.tsx`](../../../app/(a)/agents/new/builder/page.tsx) | **Done** | SSR picker page — 3 builder option cards via `AgentBuilderPicker` |
| `/agents/new/builder/instant` | [`app/(a)/agents/new/builder/instant/page.tsx`](../../../app/(a)/agents/new/builder/instant/page.tsx) | **Done** | Route wrapping `InstantAssistantBuilder` core component |
| `/agents/new/builder/tabs` | [`app/(a)/agents/new/builder/tabs/page.tsx`](../../../app/(a)/agents/new/builder/tabs/page.tsx) | **Done** | Route wrapping `ComprehensiveBuilder` core component |
| `/agents/new/builder/customizer` | [`app/(a)/agents/new/builder/customizer/page.tsx`](../../../app/(a)/agents/new/builder/customizer/page.tsx) | **Done** | Route wrapping `ExperienceCustomizerBuilder` core component |
| `/agents/new/import` | [`app/(a)/agents/new/import/page.tsx`](../../../app/(a)/agents/new/import/page.tsx) | In Progress | Being built by another contributor |
| `/agents/new/templates` | [`app/(a)/agents/new/templates/page.tsx`](../../../app/(a)/agents/new/templates/page.tsx) | Done | Redirect to `/agents/templates` |

### Interactive Builder — Core Components

All core components live in [`features/agents/agent-creators/interactive-builder/`](./interactive-builder/) and follow the core component pattern: no modal/dialog wrapping, accept optional `onComplete` callback, self-contained with full logic.

| Component | File | Description |
|-----------|------|-------------|
| `AgentBuilderPicker` | [`interactive-builder/AgentBuilderPicker.tsx`](./interactive-builder/AgentBuilderPicker.tsx) | Server Component — 3 Link-based option cards for builder selection |
| `InstantAssistantBuilder` | [`interactive-builder/InstantAssistantBuilder.tsx`](./interactive-builder/InstantAssistantBuilder.tsx) | Client Component — select persona, tone, format, sliders for complexity/creativity/conciseness |
| `ComprehensiveBuilder` | [`interactive-builder/ComprehensiveBuilder.tsx`](./interactive-builder/ComprehensiveBuilder.tsx) | Client Component — 14-tab builder (task, context, tone, format, knowledge, examples, etc.) |
| `ExperienceCustomizerBuilder` | [`interactive-builder/ExperienceCustomizerBuilder.tsx`](./interactive-builder/ExperienceCustomizerBuilder.tsx) | Client Component — card-based personality/intelligence/output/personal-info sections |
| `AgentGenerator` | [`interactive-builder/AgentGenerator.tsx`](./interactive-builder/AgentGenerator.tsx) | Client Component — AI-powered agent generation via `useAgentLauncher`, streaming JSON extraction, saves via `useAgentBuilder` |
| Barrel export | [`interactive-builder/index.ts`](./interactive-builder/index.ts) | Re-exports all 5 components |

### Agent Builder Service

| File | Description |
|------|-------------|
| [`services/agentBuilderService.ts`](./services/agentBuilderService.ts) | Client-side `useAgentBuilder()` hook — writes to `agx_agent` table, navigates to `/agents/[id]/build` on success. Replaces the old `usePromptBuilder()` which targeted the `prompts` table. |

### Supporting Files

| File | Status | Description |
|------|--------|-------------|
| [`features/agents/constants/local-agent-templates.ts`](../constants/local-agent-templates.ts) | Done | Seed data for manual creation |
| [`app/(a)/agents/new/manual/AutoSubmitForm.tsx`](../../../app/(a)/agents/new/manual/AutoSubmitForm.tsx) | Done | Auto-submit client component for Server Action |
| [`app/api/agents/templates/[id]/use/route.ts`](../../../app/api/agents/templates/[id]/use/route.ts) | Done | API route for "Use Template" |

### Template System

| Route/File | Status | Description |
|------------|--------|-------------|
| [`app/(a)/agents/templates/page.tsx`](../../../app/(a)/agents/templates/page.tsx) | Done | SSR templates listing |
| [`app/(a)/agents/templates/[id]/page.tsx`](../../../app/(a)/agents/templates/[id]/page.tsx) | Done | SSR template detail page |
| [`features/agents/agent-creators/templates/`](./templates/) | Done | `TemplatesGrid`, `TemplateCard`, `UseTemplateButton` |

---

## What Remains

### Priority 1 — Import (In Progress — Other Contributor)

The import system is being built by another contributor. Core approach: extract `PromptImporter` from its `Dialog` wrapper, rewrite the service to target `agx_agent`, wire into `/agents/new/import/page.tsx`.

### ~~Priority 2 — AI Generation~~ (Done — Hardened)

Migrated to `AgentGenerator` core component in `interactive-builder/`. Uses `useAgentLauncher` (imperative mode) with Redux-first state management:

- **Streaming state:** `selectIsStreaming(conversationId)`, `selectStreamPhase(conversationId)` — no local `isStreaming` boolean
- **JSON extraction:** Centralized `utils/json/` system via `jsonExtraction: { enabled: true }` on launch config. Results read from `selectFirstExtractedObject(requestId)`, `selectJsonExtractionComplete(requestId)`, `selectJsonExtractionRevision(requestId)` — no legacy `extractJsonFromText` or `progressive-json-parser`
- **Config normalization:** Reusable `extractAgentConfig()` utility in `agent-creators/utils/agent-config-extractor.ts` handles all JSON-to-AgentBuilderConfig conversion
- **Admin debug:** `useDebugContext('AgentGenerator')` publishes conversationId, requestId, streamPhase, extractedJson, revision, agentName, and launchConfig
- **Error boundary:** `GeneratorErrorBoundary` wraps the response display, falling back to raw `MarkdownStream` + error banner on any rendering crash

**Next milestone:** Enable `allowChat: true` for multi-turn refinement (e.g. "make it more concise"). Requires incremental patch handling for extracted JSON.

### ~~Priority 3 — Cleanup~~ (Done)

The following legacy files have been deleted (they were dead duplicates of `features/prompts/` with zero imports):
- `PromptBuilderModal.tsx`, `PromptExecutionButton.tsx`
- `common/` (entire directory: `GeneratePromptButton`, `ImportPromptButton`, `PromptImporter`)
- `prompt-generator/` (entire directory: `PromptGenerator`, `PromptJsonDisplay`, `progressive-json-parser`, `HighlightedMessageContent`)
- `prompt-optimizers/` (entire directory: `SystemPromptOptimizer`, `FullPromptOptimizer`)
- `services/promptBuilderService.ts`, `services/prompt-import-service.ts`
- `chatbot-customizer/AICustomizerPromptBuilder.tsx`, `chatbot-customizer/ai-customization.tsx`, `chatbot-customizer/base-components.tsx`
- `instant-assistant/InstantChatAssistant.tsx`
- `tabbed-builder/TabBasedPromptBuilder.tsx`

### Priority 4 — Modal/Sheet/Window-Panel Wrappers

Once all core components are proven via routes, wrap them for other contexts:
- Modal versions for quick-access from agent listings
- Sheet versions for mobile
- Window Panel registrations for the floating panel system

---

## Directory Reference

```
features/agents/agent-creators/
├── README.md                            # This file
├── interactive-builder/                 # Core components (no modal wrapping)
│   ├── index.ts                         # Barrel exports
│   ├── AgentBuilderPicker.tsx           # Picker (3 builder options as Links)
│   ├── InstantAssistantBuilder.tsx      # Instant assistant builder
│   ├── ComprehensiveBuilder.tsx         # Tab-based builder
│   ├── ExperienceCustomizerBuilder.tsx  # Card-based customizer
│   ├── AgentGenerator.tsx               # AI-powered agent generation (Redux-first, crash-proof)
│   └── agent-generator.constants.ts     # Agent ID + launch defaults + jsonExtraction config
├── services/
│   └── agentBuilderService.ts           # useAgentBuilder (writes to agx_agent)
├── utils/
│   └── agent-config-extractor.ts        # Reusable JSON-to-AgentBuilderConfig converter
├── templates/                           # Template browsing (functional)
│   ├── TemplatesGrid.tsx
│   ├── TemplateCard.tsx
│   └── UseTemplateButton.tsx
├── instant-assistant/                   # Shared constants used by InstantAssistantBuilder
│   └── constants.ts
├── tabbed-builder/                      # Shared context + tabs used by ComprehensiveBuilder
│   ├── PromptBuilderContext.tsx
│   ├── constants.tsx
│   ├── TabBase.tsx, TabTemplate.tsx, MainPromptBuilder.tsx, PreviewTab.tsx
│   ├── TaskTab.tsx, ContextTab.tsx, ToneTab.tsx, FormatTab.tsx
│   ├── KnowledgeTab.tsx, ExamplesTab.tsx, ConstraintsTab.tsx
│   ├── AudienceTab.tsx, EvaluationTab.tsx, MotivationTab.tsx
│   ├── EmphasisTab.tsx, GenericTextareaTab.tsx
│   └── (all imported by ComprehensiveBuilder via PromptBuilderContext)
└── chatbot-customizer/                  # Shared config + cards used by ExperienceCustomizerBuilder
    ├── aiCustomizationConfig.ts
    ├── CustomizationCards.tsx
    ├── AIOptionComponents.tsx
    └── types.ts
```

## Routes Reference

```
app/(a)/agents/
├── new/
│   ├── layout.tsx                       # Metadata
│   ├── page.tsx                         # SSR landing page (5 options)
│   ├── manual/
│   │   ├── page.tsx                     # Server Action → redirect to builder
│   │   └── AutoSubmitForm.tsx
│   ├── generate/page.tsx                # AgentGenerator
│   ├── builder/
│   │   ├── page.tsx                     # AgentBuilderPicker (3 builder options)
│   │   ├── instant/page.tsx             # InstantAssistantBuilder
│   │   ├── tabs/page.tsx                # ComprehensiveBuilder
│   │   └── customizer/page.tsx          # ExperienceCustomizerBuilder
│   ├── import/page.tsx                  # In progress (other contributor)
│   └── templates/page.tsx               # Redirect to /agents/templates
├── templates/
│   ├── layout.tsx
│   ├── page.tsx                         # SSR template listing
│   └── [id]/page.tsx                    # SSR template detail
└── [id]/
    ├── layout.tsx                       # SSR: getAgent + Hydrator + Header
    └── build/page.tsx                   # AgentBuilderPage (convergence point)
```
