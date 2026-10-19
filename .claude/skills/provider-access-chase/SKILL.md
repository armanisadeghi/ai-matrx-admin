---
name: provider-access-chase
subject: integrations/provider-access
rules: [activation, custody]
description: "Follow-up sweep for pending third-party provider access campaigns. Use when the recurring 30-minute Provider Access Launch dispatcher wakes, or for a manual status check of due email threads, developer portals, support cases, or review deadlines."
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/provider-access-chase/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Chase Provider Access

<!-- rules:stamp -->
> Rules from `common-docs/systems/integrations/provider-access/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Free or cheap provider APIs are activated in batches per company, Google first,** through the
   expand, scout and submit skills (Google Fact Check Tools and PageSpeed are the model). Enabling
   one is a prompt for Codex, so dozens for one company are one prompt. A discovery agent goes through
   each company and lists every such tool worth having; leaving them undiscovered is a defect
   ("crazy", Arman, 2026-09-12). The Verification Desk trial proved it: one such API unlocked a whole
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

This skill is the follow-through loop. A recurring runner may wake every 30 minutes, but it acts only
on due campaigns and stays quiet only when nothing changed **and nothing actionable remains**.

## Durable scheduled prompt

```text
Use $provider-access-chase on the AI Matrx Provider Access Launch project. Select only planned or
active campaigns whose next-check/due time has arrived. Check their recorded email thread,
developer portal, or support case using existing authenticated access. Record consequential changes
in the task and CRM, set the next phase/action/check, and verify any approval through the canonical
integration path. Arman's 2026-08-29 standing authorization covers free, reversible,
least-privilege accounts, ordinary signup terms, development apps, keys, service accounts,
DCR/OAuth/MCP grants, Vault custody, secret rotation, service restarts, and safe proofs. Execute
those actions directly through `$provider-access-submit`; never ask him to reply yes again. Alert
Arman only for approval, rejection, deadline, material scope change, or an uncovered consequential
boundary: paid commitment, negotiated contract, regulated/compliance or legal-identity attestation,
customer data, production DNS/traffic, external communication, public publication, destructive
operation, or provider-enforced human ceremony. If nothing changed and no action is open, report only
a compact no-change receipt and do not notify repeatedly. If any earlier provider request or other
action remains unresolved, every run must lead with `OPEN ACTION — waiting on AI Matrx:` and restate
the exact deliverable, owner, blocker, and next move. “No new provider event” is only a delta and must
never be translated into “no action required,” “waiting on the provider,” or completion.
```

Use this prompt for the initial Codex scheduled task. Any later in-product scheduler must invoke a
declared Mandate by `mandate_key`; it may not take a hardcoded agent UUID or silently fall back.

## Selection and idempotency

1. Read `common-docs/systems/integrations/provider-access/FEATURE.md` when available.
2. Open the live `Provider Access Launch` Project.
3. Select only planned/active tasks in a pending phase with a due `Next check` or due date. Never check the
   whole catalog simply because the dispatcher woke.
4. Set a selected task `active` only while checking it; return it to `planned` when it is waiting on
   a provider or owner with a future due check.
5. Build a check identity from `campaign_key + source identity + newest provider event/message ID`.
   Do not write a duplicate CRM interaction or repeat an alert for the same event.
6. Use the exact recorded email thread, portal application/case ID, or support ticket. Do not search
   a whole inbox and infer campaign state from an unrelated message.
7. Establish the full current state before describing the newest delta. Carry every unresolved action
   forward from the task, CRM, and last provider event until completion is verified. A newer no-change
   check never clears an older Action Required event.

## Check order

1. Existing provider email thread or labeled provider mailbox state.
2. Developer/reviewer portal status.
3. Support ticket or escalation route when the promised window has elapsed.
4. Canonical AI Matrx connection state when an approval may have landed.

Exhaust approved isolated sessions, provider CLI/API access, Vault credentials
and service identities. An unattended run never asks for login or waits for a
reply: persist an enforced runner/provider gate and continue due campaigns. A
stale login repairable through the normal account flow is agent-owned work.

## On a new event

- Record the exact provider event, timestamp, source identity, case/thread/message ID, and links.
- Create/update the consequential `crm.interaction`; keep secrets out of the body.
- Update task `Phase`, exact next action, and next check in the same pass.
- Approval: verify the real product connection/operation and complete the stamped
  account handoff receipt before marking complete; approval does not erase
  identity, test-account or Vault custody gaps.
- Request for evidence/clarification: prepare the smallest factual response and required assets.
- Rejection: preserve the reason, compare it with submitted scopes/assets, and prepare a repair plan.
- Deadline: escalate immediately with the exact action and deadline.
- Material new scope/legal/compliance request: set `blocked_owner`; do not accept or attest.

Routine free/reversible setup proceeds under the standing authorization and must not wait for a new
confirmation. A draft response is not a sent response, and representational communication or any
other action outside the standing authorization still requires the recorded owner decision.

## Cadence

Set the next check from the provider's stated timing and current conversation intensity:

- active same-day reviewer exchange: 1 hour unless the provider states otherwise;
- ordinary pending review: daily during business days;
- stated review window: at the end of that window, then use the documented escalation route;
- owner/runner gate: resume after recorded resolution; do not repeat an unchanged
  approval question on every scheduled check;
- completed/cancelled/dismissed: no further check.

The 30-minute runner is a dispatcher, not a mandate to poll every provider twice an hour.

## Output receipt

Always leave a compact run receipt. Its first line must be the terminal current state:

- unresolved provider/agent/owner action: `OPEN ACTION — waiting on <owner>: <exact action>`;
- genuinely provider-pending with no action owed by AI Matrx or Arman: `WAITING ON PROVIDER`;
- complete and verified: `COMPLETE`.

Never emit `NO ACTION REQUIRED`, `UNCHANGED`, or a quiet/no-notify result while an unresolved action
exists. “No new provider event” belongs only in the delta field below the current-state line.

```text
Current state:
Run time:
Due campaigns checked:
New provider events:
Unresolved actions carried forward:
Tasks changed:
CRM interactions added/updated:
Approvals verified:
Owner alerts:
Next scheduled check:
No-change event identities suppressed:
```

## Example requests

- “Use `$provider-access-chase` for every campaign due now.”
- “Use `$provider-access-chase` on the Google verification thread and portal.”
- “Use `$provider-access-chase` to run a no-change/idempotency test without sending anything.”
