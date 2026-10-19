"use client";

// features/launchpad/components/YourLaunchpads.tsx — the strip on /launchpad: "Your launchpads" (each a door to
// /launchpad/<key>) and "New launchpad" from a template. The static launcher below it stays for everyone.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Rocket } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";
import { toast } from "@/lib/toast";
import { useLaunchpads } from "../useLaunchpads";
import { keyFromTitle, personOwner } from "../launchpad.typed-table";
import { LAUNCHPAD_TEMPLATES, type LaunchpadTemplate } from "../templates";
import { LaunchpadsMount } from "./LaunchpadsMount";

export function YourLaunchpads() {
  return (
    <LaunchpadsMount fallback={null}>
      <Strip />
    </LaunchpadsMount>
  );
}

function Strip() {
  const router = useRouter();
  const pads = useLaunchpads();
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const create = async (template: LaunchpadTemplate) => {
    if (!pads.userId) return;
    setCreating(template.id);
    const title = template.id === "blank" ? "My launchpad" : template.title;
    const key = keyFromTitle(title, pads.entries.map((e) => e.key));
    const result = await pads.save({ key, title, doc: template.doc(), owner: personOwner(pads.userId) }, `From the ${template.title} template`);
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
        {pads.loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="h-11 w-44 shrink-0 animate-pulse rounded-lg border border-border bg-card" />
            ))
          : pads.entries.map((e) => (
              <li key={`${e.owner}:${e.key}`} className="shrink-0">
                <Link
                  href={launchpadHref(e.key)}
                  data-clickable
                  className="flex h-11 w-44 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted"
                >
                  <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate" title={e.title}>
                    {e.title}
                  </span>
                  {e.owner === "org" ? <span className="shrink-0 text-xs text-muted-foreground">Team</span> : null}
                </Link>
              </li>
            ))}
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
                    disabled={creating !== null}
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
