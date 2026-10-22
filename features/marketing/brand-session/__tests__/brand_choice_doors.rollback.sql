do $t$
declare
  v_brand  uuid := 'd940215a-be2f-4505-a21b-c6374e9e7009';
  v_org    uuid := '226be635-194d-42dd-87c8-7a9562f70939';
  v_me     uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_tag    uuid := (select id from platform.categories where dimension = 'brand_element' and slug = 'h6_tagline');
  v_goal   uuid := (select id from platform.categories where dimension = 'brand_element' and slug = 'a2_goals');
  a uuid; b uuid; g1 uuid; g2 uuid; s uuid; w uuid; x uuid;
  t1 uuid; t2 uuid; sa uuid; s1 uuid; s2 uuid; ca uuid; cc uuid; v_off uuid;
  v_stance uuid := (select id from platform.categories where dimension = 'brand_element' and slug = 'a3_offering_stance');
  r jsonb; ok text[] := '{}'; bad text[] := '{}'; st text;
  person_claims text := json_build_object('sub', '87a6e699-3622-4869-8843-d0867456c0dd', 'role', 'authenticated')::text;
  -- what PostgREST puts in request.headers for a signed-in browser call through supabase-js (no actor header)
  browser_headers text := '{"apikey":"sb_publishable_x","authorization":"Bearer x","x-client-info":"supabase-js-web/2.75.0","content-type":"application/json","content-profile":"web","accept":"*/*"}';
begin
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id, recommended_placement)
  values (v_brand, v_tag, '{"text":"Cuts that last"}', 'ai', v_org, 'lead') returning id into a;
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_tag, '{"text":"Sharp since 1990"}', 'found', v_org) returning id into b;
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_goal, '{"text":"More bookings"}', 'ai', v_org) returning id into g1;
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_goal, '{"text":"Higher prices"}', 'ai', v_org) returning id into g2;

  -- 1. no signed-in person (a job / service role) is refused
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.headers', '', true);
  begin
    perform web.brand_choice_decide(a, 'lead');
    raise exception 'FAIL 1: job chose';
  exception when insufficient_privilege then ok := ok || 'job refused'::text;
  end;

  -- 2. an agent acting in the person's browser (declares x-matrx-actor-tier: agent) is refused
  perform set_config('request.jwt.claims', person_claims, true);
  perform set_config('request.headers', '{"x-matrx-actor-tier":"agent"}', true);
  begin
    perform web.brand_choice_decide(a, 'lead');
    raise exception 'FAIL 2: agent chose';
  exception when insufficient_privilege then ok := ok || 'agent refused'::text;
  end;
  begin
    perform web.brand_choice_correct(a, '"my words"'::jsonb, 'lead');
    raise exception 'FAIL 2b: agent corrected';
  exception when insufficient_privilege then ok := ok || 'agent correction refused'::text;
  end;

  -- 3. a stranger with no access to the brand is refused
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  perform set_config('request.headers', '{}', true);
  begin
    perform web.brand_choice_decide(a, 'lead');
    raise exception 'FAIL 3: stranger chose';
  exception when insufficient_privilege then ok := ok || 'stranger refused'::text;
  end;

  -- 4. the person chooses: chosen, lead, signed by them
  perform set_config('request.jwt.claims', person_claims, true);
  perform set_config('request.headers', '{}', true);
  r := web.brand_choice_decide(a, 'lead', 'Says what we do', 'test');
  select decision || '/' || placement || '/' || (decided_by = v_me)::text into st from web.brand_choice where id = a;
  if st <> 'chosen/lead/true' then raise exception 'FAIL 4: %', st; end if;
  ok := ok || 'person chose'::text;

  -- 5. a single-value element: choosing B supersedes A, linked superseded_by
  r := web.brand_choice_decide(b, 'support');
  select decision into st from web.brand_choice where id = a;
  if st <> 'superseded' or r -> 'superseded' <> to_jsonb(array[a]) then raise exception 'FAIL 5: % %', st, r; end if;
  if not exists (select 1 from platform.associations where source_id = a and target_id = b and label = 'superseded_by' and deleted_at is null) then
    raise exception 'FAIL 5b: no superseded_by edge';
  end if;
  ok := ok || 'single-value superseded'::text;

  -- 6. a many-value element: both chosen, nothing superseded
  perform web.brand_choice_decide(g1, 'lead');
  r := web.brand_choice_decide(g2, 'lead');
  if (select count(*) from web.brand_choice where id in (g1, g2) and decision = 'chosen') <> 2 or r -> 'superseded' <> '[]'::jsonb then
    raise exception 'FAIL 6: %', r;
  end if;
  ok := ok || 'many-value kept both'::text;

  -- 7. undo: retracting B puts B back to open and A back to chosen; the edge is gone
  r := web.brand_choice_decide(b, 'retract');
  select string_agg(decision, ',' order by id = a desc) into st from web.brand_choice where id in (a, b);
  if st <> 'chosen,open' or r -> 'restored' <> to_jsonb(array[a]) then raise exception 'FAIL 7: % %', st, r; end if;
  if exists (select 1 from platform.associations where source_id = a and target_id = b and label = 'superseded_by' and deleted_at is null) then
    raise exception 'FAIL 7b: superseded_by edge still live';
  end if;
  if (select placement from web.brand_choice where id = a) <> 'lead' then raise exception 'FAIL 7c: placement lost'; end if;
  ok := ok || 'undo restored'::text;

  -- 8. not sure / not us
  perform web.brand_choice_decide(b, 'not_sure');
  if (select decision from web.brand_choice where id = b) <> 'parked' then raise exception 'FAIL 8'; end if;
  perform web.brand_choice_decide(b, 'not_us', 'Sounds old');
  if (select decision || '/' || decision_reason from web.brand_choice where id = b) <> 'declined/Sounds old' then raise exception 'FAIL 8b'; end if;
  ok := ok || 'parked and declined'::text;

  -- 9. long-press correction on a word: a said row grown from A, placed, and it does NOT supersede A
  r := web.brand_choice_correct(a, jsonb_build_object('text', 'last', 'part_of', a, 'start', 2, 'end', 2), 'not_us', 'Sounds cheap');
  w := (r ->> 'id')::uuid;
  select origin || '/' || decision into st from web.brand_choice where id = w;
  if st <> 'said/declined' then raise exception 'FAIL 9: %', st; end if;
  if not exists (select 1 from platform.associations where source_id = w and target_id = a and label = 'grew_from' and deleted_at is null) then
    raise exception 'FAIL 9b: no grew_from edge';
  end if;
  if (select decision from web.brand_choice where id = a) <> 'chosen' then raise exception 'FAIL 9c: a word remark superseded the value'; end if;
  ok := ok || 'word correction'::text;

  -- 10. a whole rewording placed lead supersedes A (single-value)
  r := web.brand_choice_correct(a, '"Cuts that stay sharp"'::jsonb, 'lead');
  s := (r ->> 'id')::uuid;
  if (select decision from web.brand_choice where id = a) <> 'superseded' or (select value ->> 'text' from web.brand_choice where id = s) <> 'Cuts that stay sharp' then
    raise exception 'FAIL 10: %', r;
  end if;
  ok := ok || 'rewording superseded'::text;

  -- 11. withdraw: own words only
  perform web.brand_choice_decide(w, 'withdraw');
  if (select deleted_at from web.brand_choice where id = w) is null then raise exception 'FAIL 11'; end if;
  begin
    perform web.brand_choice_decide(g1, 'withdraw');
    raise exception 'FAIL 11b: withdrew an AI candidate';
  exception when insufficient_privilege then null;
  end;
  ok := ok || 'withdraw own words only'::text;

  -- 12. the server acting with the person's claims but declaring nothing (tier NULL — no request.headers) is refused,
  --     at the doors and at the trigger (review findings 2 + 3)
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_goal, '{"text":"Repeat customers"}', 'ai', v_org) returning id into x;
  perform set_config('request.jwt.claims', person_claims, true);
  perform set_config('request.headers', '', true);
  begin
    perform web.brand_choice_decide(x, 'lead');
    bad := bad || ('FAIL 12' || ': undeclared server write chose');
  exception when insufficient_privilege then null;
  end;
  begin
    perform web.brand_choice_correct(x, '"server words"'::jsonb, 'lead');
    bad := bad || ('FAIL 12b' || ': undeclared server write corrected');
  exception when insufficient_privilege then null;
  end;
  begin
    update web.brand_choice set decision = 'chosen', placement = 'lead', decided_by = v_me, decided_at = now() where id = x;
    bad := bad || ('FAIL 12c' || ': undeclared server write set decision directly');
  exception when insufficient_privilege then null;
  end;
  ok := ok || 'undeclared server refused'::text;

  -- 13. an agent in the person's browser writing decision directly (bypassing the door) is refused by the trigger
  perform set_config('request.headers', '{"x-matrx-actor-tier":"agent"}', true);
  begin
    update web.brand_choice set decision = 'chosen', placement = 'lead', decided_by = v_me, decided_at = now() where id = x;
    bad := bad || ('FAIL 13' || ': agent set decision directly');
  exception when insufficient_privilege then null;
  end;
  ok := ok || 'agent direct write refused'::text;

  -- 14. a real browser call (role authenticated, PostgREST headers, no actor header) still chooses — door and direct
  perform set_config('request.headers', browser_headers, true);
  perform set_config('role', 'authenticated', true);
  r := web.brand_choice_decide(x, 'support');
  if (select decision from web.brand_choice where id = x) <> 'chosen' then bad := bad || ('FAIL 14' || ': ' || coalesce(r::text, '')); end if;
  update web.brand_choice set decision = 'declined', placement = null, decided_by = v_me, decided_at = now() where id = x;
  if (select decision from web.brand_choice where id = x) <> 'declined' then bad := bad || ('FAIL 14b' || ': browser direct write lost'); end if;
  perform set_config('role', 'postgres', true);
  ok := ok || 'browser person passes'::text;

  -- 15. undo by re-placing (review finding 4): S superseded A; moving S to not_us brings A back, and so does not_sure
  r := web.brand_choice_decide(s, 'not_us');
  if (select decision from web.brand_choice where id = a) <> 'chosen' or r -> 'restored' <> to_jsonb(array[a]) then
    bad := bad || ('FAIL 15' || ': ' || coalesce((select decision from web.brand_choice where id = a), '?') || ' ' || coalesce(r::text, ''));
  end if;
  if exists (select 1 from platform.associations where source_id = a and target_id = s and label = 'superseded_by' and deleted_at is null) then
    bad := bad || ('FAIL 15b' || ': superseded_by edge still live');
  end if;
  r := web.brand_choice_decide(b, 'lead');
  if (select decision from web.brand_choice where id = a) <> 'superseded' then bad := bad || ('FAIL 15c' || ': ' || coalesce(r::text, '')); end if;
  r := web.brand_choice_decide(b, 'not_sure');
  if (select decision from web.brand_choice where id = a) <> 'chosen' or r -> 'restored' <> to_jsonb(array[a]) then
    bad := bad || ('FAIL 15d' || ': ' || coalesce(r::text, ''));
  end if;
  ok := ok || 'undo on re-place'::text;

  -- 16. two people at once (review finding 7): deciding holds the per-(brand, element) transaction advisory lock
  if not exists (select 1 from pg_locks l where l.locktype = 'advisory' and l.pid = pg_backend_pid() and l.objsubid = 2
                   and l.classid = (hashtext('web.brand_choice')::bigint & 4294967295)::text::oid
                   and l.objid = (hashtext(v_brand::text || ':' || v_tag::text)::bigint & 4294967295)::text::oid) then
    bad := bad || ('FAIL 16' || ': no per-(brand, element) advisory lock held');
  end if;
  ok := ok || 'element lock held'::text;

  -- 17. shortlist ("Could be it" on a pick-one element, 2026-10-22): shortlisted and signed by the person; an agent's
  --     direct write of shortlisted is refused by the trigger. Red before: the old door refused 'shortlist' (22023).
  perform set_config('request.jwt.claims', person_claims, true);
  perform set_config('request.headers', '{}', true);
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_tag, '{"text":"Every drive accounted for"}', 'ai', v_org) returning id into t1;
  insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
  values (v_brand, v_tag, '{"text":"Retire the hardware"}', 'ai', v_org) returning id into t2;
  begin
    r := web.brand_choice_decide(t1, 'shortlist');
    perform web.brand_choice_decide(t2, 'shortlist');
    select decision || '/' || (decided_by = v_me)::text into st from web.brand_choice where id = t1;
    if st <> 'shortlisted/true' then bad := bad || ('FAIL 17: ' || st); end if;
  exception when others then bad := bad || ('FAIL 17: ' || sqlerrm);
  end;
  perform set_config('request.headers', '{"x-matrx-actor-tier":"agent"}', true);
  begin
    update web.brand_choice set decision = 'shortlisted', decided_by = v_me, decided_at = now() where id = g1;
    bad := bad || 'FAIL 17b: agent shortlisted directly'::text;
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.headers', '{}', true);
  ok := ok || 'shortlist is the person''s'::text;

  -- 18. the pick: picking T1 supersedes the chosen tagline; switching the pick to T2 = T1 back to shortlisted (which
  --     restores what T1 replaced), then T2 chosen; T1 stays a contender.
  begin
    r := web.brand_choice_decide(t1, 'lead');
    if (select decision from web.brand_choice where id = a) <> 'superseded' then bad := bad || ('FAIL 18: ' || r::text); end if;
    r := web.brand_choice_decide(t1, 'shortlist');
    if (select decision from web.brand_choice where id = a) <> 'chosen' or r -> 'restored' <> to_jsonb(array[a]) then
      bad := bad || ('FAIL 18b: ' || r::text);
    end if;
    r := web.brand_choice_decide(t2, 'lead');
    select string_agg(decision, ',' order by ord) into st
      from (values (1, t1), (2, t2), (3, a)) v(ord, id) join web.brand_choice c on c.id = v.id;
    if st <> 'shortlisted,chosen,superseded' then bad := bad || ('FAIL 18c: ' || st); end if;
  exception when others then bad := bad || ('FAIL 18: ' || sqlerrm);
  end;
  ok := ok || 'pick switches and restores'::text;

  -- 19. a stance answer (A3, single per offering): the person's answer is their own row {stance, offering, answer_to},
  --     chosen; a second answer supersedes it; withdrawing the second brings the first back (red before: withdraw
  --     never restored what it had replaced).
  begin
    v_off := gen_random_uuid();
    insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
    values (v_brand, v_stance, '{"offering":"Haircuts","stance":"accept","primary_role":"traffic_builder"}', 'ai', v_org) returning id into sa;
    insert into platform.associations (source_type, source_id, target_type, target_id, label, organization_id)
    values ('web_brand_choice', sa, 'web_brand_offering', v_off, 'about', v_org);
    r := web.brand_choice_correct(sa, jsonb_build_object('stance', 'grow', 'offering', 'Haircuts', 'answer_to', sa), 'lead');
    s1 := (r ->> 'id')::uuid;
    r := web.brand_choice_correct(sa, jsonb_build_object('stance', 'sustain_or_accept', 'offering', 'Haircuts', 'answer_to', sa), 'support');
    s2 := (r ->> 'id')::uuid;
    if (select decision from web.brand_choice where id = s1) <> 'superseded' or r -> 'superseded' <> to_jsonb(array[s1]) then
      bad := bad || ('FAIL 19: ' || r::text);
    end if;
    if (select decision from web.brand_choice where id = sa) <> 'open' then bad := bad || 'FAIL 19b: the agent''s row moved'::text; end if;
    r := web.brand_choice_decide(s2, 'withdraw');
    if (select decision from web.brand_choice where id = s1) <> 'chosen' or r -> 'restored' <> to_jsonb(array[s1]) then
      bad := bad || ('FAIL 19c: ' || r::text);
    end if;
  exception when others then bad := bad || ('FAIL 19: ' || sqlerrm);
  end;
  ok := ok || 'stance answered, superseded, withdrawn back'::text;

  -- 20. an audience category with its answer (red before: no door): added in the brand's organization under its row,
  --     one candidate about it (value + about edge), placed; the same name again finds the same rows.
  begin
    r := web.brand_audience_answer(v_brand, 'who', 'Clinic owners', 'lead');
    ca := (r ->> 'category_id')::uuid;
    cc := (r ->> 'choice_id')::uuid;
    select organization_id::text || '/' || (select slug from platform.categories p where p.id = c.parent_id) into st
      from platform.categories c where c.id = ca;
    if st <> v_org::text || '/who' then bad := bad || ('FAIL 20: ' || coalesce(st, 'no category')); end if;
    select decision || '/' || placement || '/' || (value ->> 'category_id') into st from web.brand_choice where id = cc;
    if st <> 'chosen/lead/' || ca::text then bad := bad || ('FAIL 20b: ' || st); end if;
    if not exists (select 1 from platform.associations where source_id = cc and target_type = 'category' and target_id = ca and label = 'about' and deleted_at is null) then
      bad := bad || 'FAIL 20c: no about edge'::text;
    end if;
    r := web.brand_audience_answer(v_brand, 'who', 'clinic owners', 'not_us');
    if (r ->> 'choice_id')::uuid <> cc or (r ->> 'category_id')::uuid <> ca or (select decision from web.brand_choice where id = cc) <> 'declined' then
      bad := bad || ('FAIL 20d: ' || r::text);
    end if;
    r := web.brand_audience_answer(v_brand, 'cares_about', 'Proof in an audit', null);
    if (select decision from web.brand_choice where id = (r ->> 'choice_id')::uuid) <> 'open' then bad := bad || ('FAIL 20e: ' || r::text); end if;
  exception when others then bad := bad || ('FAIL 20: ' || sqlerrm);
  end;
  ok := ok || 'audience category answered'::text;

  -- 21. the audience door refuses an agent, a stranger and an unknown row
  perform set_config('request.headers', '{"x-matrx-actor-tier":"agent"}', true);
  begin
    perform web.brand_audience_answer(v_brand, 'who', 'Agents', 'lead');
    bad := bad || 'FAIL 21: agent answered'::text;
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.headers', '{}', true);
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform web.brand_audience_answer(v_brand, 'who', 'Strangers', 'lead');
    bad := bad || 'FAIL 21b: stranger answered'::text;
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', person_claims, true);
  begin
    perform web.brand_audience_answer(v_brand, 'where', 'Kent County', 'lead');
    bad := bad || 'FAIL 21c: unknown row'::text;
  exception when invalid_parameter_value then null;
  end;
  ok := ok || 'audience door refusals'::text;

  -- ── REVIEW3 (2026-10-22): two real people (P1, P2 — super admins, never a seat) and the test seat (v_me). ──────────
  declare
    p1 constant uuid := '4cf62e4e-2679-484f-b652-034e697418df';
    p2 constant uuid := '18c4f8fc-8495-4ad4-8d50-a348a521f8c4';
    p1_claims text := json_build_object('sub', '4cf62e4e-2679-484f-b652-034e697418df', 'role', 'authenticated')::text;
    p2_claims text := json_build_object('sub', '18c4f8fc-8495-4ad4-8d50-a348a521f8c4', 'role', 'authenticated')::text;
    pk record; ai1 uuid; f1 uuid; b1 uuid; o1 uuid; x1 uuid; x2 uuid; x3 uuid;
    ai2 uuid; f2 uuid; b2 uuid; o2 uuid; ai3 uuid; f3 uuid;
    ai4 uuid; f4 uuid; b4 uuid; o4 uuid; org4 uuid;
    k1 uuid; k2 uuid; sa2 uuid; y1 uuid; y2 uuid; n int := 0;
  begin
    -- Four live agent A3 rows that grew_from a PENDING offering finding (the 63 re-linked stances), distinct findings.
    for pk in
      select c.id as ai, g.target_id as f, c.brand_id as b, c.organization_id as org
        from web.brand_choice c
        join platform.associations g on g.source_type = 'web_brand_choice' and g.source_id = c.id and g.deleted_at is null
                                    and g.target_type = 'web_discovered_item' and (g.role = 'grew_from' or g.label = 'grew_from')
        join web.discovered_item i on i.id = g.target_id and i.status = 'pending' and i.deleted_at is null
       where c.deleted_at is null and c.origin = 'ai' and c.decision = 'open'
         and c.element_id = v_stance
       order by c.id limit 4
    loop
      n := n + 1;
      if n = 1 then ai1 := pk.ai; f1 := pk.f; b1 := pk.b;
      elsif n = 2 then ai2 := pk.ai; f2 := pk.f; b2 := pk.b;
      elsif n = 3 then ai3 := pk.ai; f3 := pk.f;
      else ai4 := pk.ai; f4 := pk.f; b4 := pk.b; org4 := pk.org;
      end if;
    end loop;
    if n < 4 then bad := bad || ('FAIL 22: only ' || n || ' live stance rows grow from a pending finding'); end if;

    -- 22. (C1) a person's stance answer reaches the topical map and is one per offering.
    perform set_config('request.headers', '{}', true);
    begin
      perform set_config('request.jwt.claims', p1_claims, true);
      x1 := (web.brand_choice_correct(ai1, jsonb_build_object('stance', 'grow', 'answer_to', ai1), 'lead') ->> 'id')::uuid;
      if not exists (select 1 from platform.associations where source_id = x1 and target_type = 'web_discovered_item'
                        and target_id = f1 and label = 'grew_from' and deleted_at is null) then
        bad := bad || 'FAIL 22a: the answer does not grow from the pending finding'::text;
      end if;
      perform set_config('request.jwt.claims', p2_claims, true);
      r := web.brand_choice_correct(ai1, jsonb_build_object('stance', 'sustain_or_accept', 'answer_to', ai1), 'support');
      x2 := (r ->> 'id')::uuid;
      if (select decision from web.brand_choice where id = x1) <> 'superseded' then
        bad := bad || ('FAIL 22b: a second person''s answer did not supersede the first: ' || r::text);
      end if;
      -- P1 says Yes on the finding (Products & services keepOffering, as the person).
      perform set_config('request.jwt.claims', p1_claims, true);
      insert into web.brand_offering (organization_id, brand_id, name, slug, kind, status)
      select organization_id, brand_id, 'R3 offering ' || left(id::text, 6), 'r3-offering-' || left(id::text, 8), 'service', 'active'
        from web.discovered_item where id = f1 returning id into o1;
      update web.discovered_item set status = 'confirmed', resolved_offering_id = o1, reviewed_at = now(), reviewed_by = p1
       where id = f1;
      -- what seo.map_foundation reads: a CHOSEN A3 row with an `about` edge to an active offering
      select count(*) into n from web.brand_choice c
        join platform.associations a on a.source_type = 'web_brand_choice' and a.source_id = c.id and a.label = 'about'
                                    and a.target_type = 'web_brand_offering' and a.target_id = o1 and a.deleted_at is null
       where c.brand_id = b1 and c.decision = 'chosen' and c.deleted_at is null and c.id = x2;
      if n <> 1 then bad := bad || 'FAIL 22c: after Yes the chosen answer is not about the offering'::text; end if;
      -- a later answer supersedes through the offering link
      r := web.brand_choice_correct(ai1, jsonb_build_object('stance', 'grow', 'answer_to', ai1), 'lead');
      x3 := (r ->> 'id')::uuid;
      select string_agg(decision, ',' order by ord) into st
        from (values (1, x1), (2, x2), (3, x3)) v(ord, id) join web.brand_choice c on c.id = v.id;
      if st <> 'superseded,superseded,chosen' then bad := bad || ('FAIL 22d: ' || st); end if;
    exception when others then bad := bad || ('FAIL 22: ' || sqlerrm);
    end;
    ok := ok || 'stance answer reaches the map, one per offering'::text;

    -- 23. (I1) only a person moves a value to or away from a decided state: agent / job writes refused.
    perform set_config('request.jwt.claims', p1_claims, true);
    perform set_config('request.headers', '{}', true);
    insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
    values (v_brand, v_goal, '{"text":"R3 goal one"}', 'ai', v_org) returning id into k1;
    insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
    values (v_brand, v_goal, '{"text":"R3 goal two"}', 'ai', v_org) returning id into k2;
    perform web.brand_choice_decide(k1, 'lead');
    perform set_config('request.headers', '{"x-matrx-actor-tier":"agent","x-matrx-actor-system":"r3_test"}', true);
    begin
      update web.brand_choice set decision = 'parked', decided_by = p1, decided_at = now() where id = k2;
      bad := bad || 'FAIL 23a: agent parked'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23a: ' || sqlerrm);
    end;
    begin
      update web.brand_choice set decision = 'open', placement = null, decided_by = null, decided_at = null where id = k1;
      bad := bad || 'FAIL 23b: agent un-chose a person''s choice'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23b: ' || sqlerrm);
    end;
    begin
      update web.brand_choice set decided_by = v_me where id = k1;
      bad := bad || 'FAIL 23c: agent re-signed a choice'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23c: ' || sqlerrm);
    end;
    begin
      update web.brand_choice set decision = 'superseded' where id = k1;
      bad := bad || 'FAIL 23d: agent superseded a choice'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23d: ' || sqlerrm);
    end;
    -- a job (no person, declared system tier)
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.headers', '', true);
    perform set_config('app.actor_tier', 'system', true);
    perform set_config('app.actor_system', 'r3_test', true);
    begin
      update web.brand_choice set decision = 'parked' where id = k2;
      bad := bad || 'FAIL 23e: job parked'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23e: ' || sqlerrm);
    end;
    begin
      insert into web.brand_choice (brand_id, element_id, value, origin, organization_id, decision)
      values (v_brand, v_goal, '{"text":"R3 born parked"}', 'ai', v_org, 'parked');
      bad := bad || 'FAIL 23f: job inserted a parked value'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23f: ' || sqlerrm);
    end;
    perform set_config('app.actor_tier', '', true);
    perform set_config('app.actor_system', '', true);
    -- the person themself: parking with their own name passes; un-choosing outside the door (no name) is refused
    perform set_config('request.jwt.claims', p1_claims, true);
    perform set_config('request.headers', '{}', true);
    begin
      update web.brand_choice set decision = 'parked', decided_by = p1, decided_at = now() where id = k2;
    exception when others then bad := bad || ('FAIL 23g: the person could not park: ' || sqlerrm);
    end;
    begin
      update web.brand_choice set decision = 'open', placement = null, decided_by = null, decided_at = null where id = k1;
      bad := bad || 'FAIL 23h: an unsigned un-choose outside the door'::text;
    exception when insufficient_privilege then null; when others then bad := bad || ('FAIL 23h: ' || sqlerrm);
    end;
    ok := ok || 'agent and job moves refused'::text;

    -- 24. (I4) a test seat's Yes / No on an offering finding never links or withdraws a stance.
    perform set_config('request.jwt.claims', person_claims, true);   -- admin@admin.com
    perform set_config('request.headers', '{}', true);
    begin
      insert into web.brand_offering (organization_id, brand_id, name, slug, kind, status)
      select organization_id, brand_id, 'R3 seat offering ' || left(id::text, 6), 'r3-seat-offering-' || left(id::text, 8), 'service', 'active'
        from web.discovered_item where id = f2 returning id into o2;
      update web.discovered_item set status = 'confirmed', resolved_offering_id = o2, reviewed_at = now(), reviewed_by = v_me
       where id = f2;
      if exists (select 1 from platform.associations where source_id = ai2 and target_id = o2 and label = 'about' and deleted_at is null) then
        bad := bad || 'FAIL 24a: a test seat''s Yes linked a stance'::text;
      end if;
      update web.discovered_item set status = 'dismissed', reviewed_at = now(), reviewed_by = v_me where id = f3;
      if (select deleted_at from web.brand_choice where id = ai3) is not null then
        bad := bad || 'FAIL 24b: a test seat''s No withdrew a stance'::text;
      end if;
    exception when others then bad := bad || ('FAIL 24: ' || sqlerrm);
    end;
    ok := ok || 'test seat reviews do not act'::text;

    -- 25. (I4) a test seat's decide never supersedes, retracts or restores a real person's decided row.
    begin
      insert into web.brand_choice (brand_id, element_id, value, origin, organization_id)
      values (v_brand, v_stance, '{"offering":"R3 Beard trims","stance":"sustain"}', 'ai', v_org) returning id into sa2;
      insert into platform.associations (source_type, source_id, target_type, target_id, label, organization_id)
      values ('web_brand_choice', sa2, 'web_brand_offering', gen_random_uuid(), 'about', v_org);
      perform set_config('request.jwt.claims', p1_claims, true);
      y1 := (web.brand_choice_correct(sa2, jsonb_build_object('stance', 'grow', 'answer_to', sa2), 'lead') ->> 'id')::uuid;
      perform set_config('request.jwt.claims', person_claims, true);
      y2 := (web.brand_choice_correct(sa2, jsonb_build_object('stance', 'sunset_or_refuse', 'answer_to', sa2), 'support') ->> 'id')::uuid;
      if (select decision from web.brand_choice where id = y1) <> 'chosen' then
        bad := bad || 'FAIL 25a: a test seat superseded a person''s answer'::text;
      end if;
      begin
        perform web.brand_choice_decide(y1, 'retract');
        bad := bad || 'FAIL 25b: a test seat retracted a person''s answer'::text;
      exception when insufficient_privilege then null;
      end;
    exception when others then bad := bad || ('FAIL 25: ' || sqlerrm);
    end;
    ok := ok || 'test seat never displaces a person'::text;

    -- 26. (I3) clear after Yes undoes the validation and the about links the Yes added; Yes again restores both.
    perform set_config('request.jwt.claims', p1_claims, true);
    perform set_config('request.headers', '{}', true);
    begin
      insert into web.brand_offering (organization_id, brand_id, name, slug, kind, status)
      values (org4, b4, 'R3 cleared offering', 'r3-cleared-offering-' || left(f4::text, 8), 'service', 'active') returning id into o4;
      update web.discovered_item set status = 'confirmed', resolved_offering_id = o4, reviewed_at = now(), reviewed_by = p1 where id = f4;
      perform set_config('request.jwt.claims', '', true);
      if not (o4 = any (web.person_validated_offering_ids(b4))) then bad := bad || 'FAIL 26a: Yes did not validate'::text; end if;
      perform set_config('request.jwt.claims', p1_claims, true);
      -- Clear (Products & services clearDecision): back to pending, the clear signed by the person
      update web.discovered_item set status = 'pending', reviewed_at = clock_timestamp(), reviewed_by = p1 where id = f4;
      perform set_config('request.jwt.claims', '', true);
      if o4 = any (web.person_validated_offering_ids(b4)) then bad := bad || 'FAIL 26b: still validated after Clear'::text; end if;
      if exists (select 1 from platform.associations where source_id = ai4 and target_id = o4 and label = 'about' and deleted_at is null) then
        bad := bad || 'FAIL 26c: the Yes''s about link survived Clear'::text;
      end if;
      if (select decision from web.brand_choice where id = ai4) <> 'open' or (select deleted_at from web.brand_choice where id = ai4) is not null then
        bad := bad || 'FAIL 26d: Clear touched the stance itself'::text;
      end if;
      perform set_config('request.jwt.claims', p1_claims, true);
      update web.discovered_item set status = 'confirmed', reviewed_at = clock_timestamp(), reviewed_by = p1 where id = f4;
      perform set_config('request.jwt.claims', '', true);
      if not (o4 = any (web.person_validated_offering_ids(b4)))
         or not exists (select 1 from platform.associations where source_id = ai4 and target_id = o4 and label = 'about' and deleted_at is null) then
        bad := bad || 'FAIL 26e: Yes again did not restore'::text;
      end if;
    exception when others then bad := bad || ('FAIL 26: ' || sqlerrm);
    end;
    ok := ok || 'clear after Yes undoes it'::text;

    -- 27. the audience door takes the person's words only: origin 'ai' from a client is refused.
    perform set_config('request.jwt.claims', p1_claims, true);
    perform set_config('request.headers', '{}', true);
    begin
      perform web.brand_audience_answer(v_brand, 'who', 'R3 suggested', 'lead', 'ai');
      bad := bad || 'FAIL 27: origin ai accepted from a client'::text;
    exception when invalid_parameter_value then null; when others then bad := bad || ('FAIL 27: ' || sqlerrm);
    end;
    ok := ok || 'audience door refuses origin ai'::text;
  end;

  if cardinality(bad) > 0 then raise exception 'RED: %', array_to_string(bad, ' | '); end if;
  raise exception 'ROLLED_BACK_GREEN: %', array_to_string(ok, ' | ');
end
$t$;
