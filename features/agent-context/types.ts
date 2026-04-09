// Context Management — Type Definitions
// Source of truth: Supabase schema for context_items, context_item_values, context_templates, context_access_log

export type ContextItemStatus =
  | "idea"
  | "stub"
  | "gathering"
  | "partial"
  | "needs_review"
  | "ai_enriched"
  | "in_revision"
  | "pending_approval"
  | "active"
  | "provisional"
  | "stale"
  | "needs_update"
  | "superseded"
  | "archived"
  | "deprecated";

export type ContextValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "document"
  | "reference";
export type ContextFetchHint =
  | "always"
  | "on_demand"
  | "batch_related"
  | "lazy"
  | "never";
export type ContextSensitivity =
  | "public"
  | "internal"
  | "restricted"
  | "privileged";
export type ContextSourceType =
  | "manual"
  | "ai_generated"
  | "ai_enriched"
  | "imported"
  | "scraped"
  | "system";
export type ContextScopeLevel =
  | "user"
  | "organization"
  | "scope"
  | "project"
  | "task";

export type ContextScope = {
  type: ContextScopeLevel;
  id: string;
  name: string;
};

export type ContextItemManifest = {
  id: string;
  key: string;
  display_name: string;
  description: string;
  category: string | null;
  status: ContextItemStatus;
  value_type: ContextValueType;
  fetch_hint: ContextFetchHint;
  sensitivity: ContextSensitivity;
  tags: string[];
  user_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;
  depends_on: string[];
  char_count: number | null;
  data_point_count: number | null;
  has_nested_objects: boolean;
  json_keys?: string[];
  value_source_type: ContextSourceType | null;
  value_last_updated: string | null;
  last_verified_at: string | null;
  next_review_at: string | null;
  is_overdue_review: boolean;
};

export type ContextItem = ContextItemManifest & {
  status_note: string | null;
  status_updated_at: string;
  status_updated_by: string | null;
  current_value_id: string | null;
  source_type: ContextSourceType;
  review_interval_days: number | null;
  template_item_key: string | null;
  is_active: boolean;
  owner_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContextItemValue = {
  id: string;
  context_item_id: string;
  version: number;
  is_current: boolean;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | unknown[] | null;
  value_document_url: string | null;
  value_document_size_bytes: number | null;
  value_reference_id: string | null;
  value_reference_type: string | null;
  char_count: number;
  data_point_count: number | null;
  has_nested_objects: boolean;
  source_type: ContextSourceType;
  authored_by: string | null;
  change_summary: string | null;
  created_at: string;
};

export type ContextTemplate = {
  id: string;
  template_name: string;
  template_label: string;
  industry_category: string;
  display_order: number;
  item_key: string;
  item_display_name: string;
  item_description: string;
  default_scope_level: ContextScopeLevel;
  default_value_type: ContextValueType;
  default_fetch_hint: ContextFetchHint;
  default_sensitivity: ContextSensitivity;
  suggested_review_interval_days: number | null;
  fill_guidance: string | null;
  example_value: unknown | null;
  is_required: boolean;
  applies_to_text: string | null;
};

export type ContextAccessLogEntry = {
  id: string;
  context_item_id: string;
  value_id: string | null;
  value_version: number | null;
  user_id: string | null;
  agent_id: string | null;
  request_id: string | null;
  app_source: string | null;
  char_count_served: number | null;
  fetch_reason: string | null;
  was_useful: boolean | null;
  latency_ms: number | null;
  accessed_at: string;
};

export type ContextAccessSummary = {
  context_item_id: string;
  total_fetches: number;
  last_fetched: string | null;
  useful_rate: number | null;
};

// Form types
export type ContextItemFormData = {
  display_name: string;
  key: string;
  description: string;
  category: string | null;
  tags: string[];
  status: ContextItemStatus;
  status_note: string | null;
  value_type: ContextValueType;
  fetch_hint: ContextFetchHint;
  sensitivity: ContextSensitivity;
  source_type: ContextSourceType;
  review_interval_days: number | null;
  last_verified_at: string | null;
  depends_on: string[];
  owner_user_id: string | null;
};

export type ContextValueFormData = {
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | unknown[] | null;
  value_document_url: string | null;
  value_document_size_bytes: number | null;
  value_reference_id: string | null;
  value_reference_type: string | null;
  change_summary: string | null;
};

// Filter/sort types for item list
export type ContextItemFilters = {
  search: string;
  statuses: ContextItemStatus[];
  categories: string[];
  fetchHints: ContextFetchHint[];
  sensitivities: ContextSensitivity[];
  hasValue: "yes" | "no" | "either";
};

export type ContextItemSort = {
  field:
    | "display_name"
    | "status"
    | "updated_at"
    | "next_review_at"
    | "char_count";
  direction: "asc" | "desc";
};

export type ContextItemView = "cards" | "table" | "kanban";

// Dashboard stat types
export type ContextDashboardStats = {
  totalItems: number;
  activeVerified: number;
  needsAttention: number;
  emptyStub: number;
};

export type ContextCategoryHealth = {
  category: string;
  total: number;
  active: number;
  partial: number;
  stub: number;
  needsAttention: number;
};

// Template industry grouping
export type ContextIndustryGroup = {
  industry_category: string;
  template_name: string;
  template_label: string;
  item_count: number;
  required_count: number;
  example_items: string[];
};
