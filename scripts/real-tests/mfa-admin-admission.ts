/** Real GoTrue/PostgREST/RLS guard. Refuses hosted targets. Baseline catalog/bootstrap must be retained independently.
 * Break caught: lane-only admission accepts AAL1, ended/downgraded/support sessions and revoked admin grants.
 * MATRX_MFA_BASELINE_DIR=... MATRX_MFA_AUTH_URL=http://127.0.0.1:... MATRX_MFA_REST_URL=... MATRX_MFA_DB_URL=postgres://.../casa_mfa_admission
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { AuthClient } from '@supabase/supabase-js';
import { makePersona } from '../lib/persona.mjs';
import { totp } from '../lib/totp';
const authURL=new URL(process.env.MATRX_MFA_AUTH_URL??'http://refused.invalid');
const restURL=new URL(process.env.MATRX_MFA_REST_URL??'http://refused.invalid');
const dbURL=new URL(process.env.MATRX_MFA_DB_URL??'postgres://refused.invalid/no');
for(const u of [authURL,restURL,dbURL]) {assert.equal(u.hostname,'127.0.0.1');assert.ok(u.port);}
assert.equal(authURL.protocol,'http:');assert.equal(restURL.protocol,'http:');assert.equal(dbURL.protocol,'postgres:');assert.equal(dbURL.pathname,'/casa_mfa_admission');
const baseline=process.env.MATRX_MFA_BASELINE_DIR??'';assert.ok(baseline);
const db=new pg.Client({connectionString:dbURL.href});
const auth=new AuthClient({url:authURL.origin,persistSession:false,autoRefreshToken:false,detectSessionInUrl:false});
let n=0;const check=(v:unknown,m:string)=>{assert.ok(v,m);n++;console.log('PASS',m);};
async function rest(token:string,path:string,body?:object){const r=await fetch(new URL(path,restURL),{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',...(path.includes('/rpc/')?{'Content-Profile':'platform','Accept-Profile':'platform'}:{}),'x-matrx-admin-lane':'1'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
async function visible(t:string){const r=await rest(t,'/admin_mfa_probe?select=id,value');assert.equal(r.status,200,JSON.stringify(r.body));return Array.isArray(r.body)&&r.body.length===1;}
async function state(t:string){const r=await rest(t,'/rpc/admin_session_state',{});assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
async function policy(value:boolean,uid:string){return db.query("select platform._set_admin_mfa_required($1,$2,'Owned isolated acceptance rehearsal','READY-04 native provider evidence') id",[value,uid]);}
async function elevate(){const f=await auth.mfa.enroll({factorType:'totp',friendlyName:'Readiness rehearsal'});if(f.error)throw f.error;const v=await auth.mfa.challengeAndVerify({factorId:f.data.id,code:totp(f.data.totp.secret)});if(v.error)throw v.error;return {token:v.data.access_token,factor:f.data.id};}
async function main(){await db.connect();try{
 const person=await makePersona();const password=randomBytes(24).toString('base64url');
 const signup=await auth.signUp({email:person.email,password,options:{data:{full_name:person.fullName}}});if(signup.error)throw signup.error;assert.ok(signup.data.user&&signup.data.session);
 const uid=signup.data.user.id;const aal1=signup.data.session.access_token;
 await db.query("insert into admin.admins values($1,'super_admin')",[uid]);
 check(await visible(aal1),'RED baseline lane-only policy admits real signed AAL1');
 await db.query(await readFile('migrations/campaign/20261021215557_admin_mfa_session_admission.sql','utf8'));
 await db.query("notify pgrst,'reload schema'");
 // Poll actual RPC availability, not an arbitrary compile sleep.
 const deadline=Date.now()+15000;for(;;){const r=await rest(aal1,'/rpc/admin_session_state',{});if(r.status===200)break;if(Date.now()>deadline)throw Error('PostgREST did not expose admission RPC: '+JSON.stringify(r));await new Promise(r=>setTimeout(r,50));}
 check(await visible(aal1),'off mode preserves existing lane behavior');
 check((await state(aal1)).authority==='human','PostgREST owner connection SET ROLE remains human');
 await policy(true,uid);
 const mutant=process.env.MATRX_MFA_MUTANT;
 if(mutant){assert.ok(['true','false'].includes(mutant));await db.query(`create or replace function platform.admin_lane_open() returns boolean language sql stable as $$select ${mutant}$$`);}
 const serviceToken=(await readFile(resolve(baseline,'service.jwt'),'utf8')).trim();
 check((await state(serviceToken)).authority==='service_role'&&(await state(serviceToken)).admitted,'real signed service-role PostgREST path stays explicit machine authority');
 check((await state('')).reason==='missing_session','anonymous PostgREST gets a self-only denial');
 for(const role of ['anon','authenticated','dashboard_user','svc_seo','vault_history_writer','postgres','service_role']){
  await db.query('begin');try{await db.query('set local role '+role);await db.query("select set_config('request.headers','{\"x-matrx-admin-lane\":\"1\"}',true),set_config('request.jwt.claims','{}',true)");
   const lane=(await db.query('select platform.admin_lane_open() admitted')).rows[0].admitted;
   check(lane===(role==='service_role'),'existing lane grantee '+role+' receives correct verdict without helper ACL failure');
  }finally{await db.query('rollback');}
 }

 check(!await visible(aal1),'required mode blocks AAL1 at direct RLS');
 check((await state(aal1)).reason==='insufficient_aal','self RPC returns challenge without losing identity');
 let e=await elevate();let s=await state(e.token);
 check(s.admitted&&s.admin_level==='super_admin','real native challenge yields current admitted admin level');
 check(await visible(e.token),'current native AAL2 succeeds at direct RLS');
 const claims=await auth.getClaims(e.token);if(claims.error)throw claims.error;const sid=claims.data?.claims.session_id;assert.equal(typeof sid,'string');
 await db.query("insert into admin.support_sessions values($1,'ended',now()-interval '1 day')",[sid]);
 check((await state(e.token)).reason==='support_session'&&!await visible(e.token),'ended support provenance cannot regain human authority');
 await db.query("update admin.support_sessions set status='active',expires_at=now()+interval '1 day' where auth_session_id=$1",[sid]);
 check((await state(e.token)).reason==='support_session','active support provenance is refused too');
 await db.query("update admin.support_sessions set status='expired',expires_at=now()-interval '1 day' where auth_session_id=$1",[sid]);
 check((await state(e.token)).reason==='support_session','expired support provenance cannot regain authority');
 await db.query('delete from admin.support_sessions where auth_session_id=$1',[sid]);
 const foreign=(await db.query('select id from auth.users where id<>$1 limit 1',[uid])).rows[0];assert.ok(foreign);
 await db.query('update auth.sessions set user_id=$1 where id=$2',[foreign.id,sid]);
 check((await state(e.token)).reason==='session_ended'&&!await visible(e.token),'signed subject cannot borrow another native session row');
 await db.query('update auth.sessions set user_id=$1 where id=$2',[uid,sid]);
 await db.query('delete from admin.admins where user_id=$1',[uid]);
 check((await state(e.token)).reason==='not_admin'&&!await visible(e.token),'current role revocation defeats signed cached admin bearer');
 await db.query("insert into admin.admins values($1,'developer')",[uid]);
 check((await state(e.token)).admin_level==='developer'&&await visible(e.token),'current changed tier replaces old role without denying valid admin');
 const removed=await auth.mfa.unenroll({factorId:e.factor});if(removed.error)throw removed.error;
 const native=(await db.query('select aal from auth.sessions where id=$1',[sid])).rows[0];
 check(native?.aal==='aal1','native factor removal actually downgrades current session row');
 check((await state(e.token)).reason==='insufficient_aal'&&!await visible(e.token),'old still-signed AAL2 fails after native downgrade');
 e=await elevate();s=await state(e.token);check(s.admitted&&await visible(e.token),'new native challenge restores access after downgrade');
 const freshClaims=await auth.getClaims(e.token);if(freshClaims.error)throw freshClaims.error;const freshSid=freshClaims.data?.claims.session_id;
 await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[freshSid]);
 check((await state(e.token)).reason==='session_ended'&&!await visible(e.token),'expired native session denies signed AAL2');
 await db.query('update auth.sessions set not_after=null where id=$1',[freshSid]);
 check(await visible(e.token),'positive current session restored');
 const denied=await rest(e.token,'/rpc/feature_knob_set',{p_feature:'platform.auth',p_key:'admin_mfa_required',p_value:false});
 check(denied.status===403,'generic authenticated setting setter cannot disable MFA');
 await db.query("insert into platform.feature_knob(feature,key,value,default_value,value_type,label,description) values('platform.auth','ordinary_fixture','false','false','boolean','Fixture','Owned disposable ordinary setting')");
 for(const role of ['authenticated','service_role'])for(const sql of ["update platform.feature_knob set value='false' where feature='platform.auth' and key='admin_mfa_required'","delete from platform.feature_knob where feature='platform.auth' and key='admin_mfa_required'","update platform.feature_knob set key='renamed' where feature='platform.auth' and key='admin_mfa_required'","update platform.feature_knob set key='admin_mfa_required' where feature='platform.auth' and key='ordinary_fixture'","insert into platform.feature_knob(feature,key,value,default_value,value_type,label,description) values('platform.auth','admin_mfa_required','false','false','boolean','Attempt','Blocked insert')"]){
  await db.query('begin');try{await db.query('set local role '+role);await assert.rejects(db.query(sql),(x:unknown)=>x instanceof Error&&'code' in x&&x.code==='42501'&&x.message.includes('private audited operator setter'));n++;console.log('PASS',role,'raw policy mutation refused');}finally{await db.query('rollback');}
 }
 await db.query('begin');try{await db.query('set local role authenticated');const ordinary=await db.query("update platform.feature_knob set value='true' where feature='platform.auth' and key='ordinary_fixture' returning value");check(ordinary.rowCount===1&&ordinary.rows[0].value===true,'ordinary settings retain their existing write behavior');}finally{await db.query('rollback');}
 const audit=(await db.query("select set_note from platform.knob_override_audit where feature='platform.auth' and key='admin_mfa_required' and action='update'")).rows;
 check(audit.length===1&&JSON.parse(audit[0].set_note).evidence.includes('READY-04'),'operator change has exactly one canonical reasoned audit');
 await db.query('alter table platform.feature_knob disable trigger feature_knob_audit_tg');
 await assert.rejects(policy(false,uid),(x:unknown)=>x instanceof Error&&x.message.includes('audit receipt'));n++;console.log('PASS absent audit rolls back policy');
 check((await db.query("select value from platform.feature_knob where feature='platform.auth' and key='admin_mfa_required'")).rows[0].value===true,'audit failure cannot silently change enforcement');
 await db.query('alter table platform.feature_knob enable trigger feature_knob_audit_tg');
 await policy(false,uid);check(await visible(aal1),'private audited operator recovery restores existing AAL1 lane');
 await db.query('delete from auth.sessions where id=$1',[freshSid]);
 check((await state(e.token)).reason==='session_ended','deleted native session denies self authority even while rollout off');
 console.log(`RESULT ${n} passed; owned provider only; policy never activated hosted`);
}finally{await auth.signOut({scope:'local'});await db.end();}}
main().catch((e:unknown)=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
