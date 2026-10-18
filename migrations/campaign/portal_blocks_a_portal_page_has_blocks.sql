-- based-on: custom._portal_config_judge(uuid, uuid[], jsonb, jsonb) 6bc5bae1d2ab2186b51d66403dd0eace370194014dd2e2b299cc5202916d548e
-- based-on: custom.portal_me() d23760fcd768faa9da61d1bcaecdba38b956623a513f989b771f87e49e61eff4
-- lane: PORTAL-BLOCKS
-- A portal page's blocks (tiles, charts, lists) are stored in custom.portal.config.blocks: the config judge accepts and validates them, and portal_me hands them to the signed-in client.

CREATE OR REPLACE FUNCTION custom._portal_config_judge(p_organization_id uuid, p_exposed uuid[], p_prior jsonb, p_given jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_out    jsonb := coalesce(p_prior, '{}'::jsonb);
  v_key    text;
  v_style  jsonb;
  v_s      jsonb := '{}'::jsonb;
  v_links  jsonb;
  v_link   jsonb;
  v_lout   jsonb := '[]'::jsonb;
  v_txt    text;
  v_url    text;
  v_logo   uuid;
  v_file   record;
  v_forms  jsonb;
  v_fout   jsonb := '[]'::jsonb;
  v_item   record;
  v_form   custom.anon_form;
  v_seen   uuid[] := '{}';
  v_n      integer := 0;
  v_table  text;
begin
  if p_given is not null and jsonb_typeof(p_given) <> 'null' then
    if jsonb_typeof(p_given) <> 'object' then
      raise exception 'A portal''s settings are an object with a look ("style") and a list of forms ("forms").'
        using errcode = '22023', hint = 'Nothing was written.';
    end if;
    for v_key in select jsonb_object_keys(p_given) loop
      if v_key not in ('style', 'forms', 'blocks') then
        raise exception 'A portal''s settings have a look ("style") and a list of forms ("forms"), and "%" is neither.', v_key
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
    end loop;

    -- ── THE LOOK ──────────────────────────────────────────────────────────────────────
    if p_given ? 'style' then
      v_style := p_given -> 'style';
      if v_style is null or jsonb_typeof(v_style) = 'null' then
        v_out := v_out - 'style';           -- back to the organization's own brand
      elsif jsonb_typeof(v_style) <> 'object' then
        raise exception 'A portal''s look is an object: display_name, welcome, logo_file_id, accent, footer_links.'
          using errcode = '22023', hint = 'Nothing was written.';
      else
        for v_key in select jsonb_object_keys(v_style) loop
          if v_key not in ('display_name', 'welcome', 'logo_file_id', 'accent', 'footer_links') then
            raise exception 'A portal''s look has a name, a welcome line, a logo, an accent colour and footer links, and "%" is none of them.', v_key
              using errcode = '22023',
                    hint = 'The keys are display_name, welcome, logo_file_id, accent and footer_links. Nothing was written.';
          end if;
        end loop;

        v_txt := nullif(btrim(coalesce(v_style ->> 'display_name', '')), '');
        if v_txt is not null then
          if length(v_txt) < 2 or length(v_txt) > 80 then
            raise exception 'The name a portal shows has to be 2 to 80 characters, and "%" is %.', v_txt, length(v_txt)
              using errcode = '22023', hint = 'Leave it empty to show the organization''s own name. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('display_name', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'welcome', '')), '');
        if v_txt is not null then
          if length(v_txt) > 280 then
            raise exception 'A portal''s welcome line is at most 280 characters, and this one is %.', length(v_txt)
              using errcode = '22023', hint = 'It sits under the name on the sign-in page and at the top of the portal. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('welcome', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'accent', '')), '');
        if v_txt is not null then
          if not (v_txt = any (custom.portal_accents())) then
            raise exception 'A portal''s accent is one of the colours the rest of the app uses (%), and "%" is not one of them.',
              array_to_string(custom.portal_accents(), ', '), v_txt
              using errcode = '22023', hint = 'Leave it empty to use the app''s own colour. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('accent', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'logo_file_id', '')), '');
        if v_txt is not null then
          begin
            v_logo := v_txt::uuid;
          exception when invalid_text_representation then
            raise exception 'A portal''s logo is a picture from this organization''s Files, named by its id, and "%" is not an id.', v_txt
              using errcode = '22023', hint = 'Nothing was written.';
          end;
          select f.id, f.organization_id, f.visibility::text as visibility, f.mime_type, f.storage_uri, f.deleted_at
            into v_file
            from files.files f where f.id = v_logo;
          if v_file.id is null or v_file.deleted_at is not null
             or v_file.organization_id is distinct from p_organization_id then
            -- A file of another organization answers exactly as one that does not exist.
            raise exception 'There is no such picture in this organization''s Files, so it cannot be this portal''s logo.'
              using errcode = '02000', hint = 'Pick a picture from Files, or upload the logo there first. Nothing was written.';
          end if;
          if coalesce(v_file.mime_type, '') not like 'image/%' then
            raise exception 'That file is not a picture, so it cannot be this portal''s logo.'
              using errcode = '22023', hint = 'Pick a PNG, JPEG, WebP or SVG from Files. Nothing was written.';
          end if;
          if custom._portal_picture_url(p_organization_id, v_logo, true) is null then
            raise exception 'That picture is private to your organization, so the people you invite could not see it: a portal''s logo is shown on its sign-in page, before anybody has signed in.'
              using errcode = '42501',
                    hint = 'Make the picture public in Files, or pick one that already is. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('logo_file_id', v_logo);
        end if;

        v_links := v_style -> 'footer_links';
        if v_links is not null and jsonb_typeof(v_links) <> 'null' then
          if jsonb_typeof(v_links) <> 'array' then
            raise exception 'A portal''s footer links are a list of {label, url}.'
              using errcode = '22023', hint = 'Nothing was written.';
          end if;
          if jsonb_array_length(v_links) > 5 then
            raise exception 'A portal''s footer carries at most five links, and this one has %.', jsonb_array_length(v_links)
              using errcode = '22023', hint = 'Nothing was written.';
          end if;
          for v_link in select value from jsonb_array_elements(v_links) loop
            v_txt := nullif(btrim(coalesce(v_link ->> 'label', '')), '');
            v_url := nullif(btrim(coalesce(v_link ->> 'url', '')), '');
            if v_txt is null or v_url is null then
              raise exception 'Every footer link needs the words it shows and the address it opens.'
                using errcode = '22004', hint = 'Nothing was written.';
            end if;
            if length(v_txt) > 40 then
              raise exception 'A footer link''s words are at most 40 characters, and "%" is %.', v_txt, length(v_txt)
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            if v_url !~* '^(https://[^[:space:]]+|mailto:[^[:space:]]+|tel:[+0-9() .-]+)$' or length(v_url) > 500 then
              raise exception 'The footer link "%" opens "%", and a portal only links to a secure web address (https://), an email (mailto:) or a phone number (tel:).', v_txt, v_url
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            v_lout := v_lout || jsonb_build_array(jsonb_build_object('label', v_txt, 'url', v_url));
          end loop;
          if jsonb_array_length(v_lout) > 0 then
            v_s := v_s || jsonb_build_object('footer_links', v_lout);
          end if;
        end if;

        if v_s = '{}'::jsonb then
          v_out := v_out - 'style';
        else
          v_out := v_out || jsonb_build_object('style', v_s);
        end if;
      end if;
    end if;


    -- ── THE BLOCKS (PORTAL-BLOCKS) ────────────────────────────────────────────────────
    -- What a page of this portal is built from: tiles, charts, lists. Each block names ONE
    -- exposed Table and the Field keys it reads. The screen computes every number over HER rows
    -- only and keeps every key to the Table's visible_fields, so a block is a view, never a door.
    if p_given ? 'blocks' then
      declare
        v_blocks jsonb := p_given -> 'blocks';
        v_b      jsonb;
        v_bout   jsonb := '[]'::jsonb;
        v_k      text;
        v_i      integer := 0;
        v_tid    uuid;
      begin
        if v_blocks is null or jsonb_typeof(v_blocks) = 'null'
           or (jsonb_typeof(v_blocks) = 'array' and jsonb_array_length(v_blocks) = 0) then
          v_out := v_out - 'blocks';
        elsif jsonb_typeof(v_blocks) <> 'array' then
          raise exception 'A portal''s blocks are a list of {kind, table_id, title, ...}.'
            using errcode = '22023', hint = 'Nothing was written.';
        elsif jsonb_array_length(v_blocks) > 24 then
          raise exception 'A portal page carries at most 24 blocks, and this one names %.', jsonb_array_length(v_blocks)
            using errcode = '22023', hint = 'Nothing was written.';
        else
          for v_b in select value from jsonb_array_elements(v_blocks) loop
            v_i := v_i + 1;
            if jsonb_typeof(v_b) <> 'object' then
              raise exception 'Block % is not an object.', v_i using errcode = '22023', hint = 'Nothing was written.';
            end if;
            for v_k in select jsonb_object_keys(v_b) loop
              if v_k not in ('kind', 'table_id', 'title', 'group_by', 'measure_op', 'measure_key', 'fields', 'detail_fields') then
                raise exception 'A block has a kind, a table, a title and the fields it reads, and "%" is none of them.', v_k
                  using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            if coalesce(v_b ->> 'kind', '') not in ('kpi', 'bar', 'line', 'donut', 'list', 'cards', 'table') then
              raise exception 'Block % has kind "%", and a block is a kpi, bar, line, donut, list, cards or table.', v_i, coalesce(v_b ->> 'kind', '')
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            begin
              v_tid := (v_b ->> 'table_id')::uuid;
            exception when others then
              raise exception 'Block % names a table that is not an id.', v_i using errcode = '22023', hint = 'Nothing was written.';
            end;
            if v_tid is null or not (v_tid = any (coalesce(p_exposed, '{}'))) then
              raise exception 'Block % reads a table this portal does not show, so a client would be shown numbers from rows she can never open.', v_i
                using errcode = '22023', hint = 'Add that table to the portal, or point the block at one it shows. Nothing was written.';
            end if;
            if v_b ? 'measure_op' and (v_b ->> 'measure_op') not in ('count', 'sum', 'avg', 'min', 'max') then
              raise exception 'Block % measures with "%", and a measure is count, sum, avg, min or max.', v_i, v_b ->> 'measure_op'
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            for v_k in select unnest(array['group_by', 'measure_key']) loop
              if v_b ? v_k and jsonb_typeof(v_b -> v_k) not in ('string', 'null') then
                raise exception 'Block %: % is a field key.', v_i, v_k using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            for v_k in select unnest(array['fields', 'detail_fields']) loop
              if v_b ? v_k and jsonb_typeof(v_b -> v_k) not in ('array', 'null') then
                raise exception 'Block %: % is a list of field keys.', v_i, v_k using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            v_bout := v_bout || jsonb_build_array(jsonb_strip_nulls(v_b));
          end loop;
          v_out := v_out || jsonb_build_object('blocks', v_bout);
        end if;
      end;
    end if;

    -- ── THE FORMS, AS GIVEN ───────────────────────────────────────────────────────────
    if p_given ? 'forms' then
      v_forms := p_given -> 'forms';
      if v_forms is null or jsonb_typeof(v_forms) = 'null'
         or (jsonb_typeof(v_forms) = 'array' and jsonb_array_length(v_forms) = 0) then
        v_out := v_out - 'forms';
      elsif jsonb_typeof(v_forms) <> 'array' then
        raise exception 'A portal''s forms are a list of {form_id, label, order}.'
          using errcode = '22023', hint = 'Nothing was written.';
      elsif jsonb_array_length(v_forms) > 12 then
        raise exception 'A portal carries at most twelve forms, and this one names %.', jsonb_array_length(v_forms)
          using errcode = '22023', hint = 'Nothing was written.';
      else
        v_out := v_out || jsonb_build_object('forms', v_forms);
      end if;
    end if;
  end if;

  -- ── EVERY FORM THAT WILL STAND IS JUDGED, GIVEN OR KEPT ─────────────────────────────
  -- Against the Tables THIS declaration exposes, so a table taken off the portal never takes a
  -- form with it in silence.
  if v_out ? 'forms' then
    for v_item in
      select e.v, e.pos,
             coalesce(case when jsonb_typeof(e.v -> 'order') = 'number' then (e.v ->> 'order')::numeric end, e.pos) as ord
        from jsonb_array_elements(v_out -> 'forms') with ordinality e(v, pos)
       order by 3, e.pos
    loop
      if jsonb_typeof(v_item.v) <> 'object' or nullif(v_item.v ->> 'form_id', '') is null then
        raise exception 'Every form on a portal is named by its id ({"form_id": …}).'
          using errcode = '22004', hint = 'Nothing was written.';
      end if;
      for v_key in select jsonb_object_keys(v_item.v) loop
        if v_key not in ('form_id', 'label', 'order') then
          raise exception 'A form on a portal has an id, a label and an order, and "%" is none of them.', v_key
            using errcode = '22023', hint = 'Nothing was written.';
        end if;
      end loop;
      begin
        select * into v_form from custom.anon_form f
         where f.organization_id = p_organization_id and f.id = (v_item.v ->> 'form_id')::uuid
           and f.deleted_at is null;
      exception when invalid_text_representation then
        raise exception 'A form on a portal is named by its id, and "%" is not an id.', v_item.v ->> 'form_id'
          using errcode = '22023', hint = 'Nothing was written.';
      end;
      if v_form.id is null then
        raise exception 'There is no form % in this organization, so this portal cannot offer it.', v_item.v ->> 'form_id'
          using errcode = '02000', hint = 'It may have been removed. Take it off the portal''s forms. Nothing was written.';
      end if;
      if v_form.id = any (v_seen) then
        raise exception 'The form "%" is on this portal twice.', coalesce(v_form.title, 'Form')
          using errcode = '23505', hint = 'Nothing was written.';
      end if;
      if v_form.audience = 'crew' then
        raise exception 'The form "%" is a crew form, filled in by your own people, so it cannot be offered to a client.', coalesce(v_form.title, 'Form')
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
      if not (v_form.table_id = any (coalesce(p_exposed, '{}'))) then
        select coalesce(nullif(t.data ->> 'name', ''), 'a table') into v_table
          from custom.record t where t.organization_id = p_organization_id and t.id = v_form.table_id;
        raise exception 'The form "%" puts its answers in %, and this portal does not show that table, so a client would send something she could never see again.',
          coalesce(v_form.title, 'Form'), coalesce(v_table, 'a table')
          using errcode = '22023',
                hint = 'Add that table to the portal, or take the form off it. Nothing was written.';
      end if;
      v_seen := v_seen || v_form.id;
      v_n := v_n + 1;
      v_txt := nullif(btrim(coalesce(v_item.v ->> 'label', '')), '');
      if v_txt is not null and length(v_txt) > 60 then
        raise exception 'A form''s label on a portal is at most 60 characters, and "%" is %.', v_txt, length(v_txt)
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
      v_fout := v_fout || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
                  'form_id', v_form.id, 'label', v_txt, 'order', v_n)));
    end loop;
    v_out := v_out || jsonb_build_object('forms', v_fout);
  end if;

  if v_out = '{}'::jsonb then
    return null;
  end if;
  return v_out;
end $function$;

CREATE OR REPLACE FUNCTION custom.portal_me()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me uuid := custom.query_principal();
begin
  -- The outsider's own standing, and NOTHING about anybody else's. It answers what the
  -- portal DECLARED - which Tables, which fields - and not one record: the records come
  -- back through `custom.read_records` like everybody else's, so there is one read path
  -- on this platform and a portal is not a second one.
  if v_me is null then
    return jsonb_build_object('signed_in', false, 'portals', '[]'::jsonb,
      'explanation', 'Nobody is signed in, so there is no portal to show.');
  end if;
  return jsonb_build_object(
    'signed_in', true,
    'user_id', v_me,
    'external', iam.is_external_principal(v_me),
    'portals', coalesce((
      select jsonb_agg(jsonb_build_object(
               'portal_id', p.id,
               'title', p.title,
               'slug', p.slug,
               'organization_id', p.organization_id,
               'organization', o.name,
               'principal_id', pp.id,
               'client_record_id', pp.client_record_id,
               'client', coalesce(custom.portal_record_title(p.organization_id, pp.client_record_id), 'your records'),
               -- S6: the portal's look and the forms she may send, open ones only.
               'style', custom._portal_style(p.organization_id, p.config),
               'forms', custom._portal_forms(p.organization_id, p.config, true),
               -- PORTAL-BLOCKS: the owner's page blocks, as stored (judged on the way in).
               'blocks', coalesce(p.config -> 'blocks', '[]'::jsonb),
               'tables', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'table_id', pt.table_id,
                          'name', coalesce(nullif(t.data ->> 'name', ''), 'Records'),
                          -- S6: the Field that says whose a record is, so a screen can keep her
                          -- list to HER client even when she can read more (an employee who is
                          -- also somebody's client reads the whole Table through the member lane).
                          'names_via', pt.edge_role,
                          'visible_fields', pt.visible_field_keys,
                          'editable_fields', pt.editable_field_keys,
                          'comments', pt.comments_allowed,
                          -- S6: the stages this Table moves through, when the portal shows its stage.
                          'stage', custom._portal_stage(pt.organization_id, pt.table_id, pt.visible_field_keys)) order by pt.ord)
                   from custom.portal_table pt
                   left join custom.record t on t.organization_id = pt.organization_id and t.id = pt.table_id
                  where pt.portal_id = p.id), '[]'::jsonb))
             order by p.title)
        from custom.portal_principal pp
        join custom.portal p on p.id = pp.portal_id and p.is_active
        join iam.organizations o on o.id = p.organization_id
       where pp.user_id = v_me and pp.is_active
         and coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p.organization_id) #>> '{}')::boolean, false)),
      '[]'::jsonb));
end $function$;
