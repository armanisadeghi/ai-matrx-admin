-- lane: ASK-WORKSPACE
-- lock: platform
-- additive: yes
--
-- ASK-WORKSPACE — THE WORKSPACE ASK'S RETRIEVAL LIMITS ARE KNOBS.
--
-- "Ask about my whole workspace" (Spaces Ask AI, Notion parity CD-TPL-11) picks the top pages, records and
-- tables the person can see before any agent runs (aidream/services/spaces_workspace/provision.py). How many
-- of each, how long a page excerpt is, and how many search words a question yields are these four rows.

set local lock_timeout = '3s';

insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value, label, description,
   set_by, basis, review_due, overridable_by, override_direction, propagation)
values
  ('spaces.ask_workspace', 'top_pages', '6'::jsonb, '6'::jsonb, 'integer', 'pages', 1, 30,
   'Pages an Ask-the-workspace answer reads',
   'The best-matching Spaces pages (most search words hit, then most recently edited) handed to the workspace answer.',
   'agent', 'Agent-set limit (blind approval), lane ASK-WORKSPACE 2026-10-22: Notion Q&A cites a handful of pages; six keeps the input lean.',
   '2026-12-22', array['organization', 'user'], 'any', 'next_load'),
  ('spaces.ask_workspace', 'top_records', '8'::jsonb, '8'::jsonb, 'integer', 'records', 0, 50,
   'Records an Ask-the-workspace answer reads',
   'The best-matching custom-table records handed to the workspace answer, with their field values.',
   'agent', 'Agent-set limit (blind approval), lane ASK-WORKSPACE 2026-10-22.',
   '2026-12-22', array['organization', 'user'], 'any', 'next_load'),
  ('spaces.ask_workspace', 'page_excerpt_chars', '1500'::jsonb, '1500'::jsonb, 'integer', 'characters', 200, 20000,
   'Characters read from each matched page',
   'Each matched page''s text is cut to this length before the workspace answer reads it; its full length is shown beside it.',
   'agent', 'Agent-set limit (blind approval), lane ASK-WORKSPACE 2026-10-22: six pages at 1,500 characters stays under ~3k tokens.',
   '2026-12-22', array['organization', 'user'], 'any', 'next_load'),
  ('spaces.ask_workspace', 'search_terms_max', '6'::jsonb, '6'::jsonb, 'integer', 'words', 1, 12,
   'Search words taken from a workspace question',
   'The question''s subject words (frame words like what, which, the dropped) the retrieval searches pages and records for.',
   'agent', 'Agent-set limit (blind approval), lane ASK-WORKSPACE 2026-10-22.',
   '2026-12-22', array['organization', 'user'], 'any', 'next_load')
on conflict (feature, key) do nothing;
