-- LANE W2-A 3 - MOD WITH NEGATIVE NUMBERS TAKES THE DIVISOR'S SIGN (Airtable, Excel). Plain SQL, read only, rolled back.
-- RED before 20261018050000_w2a_a_mod_takes_the_divisors_sign.sql: R1 fails (MOD(-7, 5) answered -2, the value's sign).
begin;
set local statement_timeout = '20s';
do $t$
declare
  v jsonb;
  f text; e numeric;
begin
  -- R1-R5 the reader (custom.formula_eval), through the store's own parser
  for f, e in select * from (values ('MOD(-7, 5)', 3::numeric), ('MOD(7, -5)', -3), ('MOD(-7, -5)', -2), ('-7 % 5', 3), ('MOD(-5.5, 2)', 0.5), ('MOD(-10, 5)', 0), ('MOD(0.3, 0.1)', 0), ('MOD(7, 5)', 2)) c(f, e) loop
    v := custom.formula_eval(null::uuid, (custom._fxp_level(custom._fxp_tokens(f), 0, 0)) -> 'n', '{}'::jsonb, '{}'::jsonb);
    if (v #>> '{}')::numeric is distinct from e then raise exception 'R1 RED: % answered % (Airtable: %)', f, v, e; end if;
  end loop;
  raise notice 'R1 PASS - formula_eval: the divisor''s sign on 8 cases';
  -- R2 the compiled path (custom._fxc_apply, what formula_compile_sql emits) agrees
  v := custom._fxc_apply('fx.mod', array['-7'::jsonb, '5'::jsonb]);
  if (v #>> '{}')::numeric <> 3 then raise exception 'R2 RED: compiled MOD(-7, 5) = %', v; end if;
  v := custom._fxc_apply('fx.mod', array['7'::jsonb, '-5'::jsonb]);
  if (v #>> '{}')::numeric <> -3 then raise exception 'R2 RED: compiled MOD(7, -5) = %', v; end if;
  raise notice 'R2 PASS - the compiled path agrees';
  -- R3 dividing by zero is still refused by name
  begin
    perform custom.formula_eval(null::uuid, (custom._fxp_level(custom._fxp_tokens('MOD(3, 0)'), 0, 0)) -> 'n', '{}'::jsonb, '{}'::jsonb);
    raise exception 'R3 RED: MOD(3, 0) was not refused';
  exception when division_by_zero then raise notice 'R3 PASS - MOD(3, 0) refused';
  end;
  raise notice 'GREEN R1-R3: MOD takes the divisor''s sign';
end
$t$;
rollback;
