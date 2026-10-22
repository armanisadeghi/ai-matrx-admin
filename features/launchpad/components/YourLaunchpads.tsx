"use client";

// features/launchpad/components/YourLaunchpads.tsx — the strip on /launchpad: "Your launchpads" (each a door to
// /launchpad/<key>; the organizations' marked "Team") and "New launchpad" from a template: the role templates,
// the person's own saved templates and the organizations'. An organization's owner or admin can make the new
// launchpad the organization's (every member sees it). The static launcher below it stays for everyone.
import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Rocket, Trash2 } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Skeleton } from "@ai-matrx/design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useUserRole } from "@/features/organizations/hooks";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { useLaunchpads, type LaunchpadEntry } from "../useLaunchpads";
import { keyFromTitle, personOwner } from "../launchpad.typed-table";
import { LAUNCHPAD_TEMPLATES } from "../templates";
import { LaunchpadsMount } from "./LaunchpadsMount";

/** The person's own launchpads as the server read them (`server/readLaunchpads.ts`), keys and titles only. */
export interface ServerLaunchpadList {
  pads: { key: string; title: string }[];
}

export function YourLaunchpads({ serverLaunchpads = null }: { serverLaunchpads?: Promise<ServerLaunchpadList | null> | null }) {
  return (
    <LaunchpadsMount fallback={null}>
      <Strip serverLaunchpads={serverLaunchpads} />
    </LaunchpadsMount>
  );
}

/** What "New launchpad" copies: a role template, or a launchpad someone saved as a template. */
interface StartingPoint {
  id: string;
  title: string;
  doc: () => LaunchpadDoc;
}

function Strip({ serverLaunchpads }: { serverLaunchpads: Promise<ServerLaunchpadList | null> | null }) {
  const router = useRouter();
  const pads = useLaunchpads();
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [forWhom, setForWhom] = useState<"mine" | "organization">("mine");
  // The organization's Layout gate: an owner or admin of the organization new things are saved in.
  const role = useUserRole(pads.activeOrganizationId ?? undefined);
  const forOrganization = role.isAdmin && forWhom === "organization";

  const create = async (from: StartingPoint) => {
    // Never while the list is still loading: the new key is chosen against the person's existing keys, and an
    // empty list would reuse one and overwrite that launchpad. The buttons wait for the list (below).
    if (pads.loading) return void toast.info("Your launchpads are still loading");
    if (!pads.userId) return void toast.error("Sign in to create a launchpad");
    setCreating(from.id);
    const title = from.id === "blank" ? "My launchpad" : from.title;
    // Unique among every key the person can open, so a new launchpad never hides another's link.
    const key = keyFromTitle(title, pads.entries.map((e) => e.key));
    const owner = forOrganization ? ("org" as const) : personOwner(pads.userId);
    // A thrown write is an answer too, never a button stuck on "Creating…".
    const result = await pads
      .save({ key, title, doc: from.doc(), owner }, `From the ${from.title} template`)
      .catch((thrown: unknown) => ({ ok: false as const, error: thrown instanceof Error ? thrown.message : String(thrown) }));
    setCreating(null);
    if (!result.ok) return void toast.error(result.error);
    setChoosing(false);
    if (forOrganization) toast.success("Everyone in your organization sees this launchpad");
    router.push(launchpadHref(key));
  };

  const removeTemplate = async (t: LaunchpadEntry) => {
    const yes = await confirm({
      title: `Remove the "${t.title}" template?`,
      description: t.owner === "template:org" ? "No one in your organization can start from it." : "You can no longer start from it.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!yes) return;
    const result = await pads.archive(t);
    if (!result.ok) toast.error(result.error);
  };

  const saved = (owner: "mine" | "organization") =>
    pads.templates.filter((t) => (owner === "organization" ? t.owner === "template:org" : t.owner !== "template:org"));
  const busy = creating !== null || pads.loading;

  return (
    <section aria-label="Your launchpads" className="mb-4">
      <div className="flex h-8 items-center gap-2">
        <h2 className="text-sm font-medium">Your launchpads</h2>
        <Button variant="quiet" className="ml-auto" icon={<Plus />} onClick={() => setChoosing(true)}>
          New launchpad
        </Button>
      </div>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-busy={pads.loading || undefined}>
        {pads.loading ? (
          serverLaunchpads ? (
            <Suspense fallback={<SkeletonDoors />}>
              <ServerDoors list={serverLaunchpads} />
            </Suspense>
          ) : (
            <SkeletonDoors />
          )
        ) : (
          pads.entries.map((e) => (
            <LaunchpadDoor key={`${e.owner}:${e.organizationId}:${e.key}`} launchpadKey={e.key} title={e.title} team={e.owner === "org"} />
          ))
        )}
      </ul>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New launchpad</DialogTitle>
          </DialogHeader>
          {role.isAdmin ? (
            <SegmentedControl
              aria-label="Who the new launchpad is for"
              fill
              value={forWhom}
              onValueChange={setForWhom}
              data={[
                { value: "mine", label: "Just me" },
                { value: "organization", label: "Everyone in the organization" },
              ]}
            />
          ) : null}
          <TemplateGroup label="Start from" items={LAUNCHPAD_TEMPLATES} creating={creating} disabled={busy} onPick={create} />
          <TemplateGroup label="Your templates" items={saved("mine")} creating={creating} disabled={busy} onPick={create} onRemove={removeTemplate} />
          <TemplateGroup
            label="Your organization's templates"
            items={saved("organization")}
            creating={creating}
            disabled={busy}
            onPick={create}
            onRemove={role.isAdmin ? removeTemplate : undefined}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}

type Pickable = { id: string; title: string; hint: string; icon: typeof Rocket; doc: () => LaunchpadDoc; entry?: LaunchpadEntry };

/** Role templates as they are; a saved template as a pickable starting point (its layout, read when picked). */
function pickable(item: (typeof LAUNCHPAD_TEMPLATES)[number] | LaunchpadEntry): Pickable | null {
  if ("id" in item) return item;
  if (!item.parsed.ok) return null;
  const doc = item.parsed.doc;
  return {
    id: `saved:${item.organizationId}:${item.owner}:${item.key}`,
    title: item.title,
    hint: `${doc.widgets.length} ${doc.widgets.length === 1 ? "widget" : "widgets"}`,
    icon: Rocket,
    doc: () => doc,
    entry: item,
  };
}

function TemplateGroup({
  label,
  items,
  creating,
  disabled,
  onPick,
  onRemove,
}: {
  label: string;
  items: readonly ((typeof LAUNCHPAD_TEMPLATES)[number] | LaunchpadEntry)[];
  creating: string | null;
  disabled: boolean;
  onPick: (from: StartingPoint) => void;
  onRemove?: ((t: LaunchpadEntry) => void) | undefined;
}) {
  const shown = items.flatMap((i) => pickable(i) ?? []);
  if (shown.length === 0) return null;
  return (
    <section aria-label={label} data-template-group={label}>
      <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((t) => {
          const Icon = t.icon;
          const entry = t.entry;
          return (
            <li key={t.id} className="flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted">
              <button
                type="button"
                data-clickable
                disabled={disabled}
                onClick={() => void onPick(t)}
                className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{creating === t.id ? "Creating…" : t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.hint}</span>
                </span>
              </button>
              {entry && onRemove ? (
                <Button variant="quiet" removes icon={<Trash2 />} aria-label={`Remove the ${t.title} template`} onClick={() => onRemove(entry)} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** While the browser's read runs: the server's list when it has one, else three quiet placeholders. */
function ServerDoors({ list }: { list: Promise<ServerLaunchpadList | null> }) {
  const answer = use(list);
  if (!answer || answer.pads.length === 0) return <SkeletonDoors />;
  return (
    <>
      {[...answer.pads]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => (
          <LaunchpadDoor key={p.key} launchpadKey={p.key} title={p.title} team={false} />
        ))}
    </>
  );
}

function SkeletonDoors() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="shrink-0">
          <Skeleton className="h-11 w-44 rounded-lg" />
        </li>
      ))}
    </>
  );
}

function LaunchpadDoor({ launchpadKey, title, team }: { launchpadKey: string; title: string; team: boolean }) {
  return (
    <li className="shrink-0">
      <Link
        href={launchpadHref(launchpadKey)}
        data-clickable
        className="flex h-11 w-44 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted"
      >
        <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>
        {team ? <span className="shrink-0 text-xs text-muted-foreground">Team</span> : null}
      </Link>
    </li>
  );
}
