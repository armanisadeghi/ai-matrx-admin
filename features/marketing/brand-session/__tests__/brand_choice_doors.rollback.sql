do $t$
declare
  v_brand  uuid := 'd940215a-be2f-4505-a21b-c6374e9e7009';
  v_org    uuid := '226be635-194d-42dd-87c8-7a9562f70939';
  v_me     uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_tag    uuid := (select id from platform.categories where dimension = 'brand_element' and slug = 'h6_tagline');
  v_goal   uuid := (select id from platform.categories where dimension = 'brand_element' and slug = 'a2_goals');
  a uuid; b uuid; g1 uuid; g2 uuid; s uuid; w uuid;
  r jsonb; ok text[] := '{}'; st text;
  person_claims text := json_build_object('sub', '87a6e699-3622-4869-8843-d0867456c0dd', 'role', 'authenticated')::text;
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

  raise exception 'ROLLED_BACK_GREEN: %', array_to_string(ok, ' | ');
end
$t$;
