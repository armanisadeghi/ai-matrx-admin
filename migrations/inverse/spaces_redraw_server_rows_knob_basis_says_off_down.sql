-- chair-step: the inverse of migrations/spaces_redraw_server_rows_knob_basis_says_off.sql — it puts the
--   stale basis text of platform.feature_knob (data, server_rows) back exactly as it was; the value is untouched.

update platform.feature_knob
   set basis = 'SSR-ROWS-3 ruling 2026-10-08: ON for everyone. The page races the server''s seed against the browser''s own first reads (asked at hydration), so a slow server costs nothing. Production pairs (admin, Deliverables, rows visible ms, ON vs OFF): cold 1269/2152, 1890/2565; warm 1608/1955, 1142/2022, 1229/1883; one post-deploy app-wide stall excluded (cold 7039/2530).'
 where feature = 'data' and key = 'server_rows';
