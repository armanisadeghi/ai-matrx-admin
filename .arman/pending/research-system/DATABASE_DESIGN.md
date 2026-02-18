# Research System — Database (Current Structure)

All research tables use the `rs_` prefix and live in the `public` schema.

---

## Table Overview

```
rs_config              (1:1 with project — research settings & state)
  │
  ├── rs_keyword       (keywords for this research)
  │     └── rs_keyword_source  (join: which keywords found which URLs)
  │
  ├── rs_source        (individual URLs / content sources)
  │     ├── rs_content         (scraped/captured content — versioned)
  │     │     └── rs_analysis   (per-page LLM analysis)
  │     └── rs_media           (images, videos, documents)
  │
  ├── rs_synthesis     (per-keyword or project-level LLM synthesis)
  │
  ├── rs_tag           (tags for categorizing information)
  │     ├── rs_source_tag      (join: sources ↔ tags)
  │     └── rs_tag_consolidation (LLM consolidation per tag)
  │
  ├── rs_template      (reusable templates; referenced by rs_config)
  └── rs_document      (final assembled document — versioned)
```

---

## Table Definitions (Current Schema)

### rs_config

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| autonomy_level | text |
| default_search_provider | text |
| default_search_params | jsonb |
| good_scrape_threshold | integer |
| scrapes_per_keyword | integer |
| status | text |
| template_id | uuid FK → rs_template |
| agent_config | jsonb |
| metadata | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

---

### rs_keyword

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| keyword | text |
| search_provider | text |
| search_params | jsonb |
| last_searched_at | timestamptz |
| is_stale | boolean |
| result_count | integer |
| raw_api_response | jsonb |
| created_at | timestamptz |

---

### rs_source

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| url | text |
| title | text |
| description | text |
| hostname | text |
| source_type | text |
| origin | text |
| rank | integer |
| page_age | text |
| thumbnail_url | text |
| extra_snippets | text[] |
| raw_search_result | jsonb |
| is_included | boolean |
| is_stale | boolean |
| scrape_status | text |
| discovered_at | timestamptz |
| last_seen_at | timestamptz |

---

### rs_keyword_source

| Column | Type |
|--------|------|
| id | uuid PK |
| keyword_id | uuid FK → rs_keyword |
| source_id | uuid FK → rs_source |
| rank_for_keyword | integer |
| created_at | timestamptz |

---

### rs_content

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| content | text |
| content_hash | text |
| char_count | integer |
| content_type | text |
| is_good_scrape | boolean |
| quality_override | text |
| capture_method | text |
| failure_reason | text |
| published_at | timestamptz |
| modified_at | timestamptz |
| is_current | boolean |
| version | integer |
| linked_extraction_id | bigint |
| linked_transcript_id | uuid |
| extracted_links | jsonb |
| extracted_images | jsonb |
| scraped_at | timestamptz |

---

### rs_media

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| media_type | text |
| url | text |
| alt_text | text |
| caption | text |
| thumbnail_url | text |
| width | integer |
| height | integer |
| is_relevant | boolean |
| metadata | jsonb |
| created_at | timestamptz |

---

### rs_analysis

| Column | Type |
|--------|------|
| id | uuid PK |
| content_id | uuid FK → rs_content |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| instructions | text |
| result | text |
| result_structured | jsonb |
| token_usage | jsonb |
| created_at | timestamptz |

---

### rs_synthesis

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| keyword_id | uuid FK → rs_keyword |
| scope | text |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| instructions | text |
| result | text |
| result_structured | jsonb |
| input_source_ids | uuid[] |
| input_analysis_ids | uuid[] |
| token_usage | jsonb |
| is_current | boolean |
| version | integer |
| iteration_mode | text |
| previous_synthesis_id | uuid FK → rs_synthesis |
| created_at | timestamptz |

---

### rs_tag

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| name | text |
| description | text |
| sort_order | integer |
| created_at | timestamptz |

---

### rs_source_tag

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| tag_id | uuid FK → rs_tag |
| is_primary_source | boolean |
| confidence | double precision |
| assigned_by | text |
| created_at | timestamptz |

---

### rs_tag_consolidation

| Column | Type |
|--------|------|
| id | uuid PK |
| tag_id | uuid FK → rs_tag |
| project_id | uuid FK → projects |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| result | text |
| result_structured | jsonb |
| source_content_ids | uuid[] |
| token_usage | jsonb |
| is_current | boolean |
| version | integer |
| created_at | timestamptz |

---

### rs_template

| Column | Type |
|--------|------|
| id | uuid PK |
| name | text |
| description | text |
| is_system | boolean |
| created_by | uuid |
| keyword_templates | jsonb |
| default_tags | jsonb |
| default_search_params | jsonb |
| agent_config | jsonb |
| autonomy_level | text |
| metadata | jsonb |
| created_at | timestamptz |

---

### rs_document

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| title | text |
| content | text |
| content_structured | jsonb |
| source_consolidation_ids | uuid[] |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| token_usage | jsonb |
| version | integer |
| created_at | timestamptz |

---

## Name Mapping (Proposal → Current)

| Proposal name | Current table |
|---------------|----------------|
| research_config | rs_config |
| research_keyword | rs_keyword |
| research_source | rs_source |
| keyword_result_link | rs_keyword_source |
| research_source_content | rs_content |
| source_media | rs_media |
| source_analysis | rs_analysis |
| research_synthesis | rs_synthesis |
| research_tag | rs_tag |
| source_tag | rs_source_tag |
| tag_consolidation | rs_tag_consolidation |
| research_template | rs_template |
| research_document | rs_document |
