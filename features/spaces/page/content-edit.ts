// features/spaces/page/content-edit.ts — whether this person holds Edit (content, never structure) on a page.
// ONE-LADDER (2026-10-10): `edit_content` is retired; Edit (editor) is content only and Full access (admin)
// adds structure and sharing. get_resource_access answers view / edit / admin, so "edit" is the content tier.

/** True when this person may change the page's values and content but not its structure. */
export function isContentEditOnly(level: string | null | undefined): boolean {
  return level === "edit";
}
