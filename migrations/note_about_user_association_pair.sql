-- Notes about a person (admin user page, Notes tab): a workbench note points at the
-- person it is about. Little points to big: note -> user. Non-conveying — the edge
-- never grants anyone access to the person or the note (container_side = 'none').
insert into platform.association_types (source_type, target_type, container_side, conveys_max, is_active, notes) values
  ('note', 'user', 'none', 'viewer', true, 'A note about a person (admin user page Notes tab). Non-conveying. 2026-10-17')
on conflict do nothing;
