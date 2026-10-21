/** Real owned Auth/PG rehearsal of admin MFA reset. Never accepts a hosted DB or Auth target.
 * Existing admin membership projection is fixture I/O; Auth, transaction, audit and RPC bodies are real.
 * MATRX_MFA_AUTH_URL=http://127.0.0.1:<port> MATRX_MFA_DB_URL=postgres://.../casa_mfa_reset
 * MATRX_MFA_BASELINE_DIR=<retained-live-catalog> pnpm exec tsx scripts/real-tests/mfa-admin-reset.ts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import pg from "pg";
import { AuthClient } from "@supabase/supabase-js";
import { makePersona } from "../lib/persona.mjs";
import { totp } from "../lib/totp";

const authTarget = new URL(process.env.MATRX_MFA_AUTH_URL ?? "http://refused.invalid");
const dbTarget = new URL(process.env.MATRX_MFA_DB_URL ?? "postgres://refused.invalid/no");
assert.equal(authTarget.hostname, "127.0.0.1"); assert.equal(authTarget.protocol, "http:"); assert.ok(authTarget.port);
assert.equal(dbTarget.hostname, "127.0.0.1"); assert.equal(dbTarget.protocol, "postgres:"); assert.ok(dbTarget.port);
assert.equal(dbTarget.pathname, "/casa_mfa_reset", "Requires the explicitly owned disposable database");
const baseline = process.env.MATRX_MFA_BASELINE_DIR; assert.ok(baseline, "Exact captured live definitions required");
const migration = "migrations/campaign/20261021204916_admin_mfa_reset_revokes_sessions.sql";
const inverse = "migrations/inverse/20261021204916_admin_mfa_reset_revokes_sessions_down.sql";
let checks = 0;
const check = (condition: unknown, message: string) => { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); };
const db = new pg.Client({ connectionString: dbTarget.href });
const clients: AuthClient[] = [];
const client = () => { const a = new AuthClient({ url: authTarget.origin, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }); clients.push(a); return a; };
const scalar = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows[0];
async function main() {
 await db.connect();
 try {
  await db.query(`do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
   if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
   if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end $$;
   create schema if not exists iam; create schema if not exists admin; create schema if not exists platform; create schema if not exists scheduler; create schema if not exists tool;
   create table if not exists admin.support_sessions(auth_session_id uuid primary key,status text,expires_at timestamptz);
   create table if not exists iam.users(id uuid primary key);
   create table if not exists iam.account_closure(user_id uuid,reason text,revoked jsonb,organization_id uuid,created_by uuid,updated_by uuid,reopened_at timestamptz);
   create table if not exists iam.api_keys(id uuid,created_by uuid,status text,revoked_at timestamptz,updated_at timestamptz);
   create table if not exists scheduler.sch_task(id uuid,user_id uuid,enabled boolean);
   create table if not exists scheduler.sch_trigger(id uuid,user_id uuid,enabled boolean);
   create table if not exists tool.mcp_user_conn(id uuid,created_by uuid,status text,updated_at timestamptz,deleted_at timestamptz);
   create table if not exists platform.client_callable_door(schema_name text,function_name text,identity_args text,identity_argtypes oid[],reason text,declared_by text,non_client_lane text,signed_in_callers boolean,anonymous_callers boolean, primary key(schema_name,function_name,identity_args));
   create table if not exists public.current_user_is_admin(user_id uuid primary key, is_admin boolean);
   create table if not exists iam.system_orgs(key text primary key, organization_id uuid);
   create table if not exists admin.admin_audit_log(id uuid primary key default gen_random_uuid(), actor_user_id uuid, action text, target_user_id uuid, before jsonb, after jsonb, organization_id uuid, metadata jsonb,
     constraint owned_audit_failure check(metadata->>'reason' <> 'force audit failure'));
   grant usage on schema iam,auth,public to authenticated;
   insert into iam.system_orgs values ('system',gen_random_uuid()) on conflict do nothing;`);
  for(const n of ["auth_uid","auth_jwt","admin_lane_open","is_platform_admin","_audit_user_action"]) await db.query(await readFile(resolve(baseline!,`${n}.sql`),"utf8"));
  await db.query(`create or replace function public.system_org_id(text) returns uuid language sql as $$select organization_id from iam.system_orgs where key=$1$$`);
  const up = await readFile(migration,"utf8"); const down = await readFile(inverse,"utf8");
  await db.query(await readFile(resolve(baseline!,"baseline-functions.sql"),"utf8"));
  await db.query("drop function if exists iam._end_user_sessions(uuid)");
  await db.query(`grant execute on function iam.remove_mfa_factor(uuid,uuid,text), iam.sign_out_everywhere(uuid,text) to authenticated`);
  const people = [];
  for(let i=0;i<3;i++) {
   const persona = await makePersona(); const password = randomBytes(24).toString("base64url"); const auth = client();
   const result = await auth.signUp({ email: persona.email, password, options: { data: { full_name: persona.fullName } } }); if(result.error) throw result.error;
   assert.ok(result.data.user); people.push({uid:result.data.user.id, email:persona.email,password,auth});
  }
  const [actor, subject, other] = people;
  await db.query("insert into iam.users select id from auth.users on conflict do nothing");
  await db.query("insert into public.current_user_is_admin values ($1,true) on conflict(user_id) do update set is_admin=true",[actor.uid]);
  const call = async (user:string, factor:string, reason="lost authenticator", admin=true, supportSessionId?:string) => {
   await db.query("begin");
   try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true),set_config('matrx.admin_lane','on',true)",[JSON.stringify({sub:admin?actor.uid:other.uid,session_id:supportSessionId})]);
    const r=await db.query("select iam.remove_mfa_factor($1,$2,$3) as result",[user,factor,reason]);
    await db.query("commit"); return r.rows[0].result;
   } catch(e) {await db.query("rollback"); throw e;}
  };
  const factor = await subject.auth.mfa.enroll({factorType:"totp",friendlyName:"Primary"}); if(factor.error)throw factor.error;
  const verify = await subject.auth.mfa.challengeAndVerify({factorId:factor.data.id,code:totp(factor.data.totp.secret)});if(verify.error)throw verify.error;
  const extra = client();const login=await extra.signInWithPassword({email:subject.email,password:subject.password});if(login.error)throw login.error;
  const initial=await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid]);check(initial.n===2,"provider created both elevated and password-only sessions");
  if(process.argv.includes("--baseline")) {
   await call(subject.uid,factor.data.id);
   check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid])).n===0,"factor reset ends every pre-existing subject session");
   throw new Error("Baseline unexpectedly satisfied the intended broken-behavior assertion");
  }
  const sibling = async (fn: "sign_out_everywhere" | "close_account") => {
   await db.query("begin");
   try {
    await db.query("select set_config('request.jwt.claims',$1,true),set_config('matrx.admin_lane','on',true)",[JSON.stringify({sub:actor.uid})]);
    const r=await scalar(`select iam.${fn}($1,'owned parity rehearsal') as result`,[subject.uid]);
    check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid])).n===0,`${fn} still ends target sessions`);
    check((await scalar("select count(*)::int as n from admin.admin_audit_log where target_user_id=$1",[subject.uid])).n===1,`${fn} still writes exactly one audit`);
    return r.result;
   } finally {await db.query("rollback");}
  };
  const siblingsBefore = [await sibling("sign_out_everywhere"),await sibling("close_account")];
  await db.query(up);
  check(JSON.stringify([await sibling("sign_out_everywhere"),await sibling("close_account")])===JSON.stringify(siblingsBefore),"shared primitive preserves both existing response contracts");
  check(!(await scalar("select has_function_privilege('authenticated','iam._end_user_sessions(uuid)','execute') as yes")).yes,"private session primitive cannot be called by clients");
  const before=await scalar("select (select count(*) from auth.sessions where user_id=$1)::int as sessions,(select count(*) from admin.admin_audit_log where target_user_id=$1)::int as audit",[subject.uid]);
  for(const [u,f,r,admin,code] of [[subject.uid,factor.data.id,"unauthorized",false,"42501"],[other.uid,factor.data.id,"wrong owner",true,"P0002"],[subject.uid,factor.data.id,"",true,"22023"],[subject.uid,factor.data.id,"force audit failure",true,"23514"]] as const) {
   await assert.rejects(()=>call(u,f,r,admin),(e:unknown)=>(e as {code?:string}).code===code);checks++;
   check((await scalar("select count(*)::int as n from auth.mfa_factors where id=$1",[factor.data.id])).n===1,"refusal/audit failure preserves factor atomically");
   check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid])).n===before.sessions,"refusal/audit failure preserves subject sessions atomically");
  }
  for(const [status,expiry] of [["active","1 hour"],["ended","1 hour"],["active","-1 hour"]]) {
   const sid=randomUUID();await db.query("insert into admin.support_sessions values ($1,$2,now()+$3::interval)",[sid,status,expiry]);
   await assert.rejects(()=>call(subject.uid,factor.data.id,"support reset refused",true,sid),(e:unknown)=>(e as {code?:string}).code==='42501');checks++;
   check((await scalar("select count(*)::int as n from auth.mfa_factors where id=$1",[factor.data.id])).n===1,"support-derived sign-in cannot remove a factor even after ending/expiry");
   check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid])).n===before.sessions,"support refusal leaves sessions unchanged");
  }
  const foreignBefore=await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[other.uid]);
  const reset=await call(subject.uid,factor.data.id);
  check(reset.revoked.sessions===2,"reset returns actual removed-session count");
  check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[subject.uid])).n===0,"factor reset ends every pre-existing subject session");
  check((await scalar("select count(*)::int as n from auth.refresh_tokens where user_id=$1",[subject.uid])).n===0,"factor reset leaves no legacy subject refresh token");
  check((await scalar("select count(*)::int as n from auth.sessions where user_id=$1",[other.uid])).n===foreignBefore.n,"unrelated identity sessions are unchanged");
  const audit=await scalar("select count(*)::int as n from admin.admin_audit_log where target_user_id=$1 and action='mfa_factor_remove' and metadata->>'reason'='lost authenticator' and (after->>'sessions')::int=2",[subject.uid]);
  check(audit.n===1,"one audit binds reset reason and revocation counts");
  check(Boolean((await subject.auth.refreshSession()).error),"real AAL2 refresh is refused after reset");
  check(Boolean((await extra.refreshSession()).error),"real password-only refresh is refused after reset");
  const fresh=client();const again=await fresh.signInWithPassword({email:subject.email,password:subject.password});if(again.error)throw again.error;
  const assurance=await fresh.mfa.getAuthenticatorAssuranceLevel();check(assurance.data?.currentLevel==='aal1',"legitimate fresh login starts at AAL1 after reset");
  const missing=await fresh.mfa.challenge({factorId:factor.data.id});check(Boolean(missing.error),"removed authenticator cannot elevate a new login");
  const hashes=async()=> (await db.query("select p.proname,pg_get_functiondef(p.oid) as body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='iam' and p.proname in ('close_account','sign_out_everywhere','remove_mfa_factor') order by 1")).rows.map(r=>({name:r.proname,hash:createHash('sha256').update(r.body).digest('hex')}));
  const applied=await hashes();await db.query(down);const restored=await hashes();
  for(const r of restored) check(r.hash===createHash('sha256').update(await readFile(resolve(baseline!,`${r.name}.sql`),'utf8')).digest('hex'),`inverse restores exact ${r.name} body`);
  await db.query(up);check(JSON.stringify(await hashes())===JSON.stringify(applied),"up/inverse/up returns exact reviewed function bodies");
  console.log(JSON.stringify({checks,provider:'GoTrue v2.197.0',membershipProjection:'owned fixture relation',audit:'actual captured production helper',hostedDataTouched:false}));
 } finally {for(const a of clients) await a.signOut({scope:'local'});await db.end();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Owned reset rehearsal failed");process.exitCode=1;});
