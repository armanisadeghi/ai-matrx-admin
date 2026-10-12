"use client";

/**
 * Smart Add — the welcome state. Modeled on Linear's onboarding (one calm question, big inputs,
 * nothing else) and Vercel's import flow (the work shows as small live steps under the field).
 * Only the main options show: Company / Person and two big inputs. While we identify, the inputs
 * settle, a soft scan line runs under them and each step chips in with its icon. The moment the
 * first real finding arrives, the page morphs (a shared-element view transition, Arc-style) into
 * the structured page; if nothing is found, three quick questions take the stage instead.
 * Every motion is `motion-safe:` (prefers-reduced-motion shows the same states without movement).
 */

import { AtSign, Check, FileSearch, Globe, ImageIcon, Loader2, UserRound } from "lucide-react";
import { Field, SegmentedControl, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import type { SocialPlatform } from "@/features/marketing/social/types";
import type { EvidenceItem } from "./evidence";
import type { RoundView } from "./SmartAddRound";
import { CustomAdd } from "./SmartAddExtras";

const STEP_COPY: Record<string, { label: string; icon: typeof Globe }> = {
  probe: { label: "Checking the website", icon: Globe },
  page: { label: "Reading the page", icon: FileSearch },
  avatars: { label: "Finding photos", icon: ImageIcon },
  socials: { label: "Looking up the account", icon: UserRound },
};

/** The shared-element names the view transition morphs between the two pages. */
export const SMART_ADD_VT = { inputs: "smart-add-inputs", kind: "smart-add-kind" } as const;

export function SmartAddHero({
  person,
  onPerson,
  websiteText,
  onWebsite,
  socialText,
  onSocial,
  showPicker,
  picked,
  pickOptions,
  onPick,
  working,
  views,
  nothingFound,
  onAdd,
}: {
  person: boolean;
  onPerson: (person: boolean) => void;
  websiteText: string;
  onWebsite: (v: string) => void;
  socialText: string;
  onSocial: (v: string) => void;
  showPicker: boolean;
  picked: SocialPlatform | null;
  pickOptions: SelectOption<SocialPlatform | "">[];
  onPick: (p: SocialPlatform | null) => void;
  working: boolean;
  views: RoundView[];
  nothingFound: boolean;
  onAdd: (item: EvidenceItem) => void;
}) {
  const steps = views.flatMap((v) => v.steps).filter((s) => !s.skipped && s.phase !== "idle" && STEP_COPY[s.step]);
  return (
    <section
      className="flex min-h-[calc(100dvh-var(--shell-header-h,3rem)-6rem)] w-full flex-col items-center justify-center px-2 py-10"
      data-testid="smart-add-hero"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-2 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {person ? "Let's find you" : "Let's find your brand"}
          </h1>
          <p className="text-base text-muted-foreground">Your website, a social link — or both.</p>
        </div>

        <div style={{ viewTransitionName: SMART_ADD_VT.kind }}>
          <SegmentedControl
            aria-label="Brand kind"
            value={person ? "person" : "company"}
            onValueChange={(v) => onPerson(v === "person")}
            data={[
              { value: "company", label: "Company" },
              { value: "person", label: "Person" },
            ]}
          />
        </div>

        <div
          className={`flex w-full flex-col gap-3 transition-transform duration-[var(--matrx-motion-duration-panel)] ease-[var(--matrx-motion-ease-panel)] ${
            working ? "motion-safe:-translate-y-1" : ""
          }`}
          style={{ viewTransitionName: SMART_ADD_VT.inputs }}
        >
          {/* Field `hero` (the 56px inviting-page input) is committed in @ai-matrx/design-system and adopts
              here as soon as that release is served (publishing is held by the CI spend block). */}
          <Field
            aria-label="Website"
            icon={<Globe aria-hidden />}
            // ui-exception: a web address is a raw value, not prose
            placeholder="yourwebsite.com"
            value={websiteText}
            autoFocus
            onChange={(e) => onWebsite(e.target.value)}
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="h-px flex-1 bg-border" />
            and / or
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex gap-2">
            <Field
              aria-label="Handle or link"
              icon={<AtSign aria-hidden />}
              // ui-exception: a handle or address is a raw value, not prose
              placeholder="@handle or profile link"
              value={socialText}
              onChange={(e) => onSocial(e.target.value)}
              className="min-w-0 flex-1"
            />
            {showPicker ? (
              <Select
                aria-label="Platform"
                value={picked ?? ""}
                options={pickOptions}
                onValueChange={(value) => onPick(value === "" ? null : value)}
                className="w-32 shrink-0 self-center"
              />
            ) : null}
          </div>

          {/* Scan line + live steps: one reserved row, so nothing below moves. */}
          <div className="flex min-h-16 flex-col items-center gap-2 pt-1" aria-live="polite">
            <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-transparent">
              {working ? (
                <span className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent motion-safe:animate-[smart-add-scan_1.4s_ease-in-out_infinite] motion-reduce:left-1/3" />
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {steps.map((s, i) => {
                const copy = STEP_COPY[s.step];
                const Icon = copy.icon;
                const done = s.phase === "settled";
                return (
                  <span
                    key={`${s.step}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {copy.label}
                    {done ? <Check className="size-3 text-primary" aria-hidden /> : <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden />}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {nothingFound ? (
          <div
            className="flex w-full flex-col gap-1 rounded-2xl border border-dashed border-border bg-card/60 py-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
            data-testid="smart-add-situation"
          >
            <span className="px-4 text-sm font-medium">Not much out there yet — three quick questions</span>
            <CustomAdd field="name" label={person ? "Your name" : "Business name"} placeholder={person ? "Your name" : "Business name"} onAdd={onAdd} />
            <CustomAdd field="description" label="What you do" placeholder="What you do, in a sentence" onAdd={onAdd} />
            <CustomAdd field="address" label="Where you are" placeholder="City or street address" onAdd={onAdd} />
          </div>
        ) : null}
      </div>
      {/* The scan keyframes and the morph's pace (the platform motion tokens) for the two shared elements. */}
      <style>{`
        @keyframes smart-add-scan { 0% { left: -33%; } 100% { left: 100%; } }
        ::view-transition-group(${SMART_ADD_VT.inputs}), ::view-transition-group(${SMART_ADD_VT.kind}) {
          animation-duration: var(--matrx-motion-duration-panel, 320ms);
          animation-timing-function: var(--matrx-motion-ease-panel, cubic-bezier(0.2, 0, 0, 1));
        }
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
