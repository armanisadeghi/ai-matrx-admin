// features/auth/components/module-landing/ModulePromiseSurface.tsx
//
// THE SIGNED-IN HALF OF A MODULE WHOSE WORKSPACE IS NOT BUILT YET.
//
// A module's front door (`module-landing-pages` skill) serves guests the
// marketing landing and members the workspace. When the workspace is still a
// registered promise (an Industry the domain tree lists as "soon"), a member
// must not land on a pitch with no way in, nor on a bare "coming soon": they
// get the registered promise — label, promise, stage — read from
// `lib/coming-soon/registry.ts`, plus real doors to what already works for
// them today. No dead end.
//
// 🚨 This component is named in `PLACEHOLDER_SHELLS`
// (`lib/route-manifest/generate.ts`), so a page that mounts it is published to
// the server as a placeholder and no notification links to it. When the real
// workspace ships: mount it instead, and delete the registry entry in the
// same commit.

import type { LucideIcon } from "lucide-react";

import PageHeader from "@/features/shell/components/header/PageHeader";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { STAGE_LINE } from "@ai-matrx/kit/coming-soon";
import { COMING_SOON } from "@/lib/coming-soon/registry";

import { ModuleDoors, type ModuleDoor } from "./ModuleDoors";

export type ModulePromiseDoor = ModuleDoor;

export function ModulePromiseSurface({
  title,
  icon: TitleIcon,
  promiseKey,
  doorsHeading,
  doors,
  parent,
}: {
  title: string;
  icon: LucideIcon;
  promiseKey: keyof typeof COMING_SOON;
  doorsHeading: string;
  doors: ModulePromiseDoor[];
  /** The module this page sits in: gives the header a back arrow and a crumb. */
  parent?: { label: string; href: string };
}) {
  const promise = COMING_SOON[promiseKey];
  const stageLine = STAGE_LINE[promise.stage] ?? "";

  return (
    <>
      {parent ? (
        <RecordPageHeader backHref={parent.href} parents={[parent]} level={{ name: title }} />
      ) : (
        <PageHeader>
          <div className="flex w-full min-w-0 items-center">
            <h1 className="truncate text-sm font-medium text-foreground">
              {title}
            </h1>
          </div>
        </PageHeader>
      )}
      <div className="min-h-full w-full bg-textured pt-[var(--shell-header-h)] pb-safe">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          <section
            className="rounded-xl border border-border bg-card p-4 sm:p-6"
            data-module-promise={promise.id}
            data-module-promise-stage={promise.stage}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
                <TitleIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  {promise.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {promise.promise}
                </p>
                {stageLine ? (
                  <p className="mt-3 text-xs font-medium text-foreground">
                    {stageLine}
                  </p>
                ) : null}
                {promise.blockedBy ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {promise.blockedBy}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <h2 className="mt-8 text-sm font-semibold text-foreground">
            {doorsHeading}
          </h2>
          <ModuleDoors doors={doors} className="mt-3" />
        </div>
      </div>
    </>
  );
}
