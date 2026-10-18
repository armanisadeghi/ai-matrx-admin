-- spaces_redraw_server_rows_knob_basis_says_off.sql (lane SPACES-REDRAW, 2026-10-17)
--
-- DATA ONLY: corrects the `basis` text of platform.feature_knob (data, server_rows). The VALUE is untouched (false).
-- The basis read "SSR-ROWS-3 ruling 2026-10-08: ON for everyone…" while the knob is OFF; the final measurement
-- (matrx-frontend f72280849a6, features/unified-data/page-seed/FEATURE.md) kept the platform default OFF. An agent
-- reading the basis would flip it on and slow every member's table page.
--
-- INVERSE: migrations/inverse/spaces_redraw_server_rows_knob_basis_says_off_down.sql

update platform.feature_knob
   set basis = 'OFF on purpose (SSR-ROWS-3 final pairs, 2026-10-08, matrx-frontend f72280849a6, features/unified-data/page-seed/FEATURE.md): with ON, admin rows land faster (5 of 6 pairs) but the member is slower (5 of 6) because the member''s server seed carries no rows, so ON only adds server work and a later page. Platform default stays OFF until the member path is diagnosed. (Earlier text ''ON for everyone'' was stale.)'
 where feature = 'data' and key = 'server_rows';
