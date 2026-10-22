-- Inverse of migrations/campaign/askworkspace_a_the_workspace_ask_knobs.sql

set local lock_timeout = '3s';

delete from platform.feature_knob
 where feature = 'spaces.ask_workspace'
   and key in ('top_pages', 'top_records', 'page_excerpt_chars', 'search_terms_max');
