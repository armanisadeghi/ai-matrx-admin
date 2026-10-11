# Education Library — how to work on this page

You are on the **Education Library** (`/education/library`, surface `matrx-user/education-library`).
This guide is for an agent helping the person here. Read it once before your first write.

## What the page is

One list of everything the person studies from. Four record types share it:

| `kind` | What it is | `format` values | Opens at |
|---|---|---|---|
| `fc_set` | a flashcard set (deck) | `flashcards` | `/education/flashcards/<id>` |
| `assessment` | a quiz or practice test | `quiz`, `practice_test` | `/education/quizzes/<id>`, `/education/practice-tests/<id>` |
| `study_media` | generated study media | `audio`, `summary`, `mind_map`, `memory_aid` | `/education/audio-study/<id>`, `/education/summaries/<id>`, `/education/mind-maps/<id>`, `/education/memory/<id>` |
| `note` | a study note | `notes` | `/education/notes/<id>` |

Three tabs split them by owner: **Mine** (`mine`), **Shared with me** (`shared`), **Public**
(`public`). 25 rows per page, with search, a filter panel (type, format, status, visibility) and a sort.

## What you can read

- `library_state`: `"ready"`, `"loading"` or `"failed"`. List values exist only when `"ready"`;
  `"loading"`/`"failed"` is never an empty library (say it has not loaded; give `library_error`).
- `library_list` (shown in full, no lookup): the first 25 rows of the current tab, search, filters
  and sort, each `{ id, title, format, items?, due?, accuracy_pct?, last_studied?, mine? }`. Fields
  with nothing to say are omitted: `items` only for formats that have one; `due` only above 0;
  `accuracy_pct` (0-100) and `last_studied` (YYYY-MM-DD) only once studied (missing is never 0%);
  `mine: false` only on someone else's item. Titles over 60 characters are cut.
- `library_total` (all matches across pages; say so if larger than the rows you see), `tab_counts`
  `{ mine, shared, public }`, `active_tab`, `search_query`, `active_sort`, `active_filters`,
  `list_page` `{ page, page_size }`, `filter_options` (the filter values on offer, with counts).
- `library_rows`: the same rows with every field (description, topic, difficulty, source, workspace,
  owner, dates, `href`). Look it up ONCE with the `context` tool only when you need those fields.

"What's in my library?" is answered from `library_list`, `library_total` and `tab_counts` alone:
group by type, name what is due, say which tab you describe.

## What you can write

One target, **`library_view`**: it changes what the list shows (like the search box, tabs, filters,
sort and pager), saves nothing, and is approved on a card. Send only the keys to change:

```json
{ "tab": "mine", "kinds": ["assessment"], "formats": ["quiz"], "sort_by": "title", "sort_direction": "asc" }
```

- `search_query` (`""` clears), `tab` (`mine|shared|public`), `kinds` (`fc_set|assessment|study_media|note`),
  `formats` / `statuses` / `visibilities` (values from `filter_options`); each array REPLACES that
  filter and `[]` clears it.
- `sort_by`: `updated|created|title|kind|subtype|status|visibility|organization_name|owner_email`;
  `sort_direction`: `asc|desc`; `page`: 1+ (a change of tab, search or filter resets to page 1 unless you send `page`).

An unknown key or value refuses the whole change, with the reason, before any card. After it lands,
your values still describe the OLD view; tell the person what you changed instead of reporting the new list.

## What this page cannot do

The library has no save, rename, archive or delete (row menu: Open, Study, Attach to, Share), so
there are no write targets for the records themselves, on purpose:

- To change or delete an item, send the person to its page (`library_rows[].href`).
- To create study material: `/education/kits/new`. To browse and copy public decks: `/education/library/community`.
- Never use generic scope, context or database tools on these items: they skip each type's own rules.

## When you are stuck

- Empty `library_list` with `library_state: "ready"`: nothing matches. Check `search_query` and
  `active_filters` before saying the library is empty, and offer to clear them with `library_view`.
- Something on this page is missing or wrong: report it with the `surface_feedback` target.
