"use client";

// features/portals/PortalAccessEditor.tsx — CD-PAGE-12: HOW CLIENTS GET INTO A PORTAL, THE OWNER'S SWITCHES.
//
// The email link is always a way in. The owner turns on the others: a client may sign herself up (a row in the client
// table, her name and address in the columns chosen here), sign in with a password she sets, or continue with Google;
// and clients may be emailed when somebody comments on their record. Every switch starts off. It saves through the
// portal's own declare door (`portalDeclare({ config: { access } })`, judged by `custom._portal_config_judge`); the
// Tables, look, forms and blocks the portal already has are sent back unchanged (a key not given is kept).

import { useEffect, useState } from "react";

import { Button, Select, Switch } from "@ai-matrx/design-system/controls";
import { useRecordsClient } from "@ai-matrx/records/react";
import type { Field, PortalCard, RecordsError } from "@ai-matrx/records";

export interface PortalAccess {
  self_signup?: boolean;
  password?: boolean;
  google?: boolean;
  notify_comments?: boolean;
  name_field?: string;
  email_field?: string;
}

const SWITCHES: Array<{ key: "self_signup" | "password" | "google" | "notify_comments"; label: string }> = [
  { key: "self_signup", label: "Clients can sign themselves up" },
  { key: "password", label: "Sign in with a password" },
  { key: "google", label: "Continue with Google" },
  { key: "notify_comments", label: "Email clients about comments" },
];
const NONE = "__none__";

function refusalText(error: RecordsError): string {
  return error.hint ? `${error.message} ${error.hint}` : error.message;
}

export function PortalAccessEditor({ portalId }: { portalId: string }) {
  const client = useRecordsClient();
  const [card, setCard] = useState<PortalCard | null>(null);
  const [clientFields, setClientFields] = useState<Field[]>([]);
  const [access, setAccess] = useState<PortalAccess>({});
  const [saving, setSaving] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const answered = await client.portalCard({ portal_id: portalId as never });
      if (!alive) return;
      if (!answered.ok) return setSaid({ ok: false, text: refusalText(answered.error) });
      setCard(answered.data);
      setAccess({ ...(((answered.data.config as { access?: PortalAccess }).access ?? {}) as PortalAccess) });
      const got = await client.fields({ table_id: answered.data.client_table_id as never });
      if (alive && got.ok) setClientFields(got.data);
    })();
    return () => {
      alive = false;
    };
  }, [client, portalId]);

  if (!card) return <p className="text-sm text-muted-foreground">{said ? said.text : "Loading sign-in"}</p>;

  const columns = [{ value: NONE, label: "None" }, ...clientFields.map((f) => ({ value: f.key, label: f.label || f.key }))];

  async function save() {
    if (!card) return;
    setSaving(true);
    setSaid(null);
    const answered = await client.portalDeclare({
      title: card.title,
      client_table_id: card.client_table_id,
      portal_id: card.portal_id,
      tables: card.tables.map((t) => ({
        table_id: t.table_id,
        names_via: t.names_via,
        visible_fields: t.visible_fields,
        editable_fields: t.editable_fields,
        comments: t.comments,
      })),
      config: { access } as NonNullable<Parameters<typeof client.portalDeclare>[0]["config"]>,
    });
    setSaving(false);
    if (!answered.ok) return setSaid({ ok: false, text: refusalText(answered.error) });
    setSaid({ ok: true, text: "Saved" });
  }

  return (
    <section className="space-y-3" data-portal-access-editor="">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">Sign-in</h3>
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <p className="text-sm text-muted-foreground">Email link: always on</p>
        {SWITCHES.map((s) => (
          <label key={s.key} className="flex items-center justify-between gap-3 text-sm text-foreground">
            <span>{s.label}</span>
            <Switch
              checked={access[s.key] === true}
              onCheckedChange={(next: boolean) => setAccess((prev) => ({ ...prev, [s.key]: next }))}
              data-portal-access-switch={s.key}
              aria-label={s.label}
            />
          </label>
        ))}
        {access.self_signup ? (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-foreground">
              <span>Name goes in</span>
              <Select
                aria-label="Name goes in"
                value={access.name_field ?? NONE}
                options={columns}
                onValueChange={(v: string) => setAccess((prev) => ({ ...prev, name_field: v === NONE ? undefined : v }))}
              />
            </label>
            <label className="space-y-1 text-sm text-foreground">
              <span>Email goes in</span>
              <Select
                aria-label="Email goes in"
                value={access.email_field ?? NONE}
                options={columns}
                onValueChange={(v: string) => setAccess((prev) => ({ ...prev, email_field: v === NONE ? undefined : v }))}
              />
            </label>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => void save()} disabled={saving} data-portal-access-save="">
          {saving ? "Saving" : "Save sign-in"}
        </Button>
        {said ? (
          <span className={`text-sm ${said.ok ? "text-muted-foreground" : "text-destructive"}`} data-portal-access-said="">
            {said.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
