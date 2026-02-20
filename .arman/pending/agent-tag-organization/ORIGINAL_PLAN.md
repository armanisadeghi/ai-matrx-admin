# Agent System Overhaul — Master Plan

> **Created:** 2026-02-20
> **Status:** Planning — Awaiting Arman's feedback on open questions before implementation
> **Scope:** New `ag_` module, universal tagging, version control, AI model/provider/endpoint redesign, org/project/task/research integration, access control model

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [The `ag_` Module — Agent System](#2-the-ag_-module--agent-system)
3. [AI Model / Provider / Endpoint Redesign](#3-ai-model--provider--endpoint-redesign)
4. [Universal Tagging System](#4-universal-tagging-system)
5. [Version Control System](#5-version-control-system)
6. [Access Control & Sharing Model](#6-access-control--sharing-model)
7. [Org / Project / Task / Research Integration](#7-org--project--task--research-integration)
8. [RLS Rollout for `ag_` Tables](#8-rls-rollout-for-ag_-tables)
9. [Migration Strategy](#9-migration-strategy)
10. [Open Questions for Arman](#10-open-questions-for-arman)
11. [Phased Implementation Plan](#11-phased-implementation-plan)

---

## 1. Current State Analysis

### 1.1 The Prompt Ecosystem Today (13 tables, 2 views)

The prompt system has grown organically into a sprawling ecosystem with overlapping concerns:

| Layer | Tables | Status |
|-------|--------|--------|
| **Core prompts** | `prompts`, `prompt_builtins`, `prompt_templates` | Active, fragmented |
| **Apps** | `prompt_apps`, `prompt_app_executions`, `prompt_app_errors`, `prompt_app_rate_limits`, `prompt_app_categories` | Active, well-built |
| **Shortcuts** | `prompt_shortcuts`, `shortcut_categories` | Active, admin-only |
| **Actions** | `prompt_actions` | Active, bridges prompts to execution configs |
| **Custom UIs** | `prompt_custom_uis`, `prompt_custom_ui_usage`, `prompt_custom_ui_ratings`, `prompt_custom_ui_templates` | Documented, partially built |

### 1.2 The "Agent" Identity Problem

"Agent" is currently a **UI-only concept** in `/p/chat` — not a database entity:

- `AgentSelector` has hardcoded UUIDs pointing to rows in `prompts` or `prompt_builtins`
- User prompts appear as "My Agents" via `AgentsContext`
- The existing `ai_agent` table is for the **recipe/automation system** (unrelated)
- `cx_conversation` has no `agent_id` column — agent context lives only in the URL
- There's no unified way to reference "the thing you run" across prompt apps, chat agents, and shortcuts

### 1.3 The Tag/Categorization Mess

Tags exist in 5 different forms with zero consistency:

| Location | Implementation | Type |
|----------|---------------|------|
| `prompt_apps.tags` | `TEXT[]` array | Free-form, no vocabulary |
| `prompt_actions.tags` | `TEXT[]` array | Free-form, no vocabulary |
| `tools.tags` | `TEXT[]` array | Free-form, no vocabulary |
| `transcripts.tags` / `ai_runs.tags` | `TEXT[]` array | Free-form, no vocabulary |
| `rs_tag` + `rs_source_tag` (research) | Full relational model | Structured, with confidence scores |

No shared tag vocabulary. No tag management UI. No tag normalization. No user-created tags.

### 1.4 AI Model / Provider / Endpoint Issues

Current tables are thin, unstructured, and conflate concepts:

- **`ai_model`**: Mixes identity (`id`, `name`), classification (`model_class`, `api_class`), and config (`capabilities`, `controls`, `endpoints`) into JSON blobs
- **`ai_provider`**: Only has `name`, `company_description`, `documentation_link`, `models_link` — no SDK info, no auth config, no API base URLs
- **`ai_endpoint`**: Confusingly overlaps with provider — unclear what "endpoint" means vs "provider"
- **`ai_model_endpoint`**: Join table that tries to bridge the confusion
- Model IDs are arbitrary UUIDs instead of the official model identifiers (e.g., `claude-sonnet-4-20250514`)
- No deprecation/forwarding system — when a model is retired, every reference breaks
- `capabilities`, `controls` are JSONB blobs with no structure or type safety
- No input/output modality tracking
- No user preference integration
- Model ID referenced in JSONB throughout the system — impossible to write FK-based migration scripts

### 1.5 Missing Features (User Complaints)

1. **No prompt organization** — No folders, tags, categories in `/ai/prompts`. Just "My Prompts" vs "Shared"
2. **No version control** — Only `created_at`/`updated_at` timestamps. No history, no rollback, no diff
3. **Stale prompt apps** — Warning exists when prompt is updated after app, but no version pinning
4. **No bulk operations** — Cannot multi-select, bulk tag, bulk move
5. **Prompt view is raw JSON** — `/ai/prompts/view/[id]` dumps raw JSON, not user-friendly

### 1.6 Existing Module Patterns

The codebase has established a clean module pattern with `cx_` (chat, 7 tables) and `rs_` (research, 12 tables):

- Two-letter prefix for all tables in the module
- Parent table anchors the module (e.g., `cx_conversation`, `rs_topic`)
- Child tables FK to parent, RLS chains through parent
- Feature code organized under `/features/[module-name]/`
- Types in feature-specific type files
- CX system already migrated to centralized RLS

---

## 2. The `ag_` Module — Agent System

### 2.1 Philosophy

The `ag_` module is the **unified identity and execution layer** for anything that can be "run" in the system. It sits on top of prompts and builtins, providing:

- A single ID to reference any runnable agent
- Rich branding and public-facing identity
- Version control
- Organization and categorization
- Access control
- Analytics

### 2.2 Core Tables

#### `ag_agent` — The unified identity

This is the **central table** of the entire system. Every prompt, builtin, prompt app, shortcut, and chat agent resolves to an `ag_agent` row.

```
ag_agent
├── id (uuid PK)
├── slug (text UNIQUE, for public URLs)
│
├── source_type ('prompt' | 'builtin')
├── prompt_id (uuid FK → ag_prompt.id, nullable)
├── builtin_id (uuid FK → ag_builtin.id, nullable)
│   CONSTRAINT: exactly one of prompt_id/builtin_id is set based on source_type
│
├── active_version_id (uuid FK → ag_version.id, nullable)
│
├── -- Branding --
├── name (text NOT NULL)
├── tagline (text)
├── description (text)
├── long_description (text, markdown, for SEO/landing pages)
├── icon_name (text, lucide icon)
├── avatar_url (text)
├── cover_image_url (text)
├── accent_color (text, hex)
│
├── -- Public Access & SEO --
├── visibility ('private' | 'use_only' | 'public_read')
│   - private: owner + shared users only
│   - use_only: anyone can run it, prompt content hidden
│   - public_read: full prompt content visible to all
├── is_featured (boolean)
├── is_verified (boolean)
├── seo_title (text)
├── seo_description (text)
├── og_image_url (text)
│
├── -- Categorization --
├── category_id (uuid FK → ag_category.id)
│
├── -- Ownership --
├── user_id (uuid FK → auth.users, NOT NULL)
├── organization_id (uuid FK → organizations.id, nullable)
│
├── -- Stats (materialized via triggers) --
├── total_executions (bigint)
├── total_conversations (bigint)
├── avg_rating (decimal)
│
├── -- Lifecycle --
├── status ('draft' | 'active' | 'archived' | 'suspended')
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── published_at (timestamptz)
└── metadata (jsonb)
```

#### `ag_prompt` — Migrated from `prompts`

Clean version of the current `prompts` table with proper structure:

```
ag_prompt
├── id (uuid PK)
├── user_id (uuid FK → auth.users, NOT NULL)
├── name (text NOT NULL)
├── description (text)
├── messages (jsonb NOT NULL)
├── variable_defaults (jsonb)
├── tools (jsonb)
├── settings (jsonb)
├── model_id (text FK → ag_model.id, nullable)  ← EXPLICIT FK, not buried in settings JSON
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── metadata (jsonb)
```

#### `ag_builtin` — Migrated from `prompt_builtins`

```
ag_builtin
├── id (uuid PK)
├── name (text NOT NULL)
├── description (text)
├── messages (jsonb NOT NULL)
├── variable_defaults (jsonb)
├── tools (jsonb)
├── settings (jsonb)
├── model_id (text FK → ag_model.id, nullable)
├── source_prompt_id (uuid FK → ag_prompt.id, nullable, ON DELETE SET NULL)
├── source_prompt_snapshot_at (timestamptz)
├── is_active (boolean DEFAULT true)
├── created_by_user_id (uuid FK → auth.users)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── metadata (jsonb)
```

#### `ag_app` — Migrated from `prompt_apps`

```
ag_app
├── id (uuid PK)
├── agent_id (uuid FK → ag_agent.id, NOT NULL)  ← replaces prompt_id
├── user_id (uuid FK → auth.users, NOT NULL)
├── slug (text UNIQUE NOT NULL)
├── name (text NOT NULL)
├── tagline (text)
├── description (text)
├── category (text)
│
├── -- Component --
├── component_code (text NOT NULL)
├── component_language (text NOT NULL)
├── variable_schema (jsonb)
├── allowed_imports (jsonb)
├── layout_config (jsonb)
├── styling_config (jsonb)
│
├── -- Version pinning --
├── pinned_version_id (uuid FK → ag_version.id, nullable)
│   When NULL: uses agent's active_version_id
│   When set: uses this specific version regardless of agent's active
│
├── -- Publishing --
├── status ('draft' | 'published' | 'archived' | 'suspended')
├── is_verified (boolean)
├── is_featured (boolean)
├── preview_image_url (text)
├── favicon_url (text)
│
├── -- Rate limiting --
├── rate_limit_per_ip (int)
├── rate_limit_window_hours (int)
├── rate_limit_authenticated (int)
│
├── -- Stats --
├── total_executions (int)
├── unique_users_count (int)
├── success_rate (decimal)
├── avg_execution_time_ms (int)
├── total_tokens_used (int)
├── total_cost (decimal)
│
├── -- Lifecycle --
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── published_at (timestamptz)
├── last_execution_at (timestamptz)
├── metadata (jsonb)
└── search_tsv (tsvector)
```

#### `ag_app_execution` — Migrated from `prompt_app_executions`

```
ag_app_execution
├── id (uuid PK)
├── app_id (uuid FK → ag_app.id, NOT NULL)
├── agent_id (uuid FK → ag_agent.id, NOT NULL)  ← denormalized for analytics
├── version_id (uuid FK → ag_version.id, nullable)  ← which version was used
├── user_id (uuid FK → auth.users, nullable)
├── fingerprint (text)
├── ip_address (inet)
├── user_agent (text)
├── task_id (uuid NOT NULL)
├── variables_provided (jsonb)
├── variables_used (jsonb)
├── success (boolean)
├── error_type (text)
├── error_message (text)
├── execution_time_ms (int)
├── tokens_used (int)
├── cost (decimal)
├── referer (text)
├── metadata (jsonb)
└── created_at (timestamptz)
```

#### `ag_app_error` — Migrated from `prompt_app_errors`

Same structure as current, with `app_id FK → ag_app.id`.

#### `ag_app_rate_limit` — Migrated from `prompt_app_rate_limits`

Same structure as current, with `app_id FK → ag_app.id`.

#### `ag_shortcut` — Migrated from `prompt_shortcuts`

```
ag_shortcut
├── id (uuid PK)
├── agent_id (uuid FK → ag_agent.id, nullable)  ← replaces prompt_builtin_id
├── category_id (uuid FK → ag_shortcut_category.id, NOT NULL)
├── label (text NOT NULL)
├── description (text)
├── icon_name (text)
├── keyboard_shortcut (text)
├── sort_order (int)
├── scope_mappings (jsonb)
├── available_scopes (text[])
├── enabled_contexts (jsonb)
├── result_display ('modal' | 'inline' | 'background' | 'sidebar' | 'toast')
├── auto_run (boolean)
├── allow_chat (boolean)
├── show_variables (boolean)
├── apply_variables (boolean)
├── is_active (boolean)
├── created_by_user_id (uuid FK → auth.users)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### `ag_shortcut_category` — Migrated from `shortcut_categories`

Same structure as current.

#### `ag_category` — Agent categories (hierarchical)

```
ag_category
├── id (uuid PK)
├── name (text NOT NULL)
├── slug (text UNIQUE NOT NULL)
├── description (text)
├── icon_name (text)
├── parent_id (uuid FK → ag_category.id, nullable)
├── sort_order (int)
└── is_active (boolean DEFAULT true)
```

#### `ag_action` — Migrated from `prompt_actions`

```
ag_action
├── id (uuid PK)
├── agent_id (uuid FK → ag_agent.id, nullable)  ← replaces prompt_id + prompt_builtin_id dual FK
├── name (text NOT NULL)
├── description (text)
├── icon_name (text)
├── context_scopes (text[])
├── execution_config (jsonb)
├── hardcoded_values (jsonb)
├── broker_mappings (jsonb)
├── is_active (boolean)
├── is_public (boolean)
├── user_id (uuid FK → auth.users)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 2.3 What Gets Migrated vs What Gets Deprecated

| Current Table | Destination | Action |
|--------------|-------------|--------|
| `prompts` | `ag_prompt` | Migrate data, create `ag_agent` row per prompt |
| `prompt_builtins` | `ag_builtin` | Migrate data, create `ag_agent` row per builtin |
| `prompt_apps` | `ag_app` | Migrate, repoint `prompt_id` → `agent_id` |
| `prompt_app_executions` | `ag_app_execution` | Migrate, add `agent_id` + `version_id` |
| `prompt_app_errors` | `ag_app_error` | Migrate |
| `prompt_app_rate_limits` | `ag_app_rate_limit` | Migrate |
| `prompt_shortcuts` | `ag_shortcut` | Migrate, repoint `prompt_builtin_id` → `agent_id` |
| `shortcut_categories` | `ag_shortcut_category` | Migrate |
| `prompt_actions` | `ag_action` | Migrate, unify dual FK into `agent_id` |
| `prompt_app_categories` | `ag_category` | Migrate + expand |
| `prompt_templates` | `ag_template` (new) | Migrate |
| `prompt_custom_uis` | *Evaluate* | May merge into `ag_app` or keep separate |
| `prompt_custom_ui_*` | *Evaluate* | Depends on custom UI decision |
| `ai_agent` | **Deprecated** | Old recipe system, not related |
| `ai_model` | `ag_model` + `ag_model_info` | Redesign (see Section 3) |
| `ai_provider` | `ag_provider` | Redesign (see Section 3) |
| `ai_endpoint` | `ag_endpoint` | Redesign (see Section 3) |
| `ai_model_endpoint` | `ag_model_endpoint` | Redesign (see Section 3) |

### 2.4 Impact on Existing Routes

| Route | Current Source | New Source | Change Required |
|-------|---------------|------------|-----------------|
| `/ai/prompts` | `prompts` table | `ag_prompt` + `ag_agent` | Update queries, add categories/tags UI |
| `/prompt-apps` | `prompt_apps` table | `ag_app` + `ag_agent` | Update queries, use `agent_id` |
| `/p/[slug]` | `prompt_apps` + `prompts` | `ag_app` + `ag_agent` + `ag_version` | Update queries, version resolution |
| `/p/chat` | Hardcoded UUIDs + `prompts` | `ag_agent` table queries | Replace hardcoded agents with DB queries |
| `/p/chat/a/[id]` | URL agent resolution | `ag_agent.id` or `ag_agent.slug` | Direct DB lookup |
| Shortcuts system | `prompt_shortcuts` + `prompt_builtins` | `ag_shortcut` + `ag_agent` | Update queries |

---

## 3. AI Model / Provider / Endpoint Redesign

> **IMPORTANT: This section requires significantly more feedback from Arman. The items below are initial proposals based on the stated requirements. Each subsection has specific questions.**

### 3.1 Core Principle: Separate Identity from Runtime from UI

Three distinct concerns that the current tables conflate:

| Concern | Purpose | Read Pattern |
|---------|---------|-------------|
| **Runtime** | Server pulls at startup/request time. Must be fast, minimal. | Hot path — cached, small payload |
| **Information** | Display in UI, help users pick models. Rich metadata. | UI-driven — loaded on demand |
| **Configuration** | Model-specific settings, modalities, limits, defaults. | Setup/admin — loaded when configuring |

### 3.2 Proposed Tables

#### `ag_provider` — The company that makes the model

```
ag_provider
├── id (text PK, e.g., 'anthropic', 'openai', 'google')
├── name (text NOT NULL, e.g., 'Anthropic', 'OpenAI')
├── description (text)
├── website_url (text)
├── docs_url (text)
├── models_url (text)
├── logo_url (text)
├── is_active (boolean DEFAULT true)
├── sort_order (int)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### `ag_endpoint` — The server/SDK you hit

Cleanly separated from provider. A provider may have multiple endpoints. An endpoint may serve models from multiple providers (e.g., OpenRouter, AWS Bedrock).

```
ag_endpoint
├── id (text PK, e.g., 'openai-direct', 'anthropic-direct', 'openrouter', 'aws-bedrock')
├── name (text NOT NULL)
├── description (text)
├── base_url (text)  ← the actual API base URL
├── sdk (text)  ← 'openai' | 'anthropic' | 'google' | 'custom'
├── auth_type (text)  ← 'api_key' | 'oauth' | 'iam' | 'none'
├── auth_config (jsonb)  ← env var names, header format, etc.
├── is_active (boolean DEFAULT true)
├── additional_cost (boolean)
├── cost_details (jsonb)
├── params (jsonb)  ← endpoint-specific params
├── sort_order (int)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### `ag_model` — Runtime table (hot path)

The minimal table that the server reads at startup. Official model ID is the primary key.

```
ag_model
├── id (text PK)  ← OFFICIAL MODEL ID, e.g., 'claude-sonnet-4-20250514'
├── provider_id (text FK → ag_provider.id, NOT NULL)
├── model_class (text NOT NULL)  ← 'flagship' | 'standard' | 'fast' | 'reasoning' | 'vision' | 'embedding' | 'image' | 'tts' | 'stt'
├── common_name (text)  ← 'Claude Sonnet 4', 'GPT-4o'
├── context_window (int)
├── max_output_tokens (int)
├── is_active (boolean DEFAULT true)
├── is_deprecated (boolean DEFAULT false)
├── deprecated_at (timestamptz)
├── forward_to_model_id (text FK → ag_model.id, nullable)  ← DEPRECATION FORWARDING
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Key design decisions:**
- **`id` is the official model string** (e.g., `claude-sonnet-4-20250514`). This means anywhere in the system that references a model uses the actual API identifier. No translation needed.
- **`forward_to_model_id`** enables deprecation cascading. When `claude-3-opus-20240229` is deprecated, set `forward_to_model_id = 'claude-sonnet-4-20250514'` and `is_deprecated = true`. Migration scripts follow the chain.

#### `ag_model_info` — Rich metadata for UI/display

```
ag_model_info
├── model_id (text PK, FK → ag_model.id)  ← 1:1 with ag_model
├── display_name (text)
├── description (text)
├── release_date (date)
├── deprecation_date (date)
├── pricing_input_per_1m (decimal)  ← cost per 1M input tokens
├── pricing_output_per_1m (decimal)
├── pricing_cached_per_1m (decimal)
├── pricing_notes (text)
├── strengths (text[])  ← ['coding', 'analysis', 'creative writing']
├── weaknesses (text[])
├── recommended_use_cases (text[])
├── logo_variant_url (text)  ← model-specific icon/badge
├── color (text)  ← brand color for UI
├── sort_order (int)
├── metadata (jsonb)
└── updated_at (timestamptz)
```

#### `ag_model_config` — Model-specific settings and capabilities

```
ag_model_config
├── model_id (text PK, FK → ag_model.id)  ← 1:1 with ag_model
│
├── -- Input modalities --
├── supports_text_input (boolean DEFAULT true)
├── supports_image_input (boolean DEFAULT false)
├── supports_audio_input (boolean DEFAULT false)
├── supports_video_input (boolean DEFAULT false)
├── supports_file_input (boolean DEFAULT false)
│
├── -- Output modalities --
├── supports_text_output (boolean DEFAULT true)
├── supports_image_output (boolean DEFAULT false)
├── supports_audio_output (boolean DEFAULT false)
├── supports_structured_output (boolean DEFAULT false)
│
├── -- Capabilities --
├── supports_tools (boolean DEFAULT false)
├── supports_streaming (boolean DEFAULT true)
├── supports_vision (boolean DEFAULT false)
├── supports_thinking (boolean DEFAULT false)  ← extended thinking / reasoning
├── supports_caching (boolean DEFAULT false)
├── supports_batching (boolean DEFAULT false)
├── supports_json_mode (boolean DEFAULT false)
├── supports_system_message (boolean DEFAULT true)
│
├── -- Parameter ranges & defaults --
├── temperature_min (decimal)
├── temperature_max (decimal)
├── temperature_default (decimal)
├── top_p_min (decimal)
├── top_p_max (decimal)
├── top_p_default (decimal)
├── frequency_penalty_supported (boolean DEFAULT false)
├── presence_penalty_supported (boolean DEFAULT false)
├── stop_sequences_supported (boolean DEFAULT false)
├── max_stop_sequences (int)
│
├── -- Additional settings --
├── extra_params (jsonb)  ← model-specific params not covered above
├── known_issues (text[])  ← documented quirks
└── updated_at (timestamptz)
```

#### `ag_model_endpoint` — Which models are available through which endpoints

```
ag_model_endpoint
├── id (uuid PK)
├── model_id (text FK → ag_model.id, NOT NULL)
├── endpoint_id (text FK → ag_endpoint.id, NOT NULL)
├── is_available (boolean DEFAULT true)
├── priority (int DEFAULT 0)  ← higher = preferred
├── model_id_override (text)  ← if endpoint uses different model ID
├── configuration (jsonb)  ← endpoint-specific config for this model
├── notes (text)
├── created_at (timestamptz)
│
├── UNIQUE (model_id, endpoint_id)
```

#### `ag_user_model_preference` — User model preferences

```
ag_user_model_preference
├── id (uuid PK)
├── user_id (uuid FK → auth.users, NOT NULL)
├── context (text NOT NULL)  ← 'chat' | 'prompt_app' | 'research' | 'global'
├── model_id (text FK → ag_model.id, NOT NULL)
├── is_default (boolean DEFAULT false)
├── custom_settings (jsonb)  ← user-level overrides (temperature, etc.)
├── created_at (timestamptz)
├── updated_at (timestamptz)
│
├── UNIQUE (user_id, context)  ← one default per context
```

### 3.3 Deprecation & Forwarding System

When a model is deprecated:

1. Set `ag_model.is_deprecated = true`, `deprecated_at = now()`
2. Set `ag_model.forward_to_model_id` to the replacement
3. Run migration scripts per entity type:

**Because every model reference is an explicit FK to `ag_model.id`**, the migration scripts can:

```sql
-- Find all agents using the deprecated model
SELECT a.id, a.name, p.model_id
FROM ag_agent a
JOIN ag_prompt p ON a.prompt_id = p.id
WHERE p.model_id = 'deprecated-model-id';

-- Update with config adjustments
UPDATE ag_prompt
SET model_id = 'new-model-id',
    settings = settings || '{"temperature": 0.7}'::jsonb  -- adjust params
WHERE model_id = 'deprecated-model-id';
```

Each migration is a **custom script per model transition** because parameter adjustments vary. But the FK pattern makes finding all references trivial.

### 3.4 Normalizing Functions (TypeScript + Python)

Beyond database normalization, create matching types and helper functions:

**TypeScript** (`features/agents/types/model-config.ts`):
```typescript
interface ModelCapabilities {
    inputModalities: ('text' | 'image' | 'audio' | 'video' | 'file')[];
    outputModalities: ('text' | 'image' | 'audio' | 'structured')[];
    features: {
        tools: boolean;
        streaming: boolean;
        thinking: boolean;
        caching: boolean;
        jsonMode: boolean;
        // ...
    };
}

interface ModelParameters {
    temperature: { min: number; max: number; default: number };
    topP: { min: number; max: number; default: number };
    // ...
}
```

**Python** (`dataclasses`):
```python
@dataclass
class ModelCapabilities:
    input_modalities: list[Literal['text', 'image', 'audio', 'video', 'file']]
    output_modalities: list[Literal['text', 'image', 'audio', 'structured']]
    # ...
```

These types are generated from the database schema and kept in sync. A normalizing function converts the DB row into the typed structure:

```typescript
function normalizeModelConfig(row: AgModelConfigRow): ModelCapabilities { ... }
```

### 3.5 Open Questions — AI Model System

> **ARMAN: This section needs your extensive input before we proceed.**

1. **Model ID format**: Should the PK always be the full versioned ID (e.g., `claude-sonnet-4-20250514`) or should we support aliases (e.g., `claude-sonnet-4` → latest version)? The alias pattern adds complexity but is more user-friendly.

2. **Multi-endpoint priority**: When a model is available through multiple endpoints (e.g., Claude via Anthropic direct AND AWS Bedrock), how should priority/fallback work? Per-user? Per-org? Global config?

3. **Cost tracking**: Should we track actual costs per execution at the model level? We already track in `ag_app_execution` and `cx_request`. Do we need a separate aggregation table?

4. **Rate limiting per model**: Some endpoints have rate limits per model. Should we track and enforce these?

5. **Model groups**: Should we have a concept of "model families" (e.g., all Claude Sonnet 4 variants grouped together)? This would help with the deprecation forwarding UI.

6. **API key management**: Where should API keys live? Currently they're in environment variables. Should we move to a database-backed key management system for multi-org support?

7. **Provider vs Endpoint — edge cases**: What about providers like OpenRouter, Together, Groq that serve other providers' models? Is the provider the model maker (Anthropic) or the service provider (OpenRouter)? Current proposal: Provider = maker, Endpoint = service. But need to confirm.

8. **Existing `ai_settings` table**: Should user settings from `ai_settings` migrate into `ag_user_model_preference`? What's the relationship?

9. **Real-time model availability**: Should we have a system for detecting when a model/endpoint is down and auto-falling back? Or is that over-engineering for now?

10. **Python backend integration**: The Python FastAPI backend has its own model resolution logic. How tightly should the `ag_model` table integrate with it? Should Python read from the DB or maintain its own config?

---

## 4. Universal Tagging System

### 4.1 Design Principles

1. **System-wide**: One tagging system used by all modules (`ag_`, `cx_`, `rs_`, and future modules)
2. **User-created + system tags**: Users can create their own tags; system provides curated defaults
3. **Multi-entity**: A single tag can be applied to agents, prompts, conversations, research topics, projects, tasks, etc.
4. **Typed categories**: Tags belong to categories (e.g., "use-case", "industry", "capability") for organized filtering
5. **Normalizable**: Slug-based deduplication prevents "AI" vs "ai" vs "A.I." fragmentation

### 4.2 Tables

#### `tag` — The universal tag

```
tag
├── id (uuid PK)
├── name (text NOT NULL)
├── slug (text UNIQUE NOT NULL)  ← normalized: lowercase, hyphenated
├── description (text)
├── color (text)  ← hex, for UI badges
├── icon_name (text)  ← lucide icon
├── group (text NOT NULL DEFAULT 'general')
│   CHECK group IN ('general', 'use-case', 'industry', 'capability',
│                   'style', 'technology', 'audience', 'difficulty')
├── is_system (boolean NOT NULL DEFAULT false)  ← system-curated vs user-created
├── created_by (uuid FK → auth.users, nullable)
├── usage_count (int NOT NULL DEFAULT 0)  ← materialized via trigger
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

#### `entity_tag` — Polymorphic join table

```
entity_tag
├── id (uuid PK)
├── tag_id (uuid FK → tag.id, ON DELETE CASCADE)
├── entity_type (text NOT NULL)
│   CHECK entity_type IN ('agent', 'prompt', 'conversation', 'project',
│                         'task', 'research_topic', 'tool', 'transcript',
│                         'note', 'prompt_app')
├── entity_id (uuid NOT NULL)  ← the PK of the tagged entity
├── created_at (timestamptz)
├── created_by (uuid FK → auth.users, nullable)
│
├── UNIQUE (tag_id, entity_type, entity_id)

INDEXES:
├── idx_entity_tag_entity (entity_type, entity_id)
├── idx_entity_tag_tag (tag_id)
└── idx_entity_tag_type_tag (entity_type, tag_id)  ← for "all agents with tag X" queries
```

### 4.3 Tag Management Rules

- **System tags** (`is_system = true`): Created by admin, cannot be deleted by users, appear first in suggestions
- **User tags** (`is_system = false`): Created by any authenticated user, shared across the platform (anyone can use a tag another user created)
- **Usage count**: Updated by trigger on `entity_tag` INSERT/DELETE. Used for popularity-based sorting.
- **Slug uniqueness**: Prevents duplicates. `slugify("Machine Learning") = "machine-learning"`. If a user tries to create a tag that matches an existing slug, they get the existing tag.

### 4.4 Migration from Existing TEXT[] Tags

One-time migration script:

1. Collect all unique tag strings from `prompt_apps.tags`, `prompt_actions.tags`, `tools.tags`, `transcripts.tags`, `ai_runs.tags`
2. Normalize each to a slug
3. Insert unique tags into `tag` table
4. Create `entity_tag` rows for each entity-tag pair
5. Mark old `TEXT[]` columns as deprecated (drop in future migration)

### 4.5 Integration with Research Tags

The `rs_tag` system is more sophisticated (has `confidence`, `assigned_by`, `is_primary_source`). Two options:

**Option A (Recommended)**: Keep `rs_tag` as a module-specific extension. `rs_tag` can optionally link to a `tag.id` for cross-system visibility, but retains its extra fields for research-specific use.

**Option B**: Migrate `rs_tag` entirely into the universal `tag` + `entity_tag` system and add a `tag_metadata` extension table for research-specific fields. More unified but more disruptive to the working research system.

> **ARMAN: Which approach do you prefer? Option A is lower risk. Option B is more unified.**

### 4.6 Tag UI Component

A reusable `<TagManager>` component (already partially exists in the research system at `features/research/components/tags/TagManager.tsx`) should be generalized and placed in `components/shared/TagManager.tsx`:

- Autocomplete with existing tags
- Create new tags inline
- Filter by tag group
- Remove tags
- System tag badges (special styling)

---

## 5. Version Control System

### 5.1 Design Principles

1. **Universal pattern**: Same versioning approach for ALL versionable entities (prompts, builtins, notes, custom UIs, etc.)
2. **Immutable snapshots**: Each version is a complete snapshot, not a diff
3. **Lightweight**: Auto-save creates versions, but we don't version every keystroke
4. **Labeled**: Users can label versions for easy identification
5. **Pinnable**: External references (apps, agents) can pin to a specific version

### 5.2 Table: `ag_version`

```
ag_version
├── id (uuid PK)
├── entity_type (text NOT NULL)
│   CHECK entity_type IN ('prompt', 'builtin', 'custom_ui', 'action')
├── entity_id (uuid NOT NULL)  ← FK to the source entity
├── version_number (int NOT NULL)
│
├── -- Complete snapshot --
├── name (text)
├── description (text)
├── messages (jsonb)
├── variable_defaults (jsonb)
├── tools (jsonb)
├── settings (jsonb)
├── model_id (text FK → ag_model.id, nullable)
│
├── -- Metadata --
├── label (text)  ← user-friendly: "v3 - added tone variable"
├── change_summary (text)  ← auto-generated or user-provided
├── change_source (text NOT NULL DEFAULT 'manual')
│   CHECK change_source IN ('manual', 'auto_save', 'ai_generated', 'import', 'migration')
│
├── -- Tracking --
├── created_by (uuid FK → auth.users)
├── created_at (timestamptz)
│
├── UNIQUE (entity_type, entity_id, version_number)

INDEXES:
├── idx_ag_version_entity (entity_type, entity_id, version_number DESC)
```

### 5.3 How Versioning Connects

```
ag_agent
  └── active_version_id → ag_version.id  (what's "live" for this agent)

ag_app
  └── pinned_version_id → ag_version.id  (what version this app uses)
       When NULL → follows agent's active_version_id
       When set → uses this version regardless of agent changes

cx_conversation
  └── (no direct version FK — version is resolved at execution time via the agent)

ag_app_execution
  └── version_id → ag_version.id  (audit trail: what version was used)
```

### 5.4 Version Lifecycle

1. **On prompt save**: If content changed, create a new `ag_version` row with `change_source = 'auto_save'`
2. **On explicit "Save Version"**: Create with `change_source = 'manual'`, prompt user for label
3. **On AI-generated changes**: Create with `change_source = 'ai_generated'`
4. **Agent's active_version_id**: Updated to point to the latest version automatically on save (unless user has explicitly pinned a version)
5. **App's pinned_version_id**: Only updated when user explicitly clicks "Update to Latest" or "Pin to Version X"
6. **Rollback**: Set `ag_agent.active_version_id` to any previous `ag_version.id`

### 5.5 Establishing the System-Wide Versioning Pattern

> This pattern should be documented as the **single standard** for versioning anywhere in the database.

**Existing versioning that should adopt this pattern:**
- `note_versions` → Already exists with a similar structure. Consider migrating to a shared `version` table or at minimum aligning the column names.
- `rs_content` → Has `is_current`, `version` fields. Similar concept.
- `rs_synthesis` → Has `is_current`, `version`, `previous_synthesis_id`. Similar concept.
- `prompt_custom_uis` → Has `version`, `parent_version_id`, `status`. Should use `ag_version`.

**Standard versioning contract:**

Every versionable entity must:
1. Have its versions stored in a version table (either shared `ag_version` or module-specific `xx_version`)
2. Include: `version_number`, `entity_id`, `change_source`, `label`, `created_by`, `created_at`
3. Store a complete snapshot (not diffs)
4. Support an `active_version_id` pointer on the parent entity
5. Support optional pinning from referencing entities

### 5.6 ORM Integration

> **ARMAN: Should we build versioning into the custom ORM (`DatabaseApiWrapper`)?**

Possible ORM-level automations:

1. **Auto-version on update**: When `update()` is called on a versionable entity, automatically create a version snapshot before applying the update
2. **Version-aware fetch**: `fetchOne()` could accept a `versionId` parameter to fetch a specific historical version
3. **Diff generation**: Utility function to diff two versions of an entity
4. **Schema registry integration**: Register which entities are versionable and their version table mapping

Pros: Ensures consistency, reduces boilerplate
Cons: Adds complexity to the ORM, may be over-engineering if only a few entities need it

---

## 6. Access Control & Sharing Model

### 6.1 Agent Visibility Levels

Three distinct levels, each with clear boundaries:

| Level | Column Value | Can Run | Can See Prompt | Can Edit | Use Case |
|-------|-------------|---------|---------------|----------|----------|
| **Private** | `visibility = 'private'` | Owner + shared users | Owner + shared users | Owner + shared editors | Default for new agents |
| **Use-Only (Public)** | `visibility = 'use_only'` | Anyone | No one except owner/shared | Owner + shared editors | "Run my agent but don't steal my prompt" |
| **Full Public** | `visibility = 'public_read'` | Anyone | Anyone | Owner + shared editors | Open-source prompts, educational |

### 6.2 How "Use-Only" Works (Critical for Prompt Protection)

When `visibility = 'use_only'`:

**Server-side enforcement:**
- The prompt content (`messages`, `variable_defaults`, `tools`, `settings`) is NEVER sent to the client
- Only the `variable_schema` (names, types, descriptions, defaults) is sent for the UI form
- Execution happens entirely server-side — the client sends variables, the server resolves and executes

**Client-side experience:**
- User sees: agent name, tagline, description, branding (avatar, cover, accent color)
- User sees: variable input form
- User does NOT see: system message, message templates, tool configurations, settings
- User CAN: run the agent, rate it, share the link

**This is already how `prompt_apps` work today** — the prompt content is fetched server-side by the execution API, never exposed to the client. We're formalizing this pattern and extending it to chat agents.

### 6.3 Integration with Centralized RLS

Following the established `has_permission()` pattern from the RLS rollout playbook:

```sql
-- ag_agent SELECT policy
CREATE POLICY "ag_agent_select" ON ag_agent
  FOR SELECT USING (
    user_id = auth.uid()                                          -- Owner
    OR visibility IN ('use_only', 'public_read')                  -- Public access
    OR has_permission('agent'::text, id, 'viewer'::permission_level) -- Shared
  );

-- ag_prompt SELECT policy (stricter — protects prompt content)
CREATE POLICY "ag_prompt_select" ON ag_prompt
  FOR SELECT USING (
    user_id = auth.uid()                                          -- Owner
    OR has_permission('agent'::text,
       (SELECT id FROM ag_agent WHERE prompt_id = ag_prompt.id),
       'viewer'::permission_level)                                -- Shared with view
    -- NOTE: No public access to prompt content. Even use_only agents
    -- don't expose prompt rows to the client. Server-side only.
  );
```

For `use_only` agents, the execution API (Python backend) uses a **service role** client to fetch the prompt content, bypassing RLS. The client never queries `ag_prompt` directly for public agents.

### 6.4 Sharing Permissions

Leverages the existing `permissions` table and `has_permission()` function:

| Permission Level | Can See Agent | Can Run | Can See Prompt | Can Edit |
|-----------------|--------------|---------|---------------|----------|
| `viewer` | Yes | Yes | Yes (for private agents shared with them) | No |
| `editor` | Yes | Yes | Yes | Yes (prompt + settings) |
| `admin` | Yes | Yes | Yes | Yes + can manage sharing |

Organization-level sharing: When an agent has `organization_id` set, all org members get `viewer` access by default (configurable).

### 6.5 RLS Rollout Plan

Following the established playbook at `.arman/pending/global-rls-system/rls-rollout-playbook.md`:

**Phase 1**: Pre-flight audit of all `ag_` tables
**Phase 2**: Design policies (parent table + child cascading)
**Phase 3**: Apply migration
**Phase 4**: Codebase updates
**Phase 5**: Testing
**Phase 6**: Sign-off

Parent table: `ag_agent` (owner + has_permission + visibility)
Child tables cascade through `ag_agent`:
- `ag_prompt` → via `ag_agent.prompt_id`
- `ag_builtin` → via `ag_agent.builtin_id`
- `ag_app` → via `ag_app.agent_id`
- `ag_app_execution` → via `ag_app.agent_id`
- `ag_shortcut` → via `ag_shortcut.agent_id`
- `ag_action` → via `ag_action.agent_id`
- `ag_version` → via entity lookup to `ag_agent`

---

## 7. Org / Project / Task / Research Integration

### 7.1 Design Principle: Loose Many-to-Many

Agents exist independently of organizational structures. Association is through join tables, not ownership. Deleting a project doesn't delete agents; removing an agent from a project doesn't delete the agent.

### 7.2 Join Tables

#### `project_agent` — Agent ↔ Project

```
project_agent
├── id (uuid PK)
├── project_id (uuid FK → projects.id, ON DELETE CASCADE)
├── agent_id (uuid FK → ag_agent.id, ON DELETE CASCADE)
├── role ('primary' | 'member' | 'archived')
├── added_by (uuid FK → auth.users)
├── added_at (timestamptz)
│
├── UNIQUE (project_id, agent_id)
```

#### `task_agent` — Agent ↔ Task

```
task_agent
├── id (uuid PK)
├── task_id (uuid FK → tasks.id, ON DELETE CASCADE)
├── agent_id (uuid FK → ag_agent.id, ON DELETE CASCADE)
├── added_by (uuid FK → auth.users)
├── added_at (timestamptz)
│
├── UNIQUE (task_id, agent_id)
```

#### `research_topic_agent` — Agent ↔ Research Topic

```
research_topic_agent
├── id (uuid PK)
├── topic_id (uuid FK → rs_topic.id, ON DELETE CASCADE)
├── agent_id (uuid FK → ag_agent.id, ON DELETE CASCADE)
├── purpose (text)  ← 'analysis' | 'synthesis' | 'search' | 'general'
├── added_by (uuid FK → auth.users)
├── added_at (timestamptz)
│
├── UNIQUE (topic_id, agent_id)
```

### 7.3 Organization Association

The `ag_agent.organization_id` column provides direct org association. When set:

- All org members with appropriate role get access (mediated by RLS)
- The agent appears in the org's agent directory
- Org admins can manage the agent

This is intentionally a single FK, not a many-to-many. An agent belongs to at most one organization. If an agent needs to be in multiple orgs, create separate agents (possibly from the same prompt template).

### 7.4 Conversation ↔ Agent Link

Add to `cx_conversation`:

```sql
ALTER TABLE cx_conversation ADD COLUMN agent_id UUID REFERENCES ag_agent(id) ON DELETE SET NULL;
```

This stores which agent was used for the conversation, replacing the URL-only tracking. Benefits:
- Conversation history per agent
- Agent-specific analytics
- "Continue with this agent" feature
- Agent attribution in shared conversations

---

## 8. RLS Rollout for `ag_` Tables

Following the established playbook, the `ag_` tables will be rolled out as a single batch:

### 8.1 Table Classification

| Table | has user_id | has id | Sharing Eligible | Parent |
|-------|-------------|--------|-----------------|--------|
| `ag_agent` | yes | yes | yes | — (root) |
| `ag_prompt` | yes | yes | parent-lookup | ag_agent |
| `ag_builtin` | no (has created_by) | yes | parent-lookup | ag_agent |
| `ag_app` | yes | yes | parent-lookup | ag_agent |
| `ag_app_execution` | yes | yes | parent-lookup | ag_app → ag_agent |
| `ag_app_error` | no | yes | parent-lookup | ag_app → ag_agent |
| `ag_app_rate_limit` | yes | yes | parent-lookup | ag_app → ag_agent |
| `ag_shortcut` | no (has created_by) | yes | custom (admin) | ag_agent |
| `ag_shortcut_category` | no | yes | n/a (system) | — |
| `ag_category` | no | yes | n/a (system) | — |
| `ag_action` | yes | yes | parent-lookup | ag_agent |
| `ag_version` | no (has created_by) | yes | parent-lookup | ag_agent (via entity) |
| `ag_model` | no | yes | n/a (system) | — |
| `ag_model_info` | no | yes | n/a (system) | — |
| `ag_model_config` | no | yes | n/a (system) | — |
| `ag_provider` | no | yes | n/a (system) | — |
| `ag_endpoint` | no | yes | n/a (system) | — |
| `ag_model_endpoint` | no | yes | n/a (system) | — |
| `ag_user_model_preference` | yes | yes | owner-only | — |
| `tag` | no (has created_by) | yes | n/a (shared) | — |
| `entity_tag` | no (has created_by) | yes | parent-lookup | varies by entity_type |

### 8.2 Policy Pattern

Root: `ag_agent` — owner + visibility + has_permission
Children: Cascade through `ag_agent` via their FK
System tables: Read-only for all authenticated users, write for admins
Tags: Read for all authenticated, create for all authenticated, delete for tag creator or admin

---

## 9. Migration Strategy

### 9.1 Guiding Principles

1. **No big bang**: Create new tables alongside old ones. Migrate data. Update code incrementally. Deprecate old tables last.
2. **Backward compatibility**: During migration, both old and new tables exist. Views or triggers keep them in sync if needed.
3. **Feature flags**: Use a feature flag to switch between old and new code paths during migration.
4. **Data integrity**: Migration scripts are idempotent and reversible.

### 9.2 Migration Order

```
Phase 0: Foundation
  ├── Create ag_provider, ag_endpoint (no data dependencies)
  ├── Create ag_model, ag_model_info, ag_model_config (migrate from ai_model)
  ├── Create ag_model_endpoint (migrate from ai_model_endpoint)
  ├── Create tag, entity_tag (no data dependencies)
  └── Create ag_category, ag_shortcut_category

Phase 1: Core Agent Tables
  ├── Create ag_prompt (migrate from prompts)
  ├── Create ag_builtin (migrate from prompt_builtins)
  ├── Create ag_agent (create rows for each prompt + builtin)
  └── Create ag_version (create initial versions from current state)

Phase 2: Dependent Tables
  ├── Create ag_app (migrate from prompt_apps, repoint to agent_id)
  ├── Create ag_app_execution (migrate from prompt_app_executions)
  ├── Create ag_app_error (migrate from prompt_app_errors)
  ├── Create ag_app_rate_limit (migrate from prompt_app_rate_limits)
  ├── Create ag_shortcut (migrate from prompt_shortcuts)
  ├── Create ag_action (migrate from prompt_actions)
  └── Create ag_user_model_preference

Phase 3: Integration
  ├── Create project_agent, task_agent, research_topic_agent
  ├── Add agent_id to cx_conversation
  ├── Migrate entity_tag rows from TEXT[] columns
  └── Apply RLS policies to all ag_ tables

Phase 4: Code Migration
  ├── Update /ai/prompts route → ag_prompt + ag_agent
  ├── Update /prompt-apps route → ag_app + ag_agent
  ├── Update /p/chat → ag_agent queries (remove hardcoded UUIDs)
  ├── Update /p/[slug] → ag_app + ag_agent + ag_version
  ├── Update shortcuts system → ag_shortcut + ag_agent
  ├── Update Python backend → ag_model, ag_agent resolution
  └── Add tag management UI everywhere

Phase 5: Deprecation
  ├── Drop old views that reference old tables
  ├── Mark old tables as deprecated in table-inventory.md
  ├── Remove old TEXT[] tag columns
  └── (Later) Drop deprecated tables after confirming zero usage
```

### 9.3 Data Migration Scripts

Each migration creates the new table AND migrates data in the same transaction:

```sql
-- Example: prompts → ag_prompt + ag_agent
BEGIN;

-- Create ag_prompt
CREATE TABLE ag_prompt ( ... );

-- Migrate data
INSERT INTO ag_prompt (id, user_id, name, description, messages, ...)
SELECT id, user_id, name, description, messages, ...
FROM prompts;

-- Create corresponding ag_agent rows
INSERT INTO ag_agent (id, source_type, prompt_id, user_id, name, slug, status, ...)
SELECT
    gen_random_uuid(),
    'prompt',
    p.id,
    p.user_id,
    COALESCE(p.name, 'Untitled'),
    -- Generate slug from name
    lower(regexp_replace(COALESCE(p.name, 'untitled-' || p.id::text), '[^a-z0-9]+', '-', 'g')),
    'draft',
    ...
FROM prompts p;

-- Create initial version for each prompt
INSERT INTO ag_version (id, entity_type, entity_id, version_number, messages, ...)
SELECT
    gen_random_uuid(),
    'prompt',
    p.id,
    1,
    p.messages,
    ...
FROM ag_prompt p;

COMMIT;
```

---

## 10. Open Questions for Arman

### 10.1 Module Scope & Naming

1. **Should the `ag_` prefix cover EVERYTHING agent-related including models/providers?** Current proposal puts `ag_model`, `ag_provider`, `ag_endpoint` under `ag_`. Alternative: keep AI infrastructure tables without prefix (they're system-level, not user-owned). Or use a separate prefix like `ai_` (but that conflicts with existing deprecated `ai_*` tables).

2. **What happens to the existing `ai_agent` table?** It's part of the recipe/automation system. Should it be renamed to avoid confusion? Or is the recipe system fully deprecated?

3. **Custom UIs (`prompt_custom_uis` etc.)**: Should these become `ag_custom_ui`, `ag_custom_ui_usage`, etc.? Or should custom UIs be merged into `ag_app` since they serve a similar purpose?

### 10.2 AI Model System (Extensive Feedback Needed)

4. **Model ID as PK** — Confirm: using the official model identifier (e.g., `claude-sonnet-4-20250514`) as the PK of `ag_model`. This means all FKs across the system use this string. Benefits: no translation needed. Risks: model IDs can be long, some edge cases with providers that use non-standard IDs.

5. **Model alias system** — Do we need a `ag_model_alias` table that maps friendly names to versioned IDs? E.g., `claude-sonnet-4` → `claude-sonnet-4-20250514`. This is important for user-facing selectors.

6. **Model versioning** — Some providers version models (Anthropic: `claude-sonnet-4-20250514`). Others don't (OpenAI: `gpt-4o`). How do we handle this inconsistency?

7. **Where do model configs live in prompts today?** Need to audit where `model_id` or model configuration currently lives in `prompts.settings` JSON to ensure the migration script can extract it into the proper FK column.

8. **Runtime vs info split** — Is the two-table split (`ag_model` for runtime, `ag_model_info` for UI) the right approach? Or should we have a single table with views?

9. **Provider auth config** — Where should API keys and auth configuration live? In `ag_endpoint.auth_config`? In a separate secrets table? In env vars only?

10. **Normalizing functions location** — Should the TypeScript and Python normalizing types/functions live in the `ag_` feature directory, or in a shared location like `utils/ai/` and the Python equivalent?

### 10.3 Tags

11. **Research tag integration** — Option A (keep `rs_tag` as module extension with optional link to universal `tag`) vs Option B (migrate `rs_tag` fully into universal system). Recommendation: Option A for lower risk.

12. **Tag groups** — Is the proposed list (`general`, `use-case`, `industry`, `capability`, `style`, `technology`, `audience`, `difficulty`) complete? Should groups be a database table instead of a check constraint for flexibility?

13. **Tag visibility** — Should user-created tags be visible to all users? Or should there be private tags visible only to the creator?

### 10.4 Version Control

14. **Shared vs module-specific version tables** — Should all versioning go through `ag_version`, or should each module have its own version table (e.g., `note_versions` stays separate)? Trade-off: uniformity vs module independence.

15. **Auto-versioning granularity** — How often should auto-versions be created? On every save? Only when content changes? Debounced (e.g., at most one auto-version per 5 minutes)?

16. **Version retention** — Should we keep all versions forever? Or implement a retention policy (e.g., keep last 50 versions, delete older ones)?

17. **ORM auto-versioning** — Should the custom ORM (`DatabaseApiWrapper`) automatically create versions on update? This would ensure consistency but adds latency to every write.

### 10.5 Access Control

18. **Org default permission** — When an agent has `organization_id` set, what permission level should org members get by default? `viewer`? Configurable per org?

19. **Use-only enforcement** — For `visibility = 'use_only'`, the prompt content must NEVER reach the client. Confirm this is enforced at the API layer (Python backend uses service role), not just at the RLS layer.

20. **Rate limiting for use-only agents** — Should `use_only` agents have rate limiting similar to prompt apps? Or is this only for `ag_app` surfaces?

### 10.6 Integration

21. **Should `cx_conversation.agent_id` be required or nullable?** If nullable, old conversations without agents still work. If required, we need to backfill.

22. **Research integration depth** — Should `research_topic_agent` track which pipeline step the agent is used for? The research system has specific agent roles (analysis, synthesis, search). Or is a simple many-to-many sufficient?

23. **Project/task tables** — These currently have no RLS (`projects`, `project_members`, `tasks`, `task_assignments`, `task_attachments` — all RLS off). Should we fix their RLS as part of this work, or defer?

### 10.7 Migration

24. **Parallel operation period** — How long should old and new tables coexist? Weeks? Months? Should we have views that unify both during transition?

25. **Python backend coordination** — The Python FastAPI backend resolves prompts and models. Does the backend migration need to happen simultaneously, or can it be phased?

26. **Feature flag approach** — Should we use a database-backed feature flag, an env var, or a code-level constant to switch between old and new code paths?

---

## 11. Phased Implementation Plan

### Phase 0: Foundation (No breaking changes)

**Duration:** 1–2 sessions

- [ ] Create `ag_provider`, `ag_endpoint` tables with seed data
- [ ] Create `ag_model`, `ag_model_info`, `ag_model_config` tables
- [ ] Migrate data from `ai_model`, `ai_provider`, `ai_endpoint`, `ai_model_endpoint`
- [ ] Create `tag`, `entity_tag` tables
- [ ] Seed system tags
- [ ] Create `ag_category`, `ag_shortcut_category` tables
- [ ] Migrate category data
- [ ] Generate TypeScript types

**Prerequisite:** Arman answers questions 1, 4–10 from Section 10.

### Phase 1: Core Agent System (No breaking changes)

**Duration:** 2–3 sessions

- [ ] Create `ag_prompt`, `ag_builtin` tables
- [ ] Migrate data from `prompts`, `prompt_builtins`
- [ ] Create `ag_agent` table with rows for each prompt and builtin
- [ ] Create `ag_version` table with initial versions
- [ ] Generate unique slugs for all agents
- [ ] Set up auto-versioning trigger
- [ ] Generate TypeScript types

**Prerequisite:** Arman answers questions 2, 3, 14–17.

### Phase 2: Dependent Tables & Integration (No breaking changes)

**Duration:** 2–3 sessions

- [ ] Create `ag_app`, `ag_app_execution`, `ag_app_error`, `ag_app_rate_limit`
- [ ] Migrate data from `prompt_apps` and children
- [ ] Create `ag_shortcut`, `ag_action`
- [ ] Migrate data from `prompt_shortcuts`, `prompt_actions`
- [ ] Create `ag_user_model_preference`
- [ ] Create `project_agent`, `task_agent`, `research_topic_agent`
- [ ] Add `agent_id` to `cx_conversation`
- [ ] Migrate `TEXT[]` tags to `entity_tag`
- [ ] Generate TypeScript types

**Prerequisite:** Arman answers questions 11–13, 18–23.

### Phase 3: RLS & Access Control

**Duration:** 1–2 sessions

- [ ] Follow RLS rollout playbook for all `ag_` tables
- [ ] Implement visibility-based RLS policies
- [ ] Test all access patterns
- [ ] Arman sign-off

### Phase 4: Frontend Migration

**Duration:** 3–5 sessions (largest phase)

- [ ] Create `features/agents/` directory with types, services, hooks
- [ ] Update `/ai/prompts` to use `ag_prompt` + `ag_agent` + tags + categories
- [ ] Add version history UI to prompt editor
- [ ] Update `/prompt-apps` to use `ag_app` + `ag_agent`
- [ ] Update `/p/chat` to use `ag_agent` queries (remove hardcoded UUIDs)
- [ ] Update `/p/[slug]` to use `ag_app` + `ag_version` for version resolution
- [ ] Update shortcuts system
- [ ] Add tag management UI to prompts, apps, agents
- [ ] Add agent branding UI (avatar, cover, accent color, etc.)
- [ ] Build generalized `<TagManager>` component
- [ ] Build `<VersionHistory>` component
- [ ] Build `<AgentBrandingEditor>` component

**Prerequisite:** Arman answers question 24–26.

### Phase 5: Backend Migration

**Duration:** 2–3 sessions

- [ ] Update Python FastAPI agent resolution to use `ag_agent` + `ag_model`
- [ ] Implement model deprecation forwarding in Python
- [ ] Update model config resolution to use `ag_model_config`
- [ ] Create Python dataclasses matching TypeScript types
- [ ] Test all execution paths

### Phase 6: Cleanup & Documentation

**Duration:** 1 session

- [ ] Mark old tables as deprecated in `table-inventory.md`
- [ ] Update `features/agents/README.md` with final documentation
- [ ] Update CLAUDE.md with new patterns
- [ ] Remove deprecated code paths (behind feature flag confirmation)
- [ ] Plan old table deletion timeline

---

## Summary: Complete Table List for `ag_` Module

| Table | Purpose | Parent |
|-------|---------|--------|
| `ag_agent` | Unified agent identity | — |
| `ag_prompt` | User-created prompts | ag_agent |
| `ag_builtin` | System built-in prompts | ag_agent |
| `ag_app` | Published prompt apps with custom UIs | ag_agent |
| `ag_app_execution` | App execution tracking | ag_app |
| `ag_app_error` | App error tracking | ag_app |
| `ag_app_rate_limit` | App rate limiting | ag_app |
| `ag_shortcut` | In-app shortcuts | ag_agent |
| `ag_shortcut_category` | Shortcut categories | — |
| `ag_action` | Execution configs + broker mappings | ag_agent |
| `ag_category` | Agent categories (hierarchical) | — |
| `ag_version` | Version snapshots | ag_agent (via entity) |
| `ag_model` | AI model runtime (hot path) | — |
| `ag_model_info` | AI model display metadata | ag_model |
| `ag_model_config` | AI model capabilities + parameters | ag_model |
| `ag_provider` | AI provider (company) | — |
| `ag_endpoint` | AI endpoint (server/SDK) | — |
| `ag_model_endpoint` | Model ↔ Endpoint availability | ag_model, ag_endpoint |
| `ag_user_model_preference` | User model preferences | — |
| `tag` | Universal tags (no prefix — system-wide) | — |
| `entity_tag` | Polymorphic tag assignment (no prefix — system-wide) | tag |
| `project_agent` | Project ↔ Agent join (no prefix — cross-module) | — |
| `task_agent` | Task ↔ Agent join (no prefix — cross-module) | — |
| `research_topic_agent` | Research Topic ↔ Agent join (no prefix — cross-module) | — |

**Total: 24 tables** (19 `ag_` prefixed, 2 tag tables, 3 cross-module join tables)

Replaces: 13 existing prompt tables + 4 AI tables = 17 old tables deprecated
