"use client";

/**
 * Settings → Connectors → OAuth apps: apps a person registers so OTHER people
 * can let them use AI Matrx (lane AT-OAUTH). Each app gets a client id and a
 * secret shown once; people authorize it on aimatrx.com's consent screen, and
 * it then reaches only the scopes it declared, never more than that person.
 * Data: `features/settings/oauthAppsService.ts`. The secret lives in component
 * state only while the one-time reveal is on screen.
 */

import { useEffect, useState } from "react";
import { AppWindow, Check, Copy, Plus } from "lucide-react";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@ai-matrx/design-system";
import { SettingsSection } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";
import { SettingsCallout } from "@ai-matrx/design-system/settings";
import { SettingsRow } from "@ai-matrx/design-system/settings";
import { SettingsTextInput } from "@ai-matrx/design-system/settings";
import { SettingsButton } from "@ai-matrx/design-system/settings";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import {
  OAUTH_APP_SCOPES,
  OAUTH_APP_SCOPE_LABELS,
  listOAuthApps,
  parseRedirectUris,
  registerOAuthApp,
  removeOAuthApp,
  type OAuthApp,
  type OAuthAppScope,
  type RegisteredOAuthApp,
} from "@/features/settings/oauthAppsService";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * THE ONE-TIME SECRET OUTLIVES A REMOUNT (AT-STOREFIX): the settings page can remount this tab (the list showed "Loading your apps"
 * and the secret panel was gone before anybody copied it). The secret is shown until the person presses Done, so it is held here, not
 * only in component state. It lives in this tab's memory only (never stored), and Done clears it.
 */
let pendingRegistration: RegisteredOAuthApp | null = null;

function Field({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <dt className="w-28 shrink-0 font-medium">{label}</dt>
      <dd
        data-secret={secret ? "oauth-client-secret" : undefined}
        className="min-w-0 flex-1 select-all break-all font-mono text-xs text-muted-foreground"
      >
        {value}
      </dd>
    </div>
  );
}

export default function OAuthAppsTab() {
  const { copyText } = useClipboard({ notify: copyNotify });
  const { organizations, loading: orgsLoading, error: orgsError, hasMore } = useUserOrganizations();

  const [apps, setApps] = useState<OAuthApp[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [redirects, setRedirects] = useState("");
  const [scopes, setScopes] = useState<OAuthAppScope[]>(["data.records:read"]);
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreatedState] = useState<RegisteredOAuthApp | null>(pendingRegistration);
  const setCreated = (app: RegisteredOAuthApp | null) => {
    pendingRegistration = app;
    setCreatedState(app);
  };
  const [copied, setCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OAuthApp | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    const outcome = await listOAuthApps().then(
      (rows) => ({ rows, error: null }),
      (e: unknown) => ({ rows: null, error: errorMessage(e) }),
    );
    setListError(outcome.error);
    setApps((current) => outcome.rows ?? current ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  // org-fallback-deliberate: exactly one membership is the answer, nothing is guessed; with several the person picks
  const chosenOrgId = orgId || (organizations.length === 1 && !hasMore ? organizations[0].id : "");
  const uris = parseRedirectUris(redirects);
  const ready = name.trim() && uris.length > 0 && scopes.length > 0 && chosenOrgId;

  const handleCreate = async () => {
    if (!ready) return;
    setCreating(true);
    setCreateError(null);
    const outcome = await registerOAuthApp(chosenOrgId, { name: name.trim(), redirect_uris: uris, scopes }).then(
      (result) => ({ result, error: null }),
      (e: unknown) => ({ result: null, error: errorMessage(e) }),
    );
    setCreating(false);
    if (!outcome.result) {
      setCreateError(outcome.error);
      return;
    }
    setCreated(outcome.result);
    setFormOpen(false);
    setName("");
    setRedirects("");
    await load();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoving(true);
    const failure = await removeOAuthApp(target.id).then(
      () => null,
      (e: unknown) => errorMessage(e),
    );
    setRemoving(false);
    if (failure) {
      toast.error("The app was not removed", { description: failure });
      return;
    }
    setRemoveTarget(null);
    toast.success(`"${target.name}" is removed`);
    await load();
  };

  const toggleScope = (scope: OAuthAppScope, on: boolean) =>
    setScopes((current) => (on ? [...current, scope] : current.filter((s) => s !== scope)));

  return (
    <>
      <SettingsSubHeader
        title="OAuth apps"
        description="Apps other people can sign in to AI Matrx with."
        icon={AppWindow}
      />

      {created && (
        <SettingsSection title={`Your new app: ${created.name}`}>
          <div className="space-y-3 px-4 py-3.5">
            <SettingsCallout tone="warning">
              This is the only time the client secret is shown. Copy it now.
            </SettingsCallout>
            <dl className="space-y-2 text-sm">
              <Field label="Client ID" value={created.client_id} />
              <Field label="Client secret" value={created.client_secret} secret />
              <Field label="Authorize URL" value={created.authorize_url} />
              <Field label="Token URL" value={created.token_url} />
            </dl>
            <Button
              icon={copied ? <Check /> : <Copy />}
              variant="outline"
              onClick={async () => {
                if (await copyText(created.client_secret, "Secret copied", "Copying was blocked. Select the secret and copy it by hand.")) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              Copy secret
            </Button>
          </div>
          <SettingsButton
            label="Hide the secret"
            description="It is never shown again."
            actionLabel="Done"
            kind="default"
            onClick={() => setCreated(null)}
            last
          />
        </SettingsSection>
      )}

      {formOpen && (
        <SettingsSection
          title="New app"
          action={
            <Button variant="quiet" onClick={() => setFormOpen(false)} disabled={creating}>
              Cancel
            </Button>
          }
        >
          <SettingsTextInput
            label="Name"
            description="Shown to people when they authorize it."
            placeholder="Inventory sync"
            value={name}
            onValueChange={setName}
            maxLength={120}
            width="lg"
          />
          <SettingsRow label="Redirect URLs" description="One per line. https, localhost, or myapp://">
            <Textarea
              aria-label="Redirect URLs"
              value={redirects}
              onChange={(e) => setRedirects(e.target.value)}
              placeholder="https://app.example.com/callback"
              rows={3}
              className="w-full max-w-md font-mono text-xs"
            />
          </SettingsRow>
          <SettingsRow label="Scopes" description="What the app may do, as the person who authorizes it.">
            <div className="flex flex-col gap-1.5">
              {OAUTH_APP_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={(v) => toggleScope(scope, v === true)}
                  />
                  {OAUTH_APP_SCOPE_LABELS[scope].label}
                  <span className="font-mono text-xs text-muted-foreground">{scope}</span>
                </label>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow label="Organization" description="Where the app is registered." error={orgsError ?? undefined} disabled={orgsLoading}>
            <OrganizationChooser
              value={chosenOrgId || null}
              valueName={orgName || organizations.find((o) => o.id === chosenOrgId)?.name || null}
              placeholder={orgsLoading ? "Loading your organizations" : "Choose one"}
              disabled={orgsLoading}
              onChange={(org) => {
                setOrgId(org.id);
                setOrgName(org.name);
              }}
            />
          </SettingsRow>
          <SettingsButton
            label="Register app"
            description="You get a client ID and a one-time secret."
            actionLabel="Register"
            kind="default"
            onClick={() => void handleCreate()}
            loading={creating}
            disabled={!ready}
            error={createError ?? undefined}
            last
          />
        </SettingsSection>
      )}

      <SettingsSection
        title="Your apps"
        action={
          !formOpen ? (
            <Button
              icon={<Plus />}
              variant="outline"
              onClick={() => {
                setCreated(null);
                setCreateError(null);
                setFormOpen(true);
              }}
            >
              New app
            </Button>
          ) : undefined
        }
      >
        {listError && (
          <div className="px-4 py-3">
            <ErrorNotice size="inline" className="text-sm" message={listError} />
          </div>
        )}
        {apps === null ? (
          <p className="px-4 py-3.5 text-sm text-muted-foreground">Loading your apps</p>
        ) : apps.length === 0 ? (
          !listError && <p className="px-4 py-3.5 text-sm text-muted-foreground">You have no OAuth apps yet.</p>
        ) : (
          apps.map((app, index) => (
            <SettingsRow
              key={app.id}
              label={app.name}
              icon={AppWindow}
              labelFor={null}
              meta={<span className="font-mono text-xs">{app.client_id}</span>}
              description={app.scopes.join(" · ")}
              last={index === apps.length - 1}
            >
              <Button variant="outline" onClick={() => setRemoveTarget(app)}>
                Remove
              </Button>
            </SettingsRow>
          ))
        )}
      </SettingsSection>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
        title={`Remove "${removeTarget?.name ?? ""}"?`}
        description="People signed in through this app lose access at once."
        confirmLabel="Remove app"
        variant="destructive"
        busy={removing}
        onConfirm={handleRemove}
      />
    </>
  );
}
