// features/shell/shell-layout/shellLayout.typed-table.ts — THE STORED LAYOUTS (project custom-experience §5.2;
// frozen contract ./contract.ts).
//
// Organization scope, one row per `slot`: `org` is the organization's own layout, `person:<uuid>` one
// person's. The whole `ShellLayoutBody` is JSON text in `body` (parsed by `parseShellLayoutBody`). Every
// write is a record version in the store, so History lists, previews and restores any version with no
// second store. A person's row is written in ONE home organization: the organization it already lives
// in, else the organization new things are saved in; it is read across every organization, newest wins.
//
// The (core) layout reads these rows at boot through `iam.shell_layout_seed` (inside
// `iam.core_boot_seed`), which finds this table by its slug + kept_for — keep both in step with it.
import { defineTypedTable, f } from "@ai-matrx/records/typed-table";
import { SHELL_LAYOUT_KEPT_FOR, SHELL_LAYOUT_TABLE_SLUG } from "./contract";

export const shellLayoutTable = defineTypedTable({
  name: "Layout",
  slug: SHELL_LAYOUT_TABLE_SLUG,
  kept_for: SHELL_LAYOUT_KEPT_FOR,
  scope: "organization",
  key: "slot",
  fields: {
    slot: f.text({ label: "Slot", unique: true, required: true }),
    body: f.longText({ label: "Layout", required: true }),
    note: f.text({ label: "Note" }),
    saved_at: f.datetime({ label: "Saved" }),
  },
});
