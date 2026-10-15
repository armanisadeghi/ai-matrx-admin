// features/sharing/public-view/types.ts — what `custom.published_view_read` answers, declared in full so a
// change of the door's shape is a type error here and not a wrong screen.

export interface PublishedViewField {
  key: string;
  label: string;
  type: string;
  multi: boolean;
  /** `created_time` / `modified_time` for the two stamps whose value is read off the row. */
  system: string | null;
  relation_target: string | null;
  format: string | null;
}

export interface PublishedViewRow {
  id: string;
  created_at: string;
  updated_at: string;
  values: Record<string, unknown>;
}

export interface PublishedViewOpen {
  state: "open";
  title: string;
  table: string | null;
  /** The view's own layout: grid | kanban | calendar | gallery | timeline | list | chart. */
  layout: string;
  group_field: string | null;
  date_field: string | null;
  end_field: string | null;
  namespace: string | null;
  notice: string | null;
  fields: PublishedViewField[];
  rows: PublishedViewRow[];
  count: number;
  truncated: boolean;
  /** Record id → its words (related records, people, files). */
  refs: Record<string, string>;
  /** Field key → normalised choice → the choice's words. */
  labels: Record<string, Record<string, string>>;
}

export interface PublishedViewArchived {
  state: "archived";
  title: string;
  namespace: string | null;
  notice: string | null;
}

/** Null is the 404: revoked, taken down, archived with its table, or never made — all one answer. */
export type PublishedView = PublishedViewOpen | PublishedViewArchived | null;
