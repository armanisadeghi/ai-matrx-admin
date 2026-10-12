"use client";

/**
 * Smart Add — the welcome state. Modeled on Linear's onboarding (one calm question, big inputs,
 * nothing else) and Vercel's import flow (the work shows as small live steps under the field).
 * Only the main options show: Company / Person and two big inputs. While we identify, the inputs
 * settle, a soft scan line runs under them and each step chips in with its icon. The moment the
 * first real finding arrives, the page morphs (shared elements glide to their new home, Arc-style) into
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

/** The attribute that marks the shared elements ("kind", "inputs") the morph carries between pages. */
export const SMART_ADD_MORPH = "data-smart-add-morph";

/** Where each shared element sits right now (read on the hero, just before the swap). */
export function readMorphRects(): Record<string, DOMRect> {
  const out: Record<string, DOMRect> = {};
  document.querySelectorAll<HTMLElement>(`[${SMART_ADD_MORPH}]`).forEach((el) => {
    out[el.getAttribute(SMART_ADD_MORPH) ?? ""] = el.getBoundingClientRect();
  });
  return out;
}

function motionMs(token: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}

/**
 * FLIP: each shared element starts where it sat on the hero and glides to its new place; everything
 * else on the structured page waits for the glide to land, then rises in (so nothing flies over it).
 */
export function playMorph(from: Record<string, DOMRect>, page: HTMLElement | null) {
  const duration = Math.max(motionMs("--matrx-motion-duration-panel", 320) * 1.2, 420);
  const easing =
    getComputedStyle(document.documentElement).getPropertyValue("--matrx-motion-ease-panel").trim() ||
    "cubic-bezier(0.2, 0, 0, 1)";
  document.querySelectorAll<HTMLElement>(`[${SMART_ADD_MORPH}]`).forEach((el) => {
    const was = from[el.getAttribute(SMART_ADD_MORPH) ?? ""];
    if (!was || typeof el.animate !== "function") return;
    const now = el.getBoundingClientRect();
    const dx = was.left + was.width / 2 - (now.left + now.width / 2);
    const dy = was.top - now.top;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${Math.min(was.width / Math.max(now.width, 1), 1.15)})`, opacity: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration, easing },
    );
  });
  if (!page) return;
  Array.from(page.children).forEach((child, i) => {
    if (!(child instanceof HTMLElement) || child.hasAttribute(SMART_ADD_MORPH)) return;
    child.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: duration * 0.7, delay: duration * 0.65 + i * 40, easing, fill: "backwards" },
    );
  });
}

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
      className="flex min-h-[calc(100dvh-var(--shell-header-h,3rem)-6rem)] w-full flex-col items-center justify-start px-2 pb-10 pt-[14vh]"
      data-testid="smart-add-hero"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-2 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {person ? "Let's find you" : "Let's find your brand"}
          </h1>
          <p className="text-base text-muted-foreground">Your website, a social link — or both.</p>
        </div>

        <div {...{ [SMART_ADD_MORPH]: "kind" }}>
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
          {...{ [SMART_ADD_MORPH]: "inputs" }}
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

          {/* Scan line + live steps: room reserved for two rows of steps (a phone wraps them), so nothing moves. */}
          <div className="flex min-h-24 flex-col items-center gap-2 pt-1" aria-live="polite">
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
      {/* The scan line's sweep. */}
      <style>{`@keyframes smart-add-scan { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
    </section>
  );
}
