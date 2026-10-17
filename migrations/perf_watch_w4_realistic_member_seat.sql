-- based-on: ops.perf_watch_declare(text,text,text,jsonb,numeric,text,integer,text,text) live 2026-10-17
-- chair-step: soft-deletes one perf watch (door:custom.views@member@large) because the realistic seat is not in the organization that owns its pinned table; the watch keeps its history as a deleted row and the same door stays probed by its @stress twin.
--
-- perf_watch_w4_realistic_member_seat.sql
--
-- PERFORMANCE WATCH, WAVE 4 — THE @member SEAT IS A REAL MEMBER; THE 1,531-ORG SEAT IS A LABELLED STRESS PROBE.
--   Problem: every @member twin probed as test@test.com, who belongs to 1,531 organizations. Real
--   users belong to 1-2 (p99 = 2). The member probes measured a seat no person has and paged about
--   ~1 s on doors that take 50-70 ms for a real member (server time, W1-PERF2 2026-10-17).
--   1. New permanent persona-factory account bradley.gillespie.5c3ce1@fixtures.aimatrx.com (suite
--      perf-watch/member-seat, no expiry): a plain MEMBER of Holloway Creative (which owns the pinned
--      record-store tables) plus its own personal organization = 2 organizations.
--   2. The ten record-store @member twins (custom.read_records_page, record_aggregate,
--      relation_words_with_icons_many, views, platform.drill_rows; normal and @large) are re-declared on
--      that seat, same doors, same pinned args, SAME BUDGET (nothing raised). Each re-declare writes its
--      subject marker, so history before it is not judged against the new seat.
--   3. The old seat stays as `<slug>` with `@member` renamed `@stress`: label "stress seat (1,531
--      organizations)", seat test@test.com, budget 2500 ms p95 of its own (a stress ceiling, not a
--      real-user budget), owner PERF-WATCH-STRESS, so it can never page as a real-user regression.
--   4. door:custom.views@member@large is retired: its pinned table belongs to Rincon Plumbing, which the
--      realistic seat is not a member of (and adding it would make 3 organizations); its @stress twin
--      keeps the door measured.
-- Other @member twins (notes, conversations, files, knobs, ...) read the seat's OWN data and are out of
-- this file.
-- Inverse: migrations/inverse/perf_watch_w4_realistic_member_seat_down.sql.

do $w4$
declare
  c_seat constant text := 'bradley.gillespie.5c3ce1@fixtures.aimatrx.com';
  c_slugs constant text[] := array[
    'door:custom.read_records_page:first_50@member', 'door:custom.read_records_page:first_50@member@large',
    'door:custom.read_records_page:sorted_search@member', 'door:custom.read_records_page:sorted_search@member@large',
    'door:custom.record_aggregate@member', 'door:custom.record_aggregate@member@large',
    'door:custom.relation_words_with_icons_many@member', 'door:custom.relation_words_with_icons_many@member@large',
    'door:custom.views@member', 'door:custom.views@member@large',
    'door:platform.drill_rows@member', 'door:platform.drill_rows@member@large'];
  p record;
  v_n int;
begin
  if not exists (select 1 from auth.users where email = c_seat and deleted_at is null) then
    raise exception 'realistic member seat % does not exist', c_seat;
  end if;
  -- 1. stress twins first (copy of the existing member watch, own slug/budget/owner)
  for p in select * from ops.proof_check where slug = any (c_slugs) and deleted_at is null loop
    perform ops.perf_watch_declare(replace(p.slug, '@member', '@stress'), 'door',
              replace(p.label, ' · member seat', '') || ' · stress seat (1,531 organizations)',
              p.perf_subject, 2500, 'p95', p.live_every_seconds, 'PERF-WATCH-STRESS', p.source_feature);
  end loop;
  -- 2. repoint the real-member twins (all but views@member@large)
  for p in select * from ops.proof_check where slug = any (c_slugs) and slug <> 'door:custom.views@member@large' and deleted_at is null loop
    perform ops.perf_watch_declare(p.slug, 'door', replace(p.label, ' · member seat', '') || ' · member seat (2 organizations)',
              p.perf_subject || jsonb_build_object('seat_email', c_seat),
              p.budget_ms, p.budget_stat, p.live_every_seconds, p.owner, p.source_feature);
  end loop;
  -- 3. retire the one the realistic seat cannot reach
  update ops.proof_check set deleted_at = now(), is_active = false
   where slug = 'door:custom.views@member@large' and deleted_at is null;
  select count(*) into v_n from ops.proof_check where slug like 'door:%@stress%' and deleted_at is null;
  if v_n <> 12 then raise exception 'expected 12 stress twins, found %', v_n; end if;
  select count(*) into v_n from ops.proof_check where slug = any (c_slugs) and deleted_at is null
     and perf_subject->>'seat_email' = c_seat;
  if v_n <> 11 then raise exception 'expected 11 realistic member twins, found %', v_n; end if;
end
$w4$;
