-- Owner rule 2026-10-21: US 'color' in every user-visible database sentence. Rewrites the 23 live functions whose body says colour/colours/coloured. Text only: quoted key names 'colours' and colours_changed are API keys and stay as they are.
-- based-on: content.annotation_create(uuid, uuid, text, uuid, text, text, jsonb, text) 0416f61a5735d41191b611aa2f970e8ffbccf4b02ba2d2fef49e5cbae60d7982
-- based-on: custom._field_shape_guard() 2802753c4abfb9d30d24778645d5bb2a7f7faf6f8909dcf19db6831855bb3e44
-- based-on: custom._form_look(uuid, jsonb) cfd307fef11ac42f077c8612440c2830d85a4a9a06782c2e18eff5a64d208fe7
-- based-on: custom._form_look_judge(uuid, jsonb) bdaea4698d2f615c45bc2d63b8f5369e1ac8c0fb4dcb3664c56b0b05b6b0c1d5
-- based-on: custom._portal_config_judge(uuid, uuid[], jsonb, jsonb) 5daeac5508eded6e402d9dc1bbb981700815bf66ef804d4f248753600816d316
-- based-on: custom._table_duplicate_step(uuid, interval) f08be49ba3c3083a398cb89145eef3f7c126a35b67cb54974231fb231963e0bc
-- based-on: custom._view_field_key(uuid, uuid, text, text, jsonb, text[]) 4761233cc52df699aa8213d3f15c1fc334c3073c42768e44ec4d73da0c0bcb9d
-- based-on: custom._view_key_value(uuid, uuid, text, text, jsonb, jsonb) 9e38519bb6d3e6444790f827a5f6f6a6073c5a26fa2d3ae732216b5ccb7f27bc
-- based-on: custom.field_declare(uuid, uuid, jsonb) f8d030f18f99dcb0ebd91984f6be8193ba55124bcc1a1fddb34d6e7f78941910
-- based-on: custom.field_duplicate(uuid, uuid) adf122689140551b3e57ff3354bca69da90ddb36cd1f1a470882c0824d45285c
-- based-on: custom.field_update(uuid, uuid, jsonb) ccd08465385063e6506aa5dd16bb0845919693ac556b6d673bc2886d9ce70411
-- based-on: custom.form_look_options(uuid, jsonb) ec03bcc60bfb9021d3edfdbc2b526c12f439dc17a5ddc6ba347b686367ecd6ac
-- based-on: custom.form_public(uuid) fffef1397778ad277d88469780b19faa8a43dcc51484008496629f18a9221447
-- based-on: custom.portal_accents() 64c8345212e1a2c0c398692f503665440413942546b258e4d1a111534a570a1d
-- based-on: custom.portal_public(text) aadafba9e8a17bfc62ecc82d71a0b2755eaa68d65ea072c7f4bbd1f05a576e26
-- based-on: custom.table_duplicate(uuid, boolean, text, uuid) 3d197aec7761e555319eb7b2583aa6cf87da63e9c73bac3416bd6b5de0f6622b
-- based-on: custom.view_keys() de9fe040bc051d24a15ef989ccb51249de6404ff89f41d12abcddabadc337bf3
-- based-on: platform._cutover_carry_back(uuid, platform.cutover_seam_press, boolean, uuid, uuid, boolean) 5154f6497554b583f95b5fef7e8e67eddaede89f1556335c3c0268a8702d345c
-- based-on: platform._cutover_seam_readiness(text, uuid) 0dfa84e0d07145b3e021315a623b0f35e138183c61c5da202cfdfc3098b63562
-- based-on: platform.cutover_copy_differences(uuid) 7d87c17bc9dd69d99c572b77ac5b2d1b946dbe5b8f8c0a1da64d9de249c6edb8
-- based-on: platform.cutover_difference_sentence(text, jsonb) 513c538891ee0be5c9b4bb5592023b63f079b233dc81ac267ebb4a81ed8ed4b3
-- based-on: platform.drill_definition_problems(jsonb) 726cf7896e2192d3ffbc6c6e8ea516336c84fc601869a0c22ad877388f39823b
-- based-on: public.cat_write(text, uuid, uuid, text, text, boolean, uuid, boolean, text, boolean, text, boolean, integer, boolean, text, boolean, jsonb, boolean) f5b135238a9a2d6f8030a92a6d0f306dc3146d41e9ab5d012d1f42d31af190d5

do $mig$
declare
  r record;
  v_def text;
begin
  for r in
    select p.oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where p.prokind = 'f'
       and (n.nspname, p.proname) in (
         ('content','annotation_create'),('custom','_field_shape_guard'),('custom','_form_look'),
         ('custom','_form_look_judge'),('custom','_portal_config_judge'),('custom','_table_duplicate_step'),
         ('custom','_view_field_key'),('custom','_view_key_value'),('custom','field_declare'),
         ('custom','field_duplicate'),('custom','field_update'),('custom','form_look_options'),
         ('custom','form_public'),('custom','portal_accents'),('custom','portal_public'),
         ('custom','table_duplicate'),('custom','view_keys'),('platform','_cutover_carry_back'),
         ('platform','_cutover_seam_readiness'),('platform','cutover_copy_differences'),
         ('platform','cutover_difference_sentence'),('platform','drill_definition_problems'),
         ('public','cat_write'))
       and pg_get_functiondef(p.oid) ilike '%colour%'
  loop
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def, '''colours''', '@@KEYPLURAL@@');
    v_def := replace(v_def, 'colours_changed', '@@KEYCHANGED@@');
    v_def := replace(replace(replace(v_def, 'colour', 'color'), 'Colour', 'Color'), 'COLOUR', 'COLOR');
    v_def := replace(v_def, '@@KEYPLURAL@@', '''colours''');
    v_def := replace(v_def, '@@KEYCHANGED@@', 'colours_changed');
    execute v_def;
  end loop;
end
$mig$;
