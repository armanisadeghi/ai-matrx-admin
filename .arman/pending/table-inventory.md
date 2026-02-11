# AI Matrx Database Table Inventory

> **Purpose:** Classify every public table so we can systematically roll out the centralized permissions/RLS system without breaking anything.
>
> **Instructions for Arman:** Review the Status and Sharing Eligible columns. Update any misclassifications. Tables marked `?` need your input. Once confirmed, this becomes the source of truth for the RLS rollout.

---

## Legend

**Status values:**
- `active` -- In active use, part of the current product
- `new-core` -- New system, high priority, actively being built
- `deprecated` -- Being phased out or replaced
- `not-in-use` -- Not currently used, may be rebuilt later
- `system` -- Reference/config data, not user-owned
- `admin` -- Admin-only access
- `infra` -- Infrastructure/internal, not user-facing
- `?` -- Unknown, needs Arman's classification

**RLS State:**
- `on+centralized` -- RLS enabled, uses `has_permission()` function
- `on+adhoc` -- RLS enabled, uses ad-hoc `auth.uid() = user_id` policies
- `on+none` -- RLS enabled but NO policies exist (blocks all access)
- `off` -- RLS disabled (wide open)

**Sharing Eligible:** Whether this table should adopt the centralized `has_permission()` system.
- `yes` -- Should use centralized sharing (user + org + public)
- `owner-only` -- Needs RLS but sharing doesn't make sense (private user data)
- `parent-lookup` -- Child table, inherits access from parent
- `custom` -- Has its own access model (DMs, orgs, admin)
- `skip` -- Deprecated/not-in-use, don't invest
- `n/a` -- System/reference table, no user ownership

---

## CX System (New Core -- AI Interaction Tracking)

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| cx_conversation | new-core | yes | yes | no | on+adhoc | yes | Parent table. Currently `user_id = auth.uid()` only |
| cx_message | new-core | no | yes | no | on+adhoc | parent-lookup | Child of cx_conversation via conversation_id |
| cx_request | new-core | no | yes | no | on+adhoc | parent-lookup | Child of cx_conversation via conversation_id |
| cx_user_request | new-core | yes | yes | no | on+adhoc | parent-lookup | Child of cx_conversation via conversation_id |
| cx_media | new-core | yes | yes | no | on+adhoc | parent-lookup | Child of cx_conversation via conversation_id |

---

## Already Using Centralized Permissions

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| prompts | active | yes | yes | no | on+centralized | yes | Full 4-policy pattern. Working. |
| prompt_apps | active | yes | yes | no | on+centralized | yes | Full 4-policy pattern + published status check. Working. |
| notes | active | yes | yes | no | on+centralized | yes | Full 4-policy pattern. Working. |
| content_template | active | yes | yes | yes | on+centralized | yes | Full 4-policy pattern + is_public check. Working. |
| ai_runs | deprecated | yes | yes | no | on+centralized | skip | Being replaced by cx_ system |
| ai_tasks | deprecated | yes | yes | no | on+centralized | skip | Being replaced by cx_ system |

---

## Active Tables -- Need Centralized Permissions

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| canvas_items | active | yes | yes | yes | on+adhoc | yes | 5 ad-hoc policies. Has is_public for public sharing |
| transcripts | active | yes | yes | no | on+adhoc | yes | 4 ad-hoc policies |
| html_extractions | active | yes | yes | no | on+adhoc | yes | 3 ad-hoc policies |
| quiz_sessions | active | yes | yes | no | on+adhoc | owner-only | 4 ad-hoc policies. Sharing quiz sessions seems unlikely? |
| sandbox_instances | active | yes | yes | no | on+adhoc | owner-only | 4 ad-hoc policies. Private sandbox environments |
| user_files | active | yes | yes | no | on+adhoc | yes | 4 ad-hoc policies. Sharing files could be useful |
| user_tables | active | yes | yes | yes | on+adhoc | yes | 3 ad-hoc policies + public read. Custom data tables |
| table_data | active | yes | yes | yes | on+adhoc | parent-lookup | Child of user_tables. 3 ad-hoc policies |
| table_fields | active | yes | yes | yes | on+adhoc | parent-lookup | Child of user_tables. 3 ad-hoc policies |
| user_lists | active | yes | yes | yes | on+adhoc | yes | 4 ad-hoc policies |
| user_list_items | active | yes | yes | yes | on+adhoc | parent-lookup | Child of user_lists. 4 ad-hoc policies |
| prompt_actions | active | yes | yes | yes | on+adhoc | yes | 4 ad-hoc policies |
| audio_recording | active | yes | yes | yes | on+adhoc | yes | 2 ad-hoc policies (ALL + public read) |

---

## Flashcard System -- Legacy Sharing Pattern

These use a `shared_with uuid[]` column instead of the centralized permissions table. Migration is more complex.

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| flashcard_data | active | yes | yes | no (has `public` bool) | on+adhoc | yes | 5 policies using shared_with array. Has `public` column (not `is_public`) |
| flashcard_sets | active | yes | no (has `set_id`) | no (has `public` bool) | on+adhoc | yes | 5 policies using shared_with array. PK is `set_id` not `id` |
| flashcard_history | active | yes | yes | no | on+adhoc | parent-lookup | Child of flashcard_data. 2 policies |
| flashcard_images | active | no | yes | no | on+adhoc | parent-lookup | Child of flashcard_data. 1 policy |
| flashcard_set_relations | active | no | no | no | on+adhoc | parent-lookup | Join table. 1 policy. No id or user_id column |

---

## Child / Supporting Tables

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| note_versions | active | yes | yes | no | on+adhoc | parent-lookup | Child of notes. 3 ad-hoc policies |
| canvas_comments | active | yes | yes | no | on+adhoc | parent-lookup | Child of canvas_items. 4 policies |
| canvas_likes | active | yes | yes | no | on+adhoc | parent-lookup | Child of canvas_items. 3 policies |
| canvas_scores | active | yes | yes | no | on+adhoc | parent-lookup | Child of canvas_items. 2 policies |
| canvas_views | active | yes | yes | no | on+adhoc | parent-lookup | Child of canvas_items. 1 policy |
| canvas_comment_likes | active | yes | yes | no | on+none | parent-lookup | RLS on but 0 policies! |
| shared_canvas_items | active | no | yes | no | on+adhoc | custom | 5 policies using visibility column |
| prompt_app_errors | active | no | yes | no | on+adhoc | parent-lookup | Child of prompt_apps. 3 policies |
| prompt_app_executions | active | yes | yes | no | on+adhoc | parent-lookup | Child of prompt_apps. 2 policies |
| prompt_app_rate_limits | active | yes | yes | no | on+adhoc | parent-lookup | Child of prompt_apps. 3 policies |
| task_comments | active | yes | yes | no | on+adhoc | parent-lookup | Child of tasks. 4 policies |

---

## Private User Data -- Owner Only

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| user_preferences | active | yes | no | no | off | owner-only | NO RLS! Needs enabling. No `id` column (PK is user_id) |
| user_bookmarks | active | yes | yes | no | on+adhoc | owner-only | 3 policies |
| user_email_preferences | active | yes | yes | no | on+adhoc | owner-only | 3 policies |
| user_feedback | active | yes | yes | no | on+adhoc | owner-only | 4 policies |
| user_stats | active | yes | no | no | on+adhoc | owner-only | 2 policies. PK is user_id |
| user_achievements | active | yes | yes | no | on+none | owner-only | RLS on but 0 policies! |
| user_follows | active | no | yes | no | on+adhoc | custom | 3 policies. Follower/following model |
| heatmap_saves | ? | yes | yes | yes | on+adhoc | ? | Uses raw JWT parsing instead of auth.uid(). 4 policies |
| agent_conversations | active | yes | yes | no | on+adhoc | owner-only | 4 policies |
| agent_requests | active | yes | yes | no | on+adhoc | owner-only | 2 policies |

---

## Organization & Permissions Infrastructure

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| organizations | active | no | yes | no | on+adhoc | custom | Own role-based model. 5 policies |
| organization_members | active | yes | yes | no | on+adhoc | custom | Own role-based model. 4 policies |
| organization_invitations | active | no | yes | no | on+adhoc | custom | Own role-based model. 8 policies (some duplicates) |
| permissions | active | no | yes | yes | on+adhoc | custom | The centralized permissions table itself. 4 policies |
| workspaces | ? | no | yes | no | off | ? | Has organization_id. No RLS |

---

## DM / Messaging System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| dm_conversations | active | no | yes | no | on+adhoc | custom | Participant-based access. 4 policies |
| dm_messages | active | no | yes | no | on+adhoc | custom | Participant-based access. 4 policies |
| dm_conversation_participants | active | yes | yes | no | on+adhoc | custom | Participant-based access. 4 policies |

---

## Admin / System Tables

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| admins | admin | yes | no | no | on+adhoc | custom | 2 policies |
| admin_email_logs | admin | no | yes | no | on+adhoc | custom | 2 policies. Admin-only access |
| system_prompts | admin | no | yes | no | on+adhoc | custom | Admin-only CRUD |
| system_prompts_new | admin | no | yes | no | on+adhoc | custom | 2 policies |
| system_prompt_categories | admin | no | yes | no | on+adhoc | custom | Admin-only CRUD |
| system_prompt_functionality_configs | admin | no | yes | no | on+adhoc | custom | Admin-only CRUD |
| system_prompt_executions | admin | yes | yes | no | on+adhoc | custom | User + admin read |
| system_announcements | admin | no | yes | no | on+adhoc | custom | 3 policies |
| contact_submissions | admin | yes | yes | no | on+adhoc | custom | User submits, admin manages. 4 policies |
| mcp_registry | admin | no | yes | no | on+adhoc | custom | 2 policies |
| prompt_builtins | admin | no | yes | no | on+adhoc | custom | 4 policies |
| shortcut_categories | admin | no | yes | no | on+adhoc | custom | 4 policies |
| prompt_shortcuts | admin | no | yes | no | on+adhoc | custom | 4 policies |

---

## Feedback System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| feedback_categories | active | no | yes | no | on+adhoc | custom | 2 policies |
| feedback_comments | active | no | yes | no | on+adhoc | custom | 4 policies |
| feedback_user_messages | active | no | yes | no | on+adhoc | custom | 3 policies |

---

## Guest / Public Execution System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| guest_executions | active | no | yes | no | on+adhoc | custom | Fingerprint-based. 5 policies |
| guest_execution_log | active | no | yes | no | on+adhoc | custom | 4 policies |
| invitation_codes | active | no | yes | no | on+adhoc | custom | 1 policy |
| invitation_requests | ? | no | yes | no | off | ? | No RLS. Is this still used? |

---

## Math System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| math_course_structure | ? | no | yes | no | on+adhoc | ? | 2 policies |
| math_problems | ? | no | yes | no | on+adhoc | ? | 3 policies |

---

## Content Blocks

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| content_blocks | ? | no | yes | no | on+adhoc | ? | 2 policies |
| category_configs | ? | no | yes | no | on+adhoc | ? | 2 policies |
| subcategory_configs | ? | no | yes | no | on+adhoc | ? | 2 policies |

---

## Task Management

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| tasks | active | yes | yes | no | on+adhoc | ? | 2 policies. Uses assignee_id pattern too. Org-aware? |
| task_assignments | active | yes | yes | no | off | ? | NO RLS! |
| task_attachments | ? | no | yes | no | off | ? | NO RLS! |
| task_comments | active | yes | yes | no | on+adhoc | parent-lookup | Child of tasks. 4 policies |
| projects | ? | no | yes | no | off | ? | Has created_by. No RLS |
| project_members | ? | yes | yes | no | off | ? | No RLS |

---

## Deprecated / Being Replaced by CX System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| ai_runs | deprecated | yes | yes | no | on+centralized | skip | Already has centralized. Leave as-is |
| ai_tasks | deprecated | yes | yes | no | on+centralized | skip | Already has centralized. Leave as-is |
| conversation | deprecated | yes | yes | yes | on+adhoc | skip | 4 ad-hoc policies |
| message | deprecated | yes | yes | yes | on+adhoc | skip | 4 ad-hoc policies |

---

## Not In Use / Being Rebuilt

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| applet | not-in-use | yes | yes | yes | off | skip | |
| applet_containers | not-in-use | no | yes | no | off | skip | |
| workflow | not-in-use | yes | yes | yes | on+adhoc | skip | 6 policies |
| workflow_node | not-in-use | yes | yes | yes | on+adhoc | skip | 6 policies |
| workflow_data | not-in-use | yes | yes | yes | off | skip | |
| workflow_node_data | not-in-use | yes | yes | yes | off | skip | |
| workflow_edge | not-in-use | no | yes | no | off | skip | |
| workflow_relay | not-in-use | yes | yes | no | off | skip | |
| workflow_user_input | not-in-use | yes | yes | no | off | skip | |
| recipe | not-in-use | yes | yes | yes | on+adhoc | skip | 5 policies |
| compiled_recipe | not-in-use | yes | yes | yes | on+adhoc | skip | 3 policies |
| recipe_broker | not-in-use | no | yes | no | off | skip | |
| recipe_display | not-in-use | no | yes | no | on+none | skip | |
| recipe_message | not-in-use | no | yes | no | off | skip | |
| recipe_message_reorder_queue | not-in-use | no | no | no | off | skip | |
| recipe_model | not-in-use | no | yes | no | off | skip | |
| recipe_processor | not-in-use | no | yes | no | off | skip | |
| microservice_project | not-in-use | yes | yes | no | on+adhoc | skip | 6 policies |
| registered_node | not-in-use | no | yes | no | off | skip | |
| registered_node_results | not-in-use | yes | yes | yes | off | skip | |
| registered_function | not-in-use | no | yes | no | off | skip | |
| custom_app_configs | not-in-use | yes | yes | yes | off | skip | |
| custom_applet_configs | not-in-use | yes | yes | yes | off | skip | |
| component_groups | not-in-use | yes | yes | yes | off | skip | |
| field_components | not-in-use | yes | yes | yes | off | skip | |
| data_broker | not-in-use | yes | yes | yes | off | skip | |

---

## System / Reference Tables (No User Ownership)

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| ai_model | system | no | yes | no | off | n/a | AI model definitions |
| ai_provider | system | no | yes | no | off | n/a | AI provider configs |
| ai_endpoint | system | no | yes | no | off | n/a | AI endpoint configs |
| ai_model_endpoint | system | no | yes | no | off | n/a | Junction table |
| ai_agent | system | no | yes | no | off | n/a | Agent definitions |
| ai_settings | system | no | yes | no | off | n/a | Global AI settings |
| ai_training_data | system | yes | yes | yes | on+none | n/a | RLS on, 0 policies |
| action | system | no | yes | no | off | n/a | Action definitions |
| arg | system | no | yes | no | off | n/a | Argument definitions |
| broker | system | no | yes | no | off | n/a | Broker definitions |
| category | system | no | yes | no | off | n/a | Category definitions |
| subcategory | system | no | yes | no | off | n/a | Subcategory definitions |
| processor | system | no | yes | no | off | n/a | Processor definitions |
| transformer | system | no | yes | no | off | n/a | Transformer definitions |
| extractor | system | no | yes | no | off | n/a | Extractor definitions |
| display_option | system | no | yes | no | off | n/a | Display options |
| data_input_component | system | no | yes | no | off | n/a | Input component defs |
| data_output_component | system | no | yes | no | off | n/a | Output component defs |
| container_fields | system | no | yes | no | off | n/a | Container field defs |
| node_category | system | no | yes | no | off | n/a | Node categories |
| message_broker | system | no | yes | no | off | n/a | Message broker defs |
| message_template | system | no | yes | no | off | n/a | Message templates |
| automation_boundary_broker | system | no | yes | no | off | n/a | Automation defs |
| automation_matrix | system | no | yes | no | off | n/a | Automation defs |
| tools | system | no | yes | no | off | n/a | Tool definitions |
| system_function | system | no | yes | no | off | n/a | System function defs |
| full_spectrum_positions | system | no | yes | no | off | n/a | Position data |
| schema_templates | system | no | yes | no | off | n/a | Schema templates |
| prompt_templates | system | no | yes | no | off | n/a | Prompt templates |
| prompt_app_categories | system | no | yes | no | off | n/a | App category defs |
| site_metadata | system | no | yes | no | off | n/a | Site metadata |
| file_structure | system | no | yes | no | off | n/a | File structure defs |
| bucket_structures | infra | no | no | no | off | n/a | Storage structure |
| bucket_tree_structures | infra | no | no | no | off | n/a | Storage tree structure |
| category_migration_map | infra | no | no | no | off | n/a | Migration mapping |
| _field_name_migration_log | infra | no | yes | no | off | n/a | Migration log |
| emails | infra | no | yes | no | off | n/a | Email queue/log |

---

## Scrape System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| scrape_configuration | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_job | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_task | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_task_response | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_cache_policy | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_cycle_run | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_cycle_tracker | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_override | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_override_value | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_parsed_page | ? | yes | yes | yes | off | ? | RLS OFF |
| scrape_base_config | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain_disallowed_notes | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain_notes | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain_quick_scrape_settings | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain_robots_txt | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_domain_sitemap | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_path_pattern | ? | no | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_path_pattern_cache_policy | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_path_pattern_override | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |
| scrape_quick_failure_log | ? | yes | yes | yes | on+none | ? | RLS on, 0 policies |

---

## Workers' Comp System

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| wc_claim | ? | no | yes | no | off | ? | No user_id. No RLS |
| wc_injury | ? | no | yes | no | off | ? | No user_id. No RLS |
| wc_report | ? | no | yes | no | off | ? | No user_id. No RLS |
| wc_impairment_definition | ? | no | yes | no | off | ? | No user_id. No RLS |

---

## Other / Uncategorized

| Table | Status | has user_id | has id | has is_public | RLS State | Sharing Eligible | Notes |
|-------|--------|-------------|--------|---------------|-----------|-----------------|-------|
| broker_value | ? | yes | yes | no | off | ? | No RLS. Related to automation system? |
| broker_values | ? | yes | yes | no | off | ? | No RLS. Has organization_id |
| audio_recording_users | ? | no | yes | no | off | ? | Junction table for audio? |
| audio_label | ? | no | yes | no | on+adhoc | ? | 2 policies |

---

## Summary Stats

| Category | Count |
|----------|-------|
| Total tables | ~150 |
| Tables with RLS enabled | ~85 |
| Tables using centralized has_permission() | 6 |
| Tables with ad-hoc policies only | ~45 |
| Tables with RLS on but 0 policies (blocks all access) | ~25 |
| Tables with RLS off (wide open) | ~65 |
| Tables marked ? (need classification) | ~35 |
