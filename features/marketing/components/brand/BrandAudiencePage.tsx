"use client";

/** Audience personas for one brand — list cards + editor over `web.brand_persona`. */

import { useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";
import { PropertyRow } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { LoadingSurface, QueryError, SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import {
  useBrandPersonas,
  useCreateBrandPersona,
  useDeleteBrandPersona,
  useUpdateBrandPersona,
} from "@/features/marketing/data/personas";
import { brandKindCopy, type BrandKindCopy } from "@/features/marketing/lib/brand-kind";
import {
  BrandAudienceSurface,
  parsePersonaDraft,
  personaForScope,
  type PersonaDraftSeed,
} from "@/features/marketing/components/brand/BrandAudienceSurface";
import {
  personaFieldsFor,
  personaDemographics,
  type BrandPersona,
  type BrandPersonaValues,
  type PersonaDemographics,
} from "@/features/marketing/lib/persona-model";
import { extractErrorMessage } from "@/utils/errors";

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function BrandAudiencePage({
  brandId,
  brandName,
  brandKind,
  organizationId,
}: {
  brandId: string;
  brandName: string;
  brandKind?: string | null;
  organizationId: string;
}) {
  const audience = brandKindCopy(brandKind).audience;
  const Noun = audience.noun.charAt(0).toUpperCase() + audience.noun.slice(1);
  const personas = useBrandPersonas(brandId);
  const create = useCreateBrandPersona(brandId);
  const update = useUpdateBrandPersona(brandId);
  const remove = useDeleteBrandPersona(brandId);
  const [editing, setEditing] = useState<BrandPersona | "new" | null>(null);
  // An agent's staged draft: the editor opens pre-filled with it; the owner still presses Save.
  const [seed, setSeed] = useState<{ key: number; values: PersonaDraftSeed } | null>(null);
  const rows = personas.data ?? [];
  const demographicFields = personaFieldsFor(brandKind);

  const stageDraft = (value: unknown) => {
    if (personas.isPending || personas.isError) {
      throw new Error("The persona list has not loaded, so a draft cannot be staged yet.");
    }
    const { persona, seed: values } = parsePersonaDraft(
      value,
      rows,
      demographicFields.map((f) => f.key),
    );
    setSeed((prev) => ({ key: (prev?.key ?? 0) + 1, values }));
    setEditing(persona ?? "new");
  };

  const getOwn = () => {
    const loaded = !personas.isPending && !personas.isError;
    const primary = rows.find((p) => p.is_primary);
    return {
      audience_noun: audience.noun,
      audience_demographic_fields: demographicFields.map((f) => ({ key: f.key, label: f.label })),
      ...(loaded
        ? {
            audience_personas: rows.map(personaForScope),
            audience_persona_count: rows.length,
            ...(primary ? { audience_primary_persona: personaForScope(primary) } : {}),
          }
        : {}),
      ...(editing
        ? {
            audience_editor: {
              mode: editing === "new" ? "new" : "edit",
              persona_id: editing === "new" ? null : editing.id,
            },
          }
        : {}),
    };
  };

  const onSave = async (values: BrandPersonaValues) => {
    try {
      if (editing === "new") {
        await create.mutateAsync({
          organizationId,
          brandId,
          values,
          sort: rows.length ? Math.max(...rows.map((p) => p.sort)) + 1 : 0,
        });
      } else if (editing) {
        await update.mutateAsync({ persona: editing, values });
      }
      toast.success(`${Noun} saved`);
      setEditing(null);
      setSeed(null);
    } catch (error) {
      toast.error(`Could not save ${audience.noun}`, { description: extractErrorMessage(error) });
    }
  };

  const onDelete = async (persona: BrandPersona) => {
    const ok = await confirm({
      title: `Remove "${persona.name}"?`,
      description: `It leaves this ${audience.noun} list and every agent's brand context.`,
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(persona.id);
      toast.success(`Removed ${persona.name}`);
    } catch (error) {
      toast.error(`Could not remove ${audience.noun}`, { description: extractErrorMessage(error) });
    }
  };

  return (
    <BrandAudienceSurface getOwn={getOwn} onPersonaDraft={stageDraft}>
    <div className="h-full overflow-y-auto bg-textured">
      <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-[calc(var(--shell-header-h)+1rem)] sm:px-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-1 type-title text-foreground">
            {brandName} · Audience
            <AboutPeek
              title="Audience"
              about="Who this brand sells to, so every brief and agent writes for a named audience."
            />
          </h1>
          <Button variant="primary" icon={<Plus />} onClick={() => setEditing("new")}>
            {Noun}
          </Button>
        </header>

        {personas.isPending ? (
          <LoadingSurface label={`Loading ${audience.plural}…`} />
        ) : personas.isError ? (
          <QueryError error={personas.error} onRetry={() => void personas.refetch()} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-8 text-center">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
            <p className="type-secondary text-muted-foreground">No {audience.plural} yet.</p>
            <Button variant="quiet" icon={<Plus />} onClick={() => setEditing("new")}>
              Add the first {audience.noun}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 items-start">
            {rows.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onEdit={() => setEditing(persona)}
                onDelete={() => void onDelete(persona)}
              />
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <PersonaDialog
          key={`${editing === "new" ? "new" : editing.id}:${seed?.key ?? 0}`}
          seed={seed?.values ?? null}
          audience={audience}
          kind={brandKind}
          persona={editing === "new" ? null : editing}
          busy={create.isPending || update.isPending}
          onCancel={() => {
            setEditing(null);
            setSeed(null);
          }}
          onSave={(values) => void onSave(values)}
        />
      ) : null}
    </div>
    </BrandAudienceSurface>
  );
}

function PersonaCard({
  persona,
  onEdit,
  onDelete,
}: {
  persona: BrandPersona;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const demographics = Object.values(personaDemographics(persona));
  const lists: [string, string[]][] = [
    ["Goals", persona.goals],
    ["Pain points", persona.pain_points],
    ["Objections", persona.objections],
  ];
  return (
    <SectionCard
      title={persona.name}
      headerExtra={
        <>
          {persona.is_primary ? (
            <Star className="h-3.5 w-3.5 fill-current text-primary-ink" aria-label="Primary" />
          ) : null}
          <span className="flex shrink-0">
            <Button variant="quiet" aria-label={`Edit ${persona.name}`} icon={<Pencil />} onClick={onEdit} />
            <Button variant="quiet" aria-label={`Remove ${persona.name}`} icon={<Trash2 />} onClick={onDelete} />
          </span>
        </>
      }
    >
      <div className="grid gap-3 p-3">
        {demographics.length ? <PropertyRow label="Profile" value={demographics.join(" · ")} /> : null}
        {persona.summary ? <PropertyRow label="Summary" value={persona.summary} /> : null}
        {lists.map(([label, items]) =>
          items.length ? <PropertyRow key={label} label={label} value={items.join(" · ")} /> : null,
        )}
        {persona.channels.length ? <PropertyRow label="Channels" value={persona.channels.join(", ")} /> : null}
      </div>
    </SectionCard>
  );
}

function PersonaDialog({
  seed,
  audience,
  kind,
  persona,
  busy,
  onCancel,
  onSave,
}: {
  seed: PersonaDraftSeed | null;
  audience: BrandKindCopy["audience"];
  kind?: string | null;
  persona: BrandPersona | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: BrandPersonaValues) => void;
}) {
  const [name, setName] = useState(seed?.name ?? persona?.name ?? "");
  const [summary, setSummary] = useState(seed?.summary ?? persona?.summary ?? "");
  const [demographics, setDemographics] = useState<PersonaDemographics>({
    ...(persona ? personaDemographics(persona) : {}),
    ...(seed?.demographics ?? {}),
  });
  const [goals, setGoals] = useState((seed?.goals ?? persona?.goals ?? []).join("\n"));
  const [pains, setPains] = useState((seed?.pain_points ?? persona?.pain_points ?? []).join("\n"));
  const [objections, setObjections] = useState((seed?.objections ?? persona?.objections ?? []).join("\n"));
  const [channels, setChannels] = useState((seed?.channels ?? persona?.channels ?? []).join("\n"));
  const [primary, setPrimary] = useState(seed?.is_primary ?? persona?.is_primary ?? false);

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="matrx-touch-targets flex max-h-[85dvh] max-w-xl flex-col overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle className="text-base">{persona ? `Edit ${persona.name}` : `New ${audience.noun}`}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Name</Label>
            <ProInput autoFocus aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={audience.namePlaceholder} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Summary</Label>
            <ProTextarea aria-label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="text-base sm:text-sm" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {personaFieldsFor(kind).map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label className="text-xs">{field.label}</Label>
                <ProInput
                  aria-label={field.label}
                  value={demographics[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(e) => setDemographics({ ...demographics, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {(
            [
              ["Goals (one per line)", goals, setGoals],
              ["Pain points (one per line)", pains, setPains],
              ["Objections (one per line)", objections, setObjections],
              ["Channels (one per line)", channels, setChannels],
            ] as const
          ).map(([label, value, set]) => (
            <div key={label} className="grid gap-1.5">
              <Label className="text-xs">{label}</Label>
              <ProTextarea aria-label={label} value={value} onChange={(e) => set(e.target.value)} rows={3} className="text-base sm:text-sm" />
            </div>
          ))}
          <label className="matrx-tap-area flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
            Primary {audience.noun}
          </label>
        </div>
        <DialogFooter className="pb-safe">
          <Button variant="quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={busy ? <Loader2 className="animate-spin" /> : null}
            disabled={busy || !name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                summary,
                demographics,
                goals: lines(goals),
                pain_points: lines(pains),
                objections: lines(objections),
                channels: lines(channels),
                is_primary: primary,
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
