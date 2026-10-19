---
name: provider-access-submit
subject: integrations/provider-access
rules: [activation, custody]
description: "End-to-end execution of a scouted third-party provider access campaign. Use when a Provider Access Launch task is ready_to_submit or scouted easy_execute and needs account or app registration, scopes, reviewer assets, Vault credential custody, the canonical connection, and real verification."
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/provider-access-submit/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Submit Provider Access

<!-- rules:stamp -->
> Rules from `common-docs/systems/integrations/provider-access/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Free or cheap provider APIs are activated in batches per company, Google first,** through the
   expand, scout and submit skills (Google Fact Check Tools and PageSpeed are the model). Enabling
   one is a prompt for Codex, so dozens for one company are one prompt. A discovery agent goes through
   each company and lists every such tool worth having; leaving them undiscovered is a defect. The Verification Desk trial proved it: one such API unlocked a whole
   step of a real method for ten minutes of enabling.
2. **An activation ends with a platform tool registered** for users and agents, not just a key.

**Business authorization and runner approval are separate.** Reuse recorded authority
for routine login, SSO, accessible mailbox verification, requested setup and Vault
custody; never ask for the same permission again. An unattended worker must not ask
questions, request a manual click, or wait for a reply. If a tool enforces an
action-time approval or human-only step, preserve the precise action, destination,
requirement, attempted recovery and resumption condition on the owning task. Park
only that work and continue other requests. Do not bypass the gate, claim the user
refused, or call it a provider review wait. Notify once for a new actionable gate;
unchanged gates do not generate repeated approval prompts.

**Account custody is part of completion.** For every identity used or created,
record its exact provider account/workspace IDs, login method and entry URL, role
(production, developer, reviewer/test, support or billing), environment and Vault
item reference. One identity may have several roles; do not duplicate it just for
labels. Distinct test identities remain separate from production. A passwordless
SSO login must name the identity provider, exact principal and its existing Vault
login reference; a client secret or OAuth token alone does not document portal
access. Do not invent a password, silently substitute an account or infer a
workspace from an email address.

Save new credentials immediately through the supported private Vault path, then
read back the saved item metadata and verify a fresh login. Preserve the same
item/operation identity after interruption. Record MFA method, protected
authenticator/recovery custody and provider confirmation separately from login
proof. Absence from a limited metadata search is UNKNOWN, not proof of absence.
Missing private-write capability is an unfinished custody step, not completion.
Never rotate working credentials merely to repair missing documentation.

Before completion, the worker and independent verifier fill the account handoff
receipt below from persisted records. Every applicable value is verified or a
named gap; use `not_applicable` with a reason rather than empty fields. Keep secret
values only in protected Vault fields. Provider approval, portal login custody,
reviewer/test proof and product-operation proof are separate outcomes. A green
approval badge never closes missing custody or identity proof.

### Account handoff receipt

This is a task/result contract, **not new database columns**. Keep identity and
credential associations in `provider.account` / `provider.account_credential`,
secret and login metadata in Vault, and the proof receipt on the existing campaign
task (or claimed Work Loop result). Link these records; do not start a second
account registry. Use the normal supported product surfaces; do not fabricate a
metadata write API. Customer seller/store accounts remain in
`commerce.marketplace_account`, linked as test targets rather than company logins.

```text
Provider / capability / owning campaign:
Approval: exact app/client/project ID, environment, granted capability, receipt URL/date
Identities used (one row per actual account):
  purpose/roles; company/customer/test ownership; provider account reference;
  exact login identity (or protected identity reference); account/workspace IDs;
  workspace role; environment; login URL and method;
  Vault login item reference; SSO provider + principal + upstream Vault reference;
  client/key credential references (never values); status and saved-record readback
MFA/recovery per identity:
  method; authenticator on login item; protected recovery location;
  provider-confirmed state; fresh sign-in result/time; observed failure if any
Tests:
  exact test/reviewer identity reference; target tenant/workspace/store reference;
  environment; scopes/role; operation/result/evidence/time;
  test data retained or removed; cleanup/revoke/reconnect instructions
Handoff:
  next operator's login path; existing owner; last verified time;
  each unresolved gap, recovery attempted, next action and resumption condition
```

A verifier starts from those persisted references, not a worker's open session.
For public signup, SSO, OAuth and commerce portal work, require fresh login under
the intended identity and a match between portal account/workspace and the saved
record. An authenticated browser inherited from another worker is not that proof.
No applicable identity or custody gap may be omitted from the final task status.
<!-- rules:stamp-end -->

Execute one campaign or a small related batch without scope creep. The scouting record is the
submission brief; stop and rescout if the live portal materially disagrees.

## Preconditions

1. Read `common-docs/systems/integrations/provider-access/FEATURE.md` when available.
2. The campaign key is unique; the task contains a current official-source scouting record.
3. Every requested scope maps to an implemented product action and verification operation.
4. The task is `Phase: ready_to_submit`, or the scout recorded `easy_execute` and every gate passed.
5. Any paid commitment, negotiated/custom legal term, compliance or regulated-data attestation,
   legal-identity attestation, production DNS/traffic change, public publication/external
   communication, customer-data access, destructive action, or broader-scope choice has an explicit
   owner decision.
6. The action is covered by the standing authorization in the provider-access feature, or the task
   records the explicit owner decision for an uncovered paid, negotiated, regulated,
   customer-impacting, destructive, public, or human-only boundary.

If a precondition fails, record the exact gap before changing provider state. In
unattended runs, park that item and continue other authorized work; never wait
for a reply. Preserve already verified provider approval separately.

## Standing authorization and autonomy

- Arman authorized routine free, reversible, least-privilege Provider Access Launch setup on
  2026-08-29. Do not ask him to reply yes for account creation, ordinary free-tier signup terms,
  development apps, keys, service accounts, DCR/OAuth/MCP grants, Vault custody, secret rotation,
  service restart, or the recorded safe proof. Execute and leave an audit receipt.
- New authority is needed only for a charge or paid-plan commitment, negotiated contract, regulated/compliance or
  legal-identity attestation, customer-data access, production DNS/traffic change, external
  communication, public publication, destructive operation, or provider-enforced CAPTCHA,
  biometric, hardware-key, signature, or identity ceremony.

- For interactive runs, a genuinely required owner decision permits the agent
  to act where the runner allows it; perform the authorized action yourself.
  For unattended runs, follow the stamped recorded-gate procedure; do not ask or
  wait. An enforced human handoff remains binding.
- Never ask Arman to click a button, choose an already-settled account, complete ordinary login or
  SSO, approve an OAuth consent screen, copy a code the agent can read, or finish any other step the
  agent can operate.
- Do not set `Phase: blocked_owner` for any standing-authorized action. Use it only when the
  remaining action is technically or legally impossible for the agent or falls outside the standing
  authorization.
- Claiming a campaign means owning its account access, registration, verification email, credential
  custody, connection, proof, reconciliation, and follow-up. Never finish at an account chooser,
  ordinary SSO screen, verification link, consent page, credential copy screen, or Vault-save step.
- Never emit a grouped yes/no packet for standing-authorized actions. If an uncovered boundary
  exists, consolidate only those uncovered actions into one recorded gate and continue every
  authorized campaign. Interactive sessions may ask once; unattended workers do not.
- Recurring choices already settled in provider policy are not new questions.
  Record uncovered choices on the task with a proposed reusable rule; unattended
  workers continue the queue instead of starting an interview.
- Disable domain-wide automatic workspace joining and send no onboarding invitations unless the
  campaign explicitly requires and authorizes membership. Refuse defaults such as “Anyone with
  `@aimatrx.com` can join.”

## Account and secret handling

- Exhaust existing CLI/API credentials, Vault entries, service identities, and authenticated browser
  sessions before asking Arman to log in.
- Use only Codex's separate in-app Browser for UI work. Use `info@aimatrx.com` as the default
  AI Matrx-owned provider identity and Google SSO where supported; never borrow Arman's Chrome tabs,
  profile, cookies, or saved passwords. A Google/Microsoft campaign ownership exclusion does not
  prohibit using Google SSO merely to authenticate an eligible non-Google/non-Microsoft provider.
- Continue through ordinary login, account choosers, existing-session SSO, OAuth consent, and
  email-link flows the agent can access. Standing-authorized free, reversible identity disclosure
  and persistent grants proceed without another permission request.
- Never guess publisher/legal/compliance facts. Read them from the approved Vault profile.
- Never store a password in the browser or paste a credential value into tasks, docs, CRM, shell
  arguments, logs, screenshots, or Git.
- Put passwords, API keys, client secrets, TOTP/recovery material, and protected files into the
  AI Matrx organization Vault through the normal product/service surface.
- When a new password account is required, generate one unique strong password without printing it,
  create and verify the standing-authorized free account, and save the credential in Vault. Store
  non-secret metadata for provider,
  login URL, account identity, organization/workspace, authentication and MFA methods, owning task,
  creation date, and recovery/revocation location. Prefer TOTP over SMS/push when optional and keep
  the seed plus recovery codes in the Vault; never weaken existing MFA.
- Retrieve accessible magic links, verification emails, and one-time codes through the approved
  mailbox/tool path. They are agent work, not owner blockers.
- Invoke `secret-location-audit` after creating, rotating, or retiring a credential.

## Execution

1. Set the task `active`, `Phase: submitting`, owner, and exact current action.
2. Re-open the official requirements and compare the live form with the scouting record.
3. Reuse the existing provider account/application when the campaign records one. Do not create a
   second app to escape a confusing state.
4. Enter only approved canonical publisher data and only the scouted scopes/capabilities.
5. Prepare requested evidence using the actual product:
   - stable public homepage/privacy/terms/support URLs;
   - focused screenshots of the implemented flow;
   - an unlisted/public reviewer video showing consent, user action, result, and disconnect/revoke;
   - reviewer instructions and test credentials through the provider's protected mechanism.
6. Immediately before the final provider-changing click, confirm the live form still matches the
   authorized action. Submit only once.
7. Capture the non-secret receipt: app/account/project ID, case ID, exact scopes, timestamp, actor,
   submitted URLs, evidence links, provider status, and stated review timing.
8. Record consequential outbound/inbound communication as `crm.interaction`, retaining provider
   thread/message IDs when available. Link it from the task.
9. Set `Phase: awaiting_provider`, `status=planned`, and the next due check, or continue to
   verification when access is immediate. `active` means someone is working now; waiting is planned.

## Verification

Do not complete the task because a portal says “created” or “approved.” Verify all applicable steps:

1. Store/connect through the canonical Vault-backed integration or MCP path.
2. Discover the intended capability or tools.
3. Perform one real least-privilege operation through the user-facing or canonical aidream path.
4. Confirm the task, `users.integration_connections` or `tool.mcp_user_conn`, and provider portal
   agree.
5. Record revoke/disconnect/reconnect instructions and evidence.
6. Fill the canonical account handoff receipt from persisted Vault/account/test
   records; invoke `vault-account-setup` for custody and fresh login proof.
7. Set `Phase: verified` and `status=completed` only when both the product proof
   and every applicable account-custody check pass. Never close on approval alone.

For an official remote MCP, connection approval and tool-operation safety are separate. Use the
scout's recorded read-only, test, sandbox, or project-scoped proof. A successful easy connection
does not authorize destructive, financial, production-data, permission-changing, or external-
communication tools; those retain their normal user-confirmation boundaries.

If immediate developer/sandbox access works but production activation remains, record and verify the
developer milestone without falsely completing the production campaign. Split the campaign only if
the development access is independently useful and ongoing.

## Failure handling

- Validation error before submission: fix the record/form and retry only when the provider confirms
  no case was created.
- Unknown result after final click: inspect email, portal, and network/receipt state before retrying.
- Rejection: set `Phase: rejected`, preserve the exact reason, prepare the smallest compliant repair,
  and set the next decision/check.
- New material requirement: return to scouting; do not improvise an attestation.
- A provider-enforced human-only challenge, physical hardware key, biometric/identity ceremony,
  signature, regulated commitment, or payment decision that the agent cannot perform: set
  `Phase: blocked_owner` with the exact one-step owner action. An ordinary login, account choice,
  OAuth approval button, Vault operation, or any other standing-authorized action is not an owner
  blocker.

## Example requests

- “Use `$provider-access-submit` to connect the approved Notion remote MCP campaign.”
- “Use `$provider-access-submit` for the Bing Webmaster API-key route after the action boundary.”
- “Use `$provider-access-submit` to prepare Google’s reviewer response, stop before sending, and
  show the exact final action.”
