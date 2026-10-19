---
name: vault-account-setup
subject: [account/vault-secrets, integrations/provider-access]
rules: [custody]
type: Skill
title: "Vault account setup"
description: "Provider account and authenticator setup through Matrx Vault. Use when creating a service account, saving its login, enrolling 2FA, or verifying agent sign-in with Vault credentials."
tags: [vault, authenticator, integrations, coding-agents]
timestamp: 2026-10-11
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/vault-account-setup/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Vault account setup

<!-- rules:stamp -->
> Rules from `common-docs/systems/integrations/provider-access/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

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

Create the provider account, keep its login and authenticator on one Vault
credential, confirm 2FA at the provider, then prove a fresh sign-in. A rotating
code in Matrx alone does not prove that the provider accepted enrollment.

## Identity and inventory

1. Read the provider campaign/register and search existing provider accounts,
   Vault metadata, and connections before creating anything. An unavailable
   `credential_login` response is UNKNOWN, not an empty inventory. Resolve it
   through the app's metadata or report the exact unavailable boundary.
2. Use the identity explicitly authorized by the user. For a named personal
   Chrome profile, prefer approved isolated credentials where available; when
   that profile is required, open your own tab there and verify its identity.
   Ordinary Matrx tests use the isolated in-app Browser and authorized admin
   login. Leave pre-existing tabs untouched; close your own tabs when done.
3. Writes carry the shell's active organization and signed-in user. Choose the
   intended organization in the shell before starting, verify it, and retain
   that context throughout setup. Membership discovery never silently chooses
   an organization. A context change cancels pending setup.

## Create and store the login

4. Reuse the task's explicit authority for routine signup/login/Vault steps;
   never ask for it again. Prefer the intended Google identity when supported.
   A runner may still enforce action-time Terms/CAPTCHA/access approval or
   credential-change handoff. In an unattended run, record the exact gate and
   resumption condition, park the item and continue other work—do not ask, wait,
   bypass it or report success. In an interactive run, present only the exact
   required action. Broad authorization never removes an enforced runner gate.
5. Save the login through Vault → New → Website login: provider name, exact
   login URL, username/email, and password if that account has one. Use the
   Vault password generator or a supported private credential transfer.
   Do not put passwords, setup seeds, recovery codes, or rotating codes into
   model-visible text, screenshots, logs, or shell commands. Save recovery
   codes in the credential's protected recovery field through a private path.
6. Read back saved metadata before leaving signup. Record purpose/role and
   environment, exact provider account/workspace and owning organization, login
   method/URL, campaign and recovery location. Record developer/production roles
   and environments separately while preserving one actual identity across its roles;
   keep distinct reviewer/test accounts separate. For SSO record provider + exact principal
   + upstream Vault login reference; password is not applicable, never missing
   by inference. A client secret/token is not a reusable website login.
   Use existing supported fields/notes and account-credential associations;
   never invent a metadata API. If a required write is unavailable, preserve the
   item ID and unfinished custody step; do not close the task.

## Enroll the authenticator

7. Start authenticator setup at the provider. In Matrx:
   - Existing login: open its Two-factor section → Add authenticator.
   - New Vault login: Website login → Add authenticator.
   - TOTP-only: Authenticator → Add goes straight to setup; no login required.
8. One setup screen offers camera, image selection, paste/drop, and manual
   setup key. Prefer QR import; transfer sensitive pixels or clipboard content
   privately through documented browser APIs, without emitting it to the model.
   If no supported private transfer exists, report that boundary; never invent
   a tool or extract secrets into chat. Local image decoding sends no image to
   the server. Manual keys and otpauth links use the same enrollment path.
9. Valid intake saves once and immediately shows the current code. Blank/default
   names come from issuer/account metadata; existing custom names stay intact.
   Do not demand a username/password for TOTP-only credentials.
10. If enrollment fails after credential creation, keep its exact ID and retry
    there. Do not create a second login. A recent-authentication refusal offers
    password confirmation in Matrx. A generic 401 requires checking login and
    context, not assuming a missing seed. Preserve input while resolving it.
11. Transfer the displayed code privately into the provider's confirmation
    field. Require the provider's enabled/confirmed state. Store recovery data
    privately. If Matrx enrollment succeeded but provider confirmation failed,
    finish on that same credential rather than declaring success.

## Prove use

12. Sign out of the provider and perform a fresh sign-in using the saved login
    and authenticator through approved private filling. For brokered browser
    tools, inspect their actual advertised schema; use `credential_login` only
    when available. `authenticated` proves sign-in; `unknown` does not.
13. For provider work, fill the stamped account handoff receipt above. Include
    every actual login and reviewer/test identity, environment/workspace, Vault
    references, SSO chain, MFA/recovery custody, fresh-login proof and exact test
    actor/target/result. A saved authenticator is not provider confirmation.
    Every applicable slot needs evidence or an explicit unresolved gap; gaps
    prevent custody completion. `not_applicable` requires a reason. Verify each
    provider separately; never infer production access from a sandbox test.

Eval maintenance only → read `evals.md` for the regression scenarios.
