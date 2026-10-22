-- 20261022181700_frame_sidebar_places_knob.sql
-- lane: product sidebars (Arman 2026-10-22: every product sidebar's top carries chosen related places + More,
-- with layered defaults system -> organization -> person). ONE shared shaped knob for every product in the frame:
-- a map of product id -> the place ids shown above More. The system rung is {} = each product's declared
-- defaults (features/shell/frame/relatedPlaces.ts); an organization or a person sets only the products they change.
-- The conversation sidebar keeps its own knob (chat.history.sidebar), which also carries its buckets and mode.
insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value,
   allowed_values, label, description, set_by, basis, review_due,
   overridable_by, override_direction)
values
  ('shell.sidebar', 'places', '{}', '{}',
   'json', null, null, null, null,
   'Sidebar places above More',
   'For each product, which related places sit at the top of its sidebar; every other place is under More.',
   'agent',
   'Arman 2026-10-22: the conversation sidebar''s top (Agents, Workflows, Scheduled, then More) is a pattern every product sidebar must have. Defaults are each product''s first three declared places.',
   current_date + 45, '{organization,user}', 'any')
on conflict (feature, key) do nothing;
