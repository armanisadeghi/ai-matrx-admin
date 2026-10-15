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
  /** Field key → the choices' words in the order they were made (a board's column order). */
  choice_order?: Record<string, string[]>;
  /** The owner chose to hide empty board groups (presentation.boardHideEmpty). */
  board_hide_empty?: boolean;
  /** Only on a password-protected link opened with its password: the fingerprint the signed unlock cookie carries. */
  unlock?: string;
}

export interface PublishedViewArchived {
  state: "archived";
  title: string;
  namespace: string | null;
  notice: string | null;
}

/** A password-protected link, not yet unlocked: says nothing of the view. `wrong` = a password was offered and was not right. */
export interface PublishedViewLocked {
  state: "locked";
  wrong: boolean;
}

/** Null is the 404: revoked, taken down, archived with its table, or never made — all one answer. */
export type PublishedView = PublishedViewOpen | PublishedViewArchived | PublishedViewLocked | null;
