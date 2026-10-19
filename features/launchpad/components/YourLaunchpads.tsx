"use client";

// features/launchpad/components/YourLaunchpads.tsx — the strip on /launchpad: "Your launchpads" (each a door to
// /launchpad/<key>) and "New launchpad" from a template. The static launcher below it stays for everyone.
import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Rocket } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Skeleton } from "@ai-matrx/design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";
import { toast } from "@/lib/toast";
import { useLaunchpads } from "../useLaunchpads";
import { keyFromTitle, personOwner } from "../launchpad.typed-table";
import { LAUNCHPAD_TEMPLATES, type LaunchpadTemplate } from "../templates";
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

function Strip({ serverLaunchpads }: { serverLaunchpads: Promise<ServerLaunchpadList | null> | null }) {
  const router = useRouter();
  const pads = useLaunchpads();
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const create = async (template: LaunchpadTemplate) => {
    // Never while the list is still loading: the new key is chosen against the person's existing keys, and an
    // empty list would reuse one and overwrite that launchpad. The buttons wait for the list (below).
    if (pads.loading) return void toast.info("Your launchpads are still loading");
    if (!pads.userId) return void toast.error("Sign in to create a launchpad");
    setCreating(template.id);
    const title = template.id === "blank" ? "My launchpad" : template.title;
    const key = keyFromTitle(title, pads.entries.map((e) => e.key));
    // A thrown write is an answer too, never a button stuck on "Creating…".
    const result = await pads
      .save({ key, title, doc: template.doc(), owner: personOwner(pads.userId) }, `From the ${template.title} template`)
      .catch((thrown: unknown) => ({ ok: false as const, error: thrown instanceof Error ? thrown.message : String(thrown) }));
    setCreating(null);
    if (!result.ok) return void toast.error(result.error);
    setChoosing(false);
    router.push(launchpadHref(key));
  };

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
          pads.entries.map((e) => <LaunchpadDoor key={`${e.owner}:${e.key}`} launchpadKey={e.key} title={e.title} team={e.owner === "org"} />)
        )}
      </ul>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New launchpad</DialogTitle>
          </DialogHeader>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {LAUNCHPAD_TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    data-clickable
                    disabled={creating !== null || pads.loading}
                    onClick={() => void create(t)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{creating === t.id ? "Creating…" : t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
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
