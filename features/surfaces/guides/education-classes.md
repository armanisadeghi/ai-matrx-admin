# My Classes — how to work on this page

You are on **My Classes** (`/education/classes`, surface `matrx-user/education-classes`).
This guide is for an agent helping the person here. Read it once before your first write.

## What a class is

A class holds one course's study material: a name, and optionally description, teacher, term,
period, access mode, price and exam dates. Under the hood it is a scope of the workspace's "Class"
scope type, but you never touch scopes: every change goes through this page's write targets, which
run the same code as the page's buttons (so each class keeps its settings, join code and owner membership).

Access modes: `closed` (default, private), `open` (publicly listed; anyone can join), `paid` (needs a
price in US dollars, at least 1).

## What you can read

- `organization_state`: `"ready"` when a workspace is selected; anything else is why the list cannot
  load (a create will then ask which workspace).
- `class_list` (shown in full, no lookup): the active classes by name, first 25, each
  `{ id, name, teacher, term, period, access_mode, next_exam }`. Start here; its ids work with every
  target. Look up `owned_classes` only for a description, all exam dates or the price.
- `owned_classes`: active classes, name-ordered, each `{ id, slug, name, description, teacher, term, period,
  access_mode, price_cents, exam_dates: [{ title, date }] }` (`price_cents` only for paid; absent while
  loading or with no workspace, `[]` when none). `archived_classes`: same shape, hidden from the list;
  absent exactly when `owned_classes` is. `owned_class_count`, `archived_class_count`.
- `joined_classes`: classes someone else owns, `{ id, slug, name, access_mode, my_status }`
  (`active`, `pending`, `entitled` = purchased, not yet enrolled). Not editable.
- `class_dialog_open`, `new_class_draft` (`price` there is dollars as typed).

Lists are shown in full up front; if one arrives as a look-up item, read it ONCE with the `context` tool.

## What you can write

Call the write tool with `target` and `value`; every target asks the person first (one card per write).

**`create_classes`** — an ARRAY of 1-25 classes, only `name` required, saved immediately. "Add my five
courses" is ONE write:

```json
[
  { "name": "AP Biology", "teacher": "Ms. Rivera", "term": "Fall 2026", "period": "3" },
  { "name": "Calculus BC", "exam_dates": [{ "title": "Midterm", "date": "2026-10-20" }] },
  { "name": "Spanish II", "access_mode": "open" }
]
```

Set `access_mode` only when the person says who may join. A duplicate name in the list, or one the
person already has, refuses the whole write.

**`update_classes`** — by `id` (from `owned_classes` or `archived_classes`); only sent fields change,
`""` clears a text field, `exam_dates` REPLACES the whole list (send every exam to keep),
`archived: true|false` archives/restores. Switching to `"paid"` needs `price` unless one exists; a
`price` on a non-paid class is refused.

```json
[{ "id": "<id>", "description": "Honors chemistry", "exam_dates": [{ "title": "Final", "date": "2026-12-15" }] },
 { "id": "<another id>", "archived": true }]
```

**`delete_classes`** — `["<id>"]` or `[{ "id": "<id>" }]`. Permanent: the class disappears for every
student, tagged items lose the link, nothing can undo it; only a workspace owner or admin can.
**Prefer archiving**; delete only when clearly asked (a mistake or duplicate).

**`new_class_draft`** — ONE object (e.g. `{ "name": "AP Biology", "access_mode": "paid", "price": 49 }`)
that fills the New class dialog without saving so the person can review and press Create class. Use
it when they want to look first; otherwise `create_classes`.

## Rules

1. `value` is the array or object itself, never a JSON-encoded string.
2. Validation happens before the approval card: a bad value (missing name, bad date, unknown id,
   duplicate) is refused with the reason and nothing changes. Fix and call again.
3. A successful write returns names, ids, slugs: use them for follow-ups.
4. The lists are a snapshot from when your run started: trust the write result, do not re-read to
   "check", never repeat a write that succeeded.
5. A decline is a normal answer: do not retry; ask what they want.
6. Never use `scope_system` (or any generic scope or context tool) for classes: they skip or wipe
   access mode, join code, exam dates and owner membership, and can change the Class type for everyone.
7. Dates are `YYYY-MM-DD`; prices are dollars, not cents.

## When you are stuck

If no target can do what the person wants (manage a roster, change a joined class, restore a deleted
class), say so plainly and file it with the **`surface_feedback`** target (no approval, changes nothing):

```json
{ "kind": "missing_capability", "message": "Person wanted to move students between classes; no target does this.", "target_or_value": "update_classes" }
```

Also use it when a description here was wrong or unclear or data was missing (`kind`:
`missing_capability`, `wrong_or_unclear_description`, `bug`, `missing_data`, `suggestion`).
