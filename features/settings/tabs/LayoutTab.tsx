"use client";

// Settings › Appearance › Layout (custom-experience): the doors to the layout editors, the Standard view
// switch, and where sign-in lands. The editors themselves are one window (shellLayoutEditorWindow).
import { LayoutTemplate, PanelLeft, PanelTop, Smartphone } from "lucide-react";
import { SettingsButton } from "@ai-matrx/design-system/settings";
import { SettingsSelect } from "@ai-matrx/design-system/settings";
import { SettingsSwitch } from "@ai-matrx/design-system/settings";
import { SettingsSection } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/rootReducer";
import { toast } from "@/lib/toast";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { selectHoldsShellLayout, selectShellStandardView } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { shellStandardViewChanged } from "@/features/shell/shell-layout/shellLayoutSlice";
import { setShellStandardViewCookie } from "@/features/shell/shell-layout/ShellLayoutSync";
import { ShellLayoutMount } from "@/features/shell/shell-layout/editor/ShellLayoutMount";
import { useShellLayoutStore } from "@/features/shell/shell-layout/useShellLayoutStore";
import { parseShellLayoutBody } from "@/features/shell/shell-layout/validate";
import { accentOf, lookOf, startingBody, withAccent, withLook } from "@/features/shell/shell-layout/editor/regions";
import { AccentPane, DEFAULT_SWATCH_LABEL } from "@/features/shell/shell-layout/editor/AccentPane";
import { accentDef } from "@ai-matrx/design-system/accents";
import type { ShellAccentRef } from "@/features/shell/shell-layout/contract";
import { LookPane } from "@/features/shell/shell-layout/editor/LookPane";
import { shellLookDef } from "@/features/shell/shell-layout/looks";
import { useLaunchpads } from "@/features/launchpad/useLaunchpads";

export default function LayoutTab() {
  const open = useOpenShellLayoutEditor();
  const dispatch = useAppDispatch();
  const holds = useAppSelector(selectHoldsShellLayout);
  const standard = useAppSelector(selectShellStandardView);
  return (
    <>
      <SettingsSubHeader title="Layout" description="Your own sidebar, header, dock, look and start page." icon={LayoutTemplate} />
      <SettingsSection title="Customize">
        <SettingsButton label="Sidebar" description="Choose, order and group your menu." actionLabel="Edit sidebar…" actionIcon={PanelLeft} kind="outline" onClick={() => open({ region: "sidebar" })} />
        <SettingsButton label="Header" description="Buttons along the top." actionLabel="Customize header…" actionIcon={PanelTop} kind="outline" onClick={() => open({ region: "header" })} />
        <SettingsButton label="Dock" description="The bar along the bottom on a phone." actionLabel="Customize dock…" actionIcon={Smartphone} kind="outline" onClick={() => open({ region: "dock" })} />
        <SettingsSwitch
          label="Standard view"
          description="Show the built-in layout instead of yours."
          checked={standard}
          disabled={!holds}
          onCheckedChange={(next: boolean) => {
            setShellStandardViewCookie(next);
            dispatch(shellStandardViewChanged(next));
          }}
          last
        />
      </SettingsSection>
      <ShellLayoutMount>
        <LookSection />
        <LandingSection />
      </ShellLayoutMount>
    </>
  );
}

/**
 * The Look the shell wears (the layout's `look`) and its accent color, saved on choosing — the same panes
 * as the editor's Look tab. OPTIMISTIC: the shell wears a choice at once, the saves queue one after the
 * other (each builds on the layout the previous one left), and a refused save puts the shell back and
 * says so (`saveLane.ts`). The panes never go disabled while saving, so quick choices simply add up.
 */
function LookSection() {
  const store = useShellLayoutStore();
  // A choice still saving is what the shell wears (the preview body): the panes mark it chosen too.
  const pending = useAppSelector(selectShellPreviewBody);
  if (store.loading) return null;
  const own = store.person ? parseShellLayoutBody(store.person.body).body : null;
  const org = store.organization ? parseShellLayoutBody(store.organization.body).body : null;
  const shown = pending ? parseShellLayoutBody(pending).body : own;
  const current = lookOf(shown ?? org);
  const choose = async (look: ReturnType<typeof lookOf>) => {
    if (look === current) return;
    const answer = await store.save("person", (now) => withLook(startingBody(now, org, "person"), look), `Look: ${shellLookDef(look).label}`, { optimistic: true });
    if (!answer.ok) toast.error(`Your look was not saved: ${answer.error}`);
  };
  const accent = accentOf(shown);
  const orgAccent = accentOf(org);
  const chooseAccent = async (next: ShellAccentRef | null) => {
    const note = next === null ? "Accent: default" : "id" in next ? `Accent: ${accentDef(next.id)?.label ?? next.id}` : `Accent: ${next.hex}`;
    const answer = await store.save("person", (now) => withAccent(startingBody(now, org, "person"), next), note, { optimistic: true });
    if (!answer.ok) toast.error(`Your accent color was not saved: ${answer.error}`);
  };
  return (
    <SettingsSection title="Look">
      <LookPane value={current} onChange={(look) => void choose(look)} />
      <AccentPane
        value={accent}
        inherited={orgAccent}
        inheritedLabel={orgAccent ? "Organization color" : DEFAULT_SWATCH_LABEL}
        onChange={(next) => void chooseAccent(next)}
      />
    </SettingsSection>
  );
}

const selectShellPreviewBody = (state: RootState) => state.shellLayout?.previewBody ?? null;

const DEFAULT_LANDING = "default";

const ORG_LANDING_PREFIX = "org:";

/** Picker options: an organization's launchpad carries a secondary "Organization" tag so it never reads as a twin. */
export function landingOptions(entries: readonly { key: string; title: string; owner: string }[]) {
  return [
    { value: DEFAULT_LANDING, label: "Dashboard" },
    ...entries.map((e) =>
      e.owner === "org"
        ? // A native option shows no description, so the tag is part of the visible label.
          { value: `${ORG_LANDING_PREFIX}${e.key}`, label: `${e.title} · Organization` }
        : { value: e.key, label: e.title },
    ),
  ];
}

/** Where sign-in lands: the platform default, or one of your launchpads (the layout's `landing`). */
function LandingSection() {
  const store = useShellLayoutStore();
  const launchpads = useLaunchpads();
  if (store.loading) return null;
  const own = store.person ? parseShellLayoutBody(store.person.body).body : null;
  const org = store.organization ? parseShellLayoutBody(store.organization.body).body : null;
  const landingKey = own?.landing?.kind === "launchpad" ? own.landing.key : DEFAULT_LANDING;
  const options = landingOptions(launchpads.entries);
  // The same key can be the organization's launchpad AND the member's copy: the member's own wins the mark.
  const current = options.some((o) => o.value === landingKey) ? landingKey : `${ORG_LANDING_PREFIX}${landingKey}`;
  const choose = async (picked: string) => {
    const key = picked.startsWith(ORG_LANDING_PREFIX) ? picked.slice(ORG_LANDING_PREFIX.length) : picked;
    const body = (now: typeof own) => {
      const { landing: _old, ...rest } = startingBody(now, org, "person");
      return key === DEFAULT_LANDING ? rest : { ...rest, landing: { kind: "launchpad" as const, key } };
    };
    const answer = await store.save("person", body, key === DEFAULT_LANDING ? "Start on the dashboard" : `Start on ${key}`);
    if (!answer.ok) toast.error(answer.error);
  };
  return (
    <SettingsSection title="Start page">
      <SettingsSelect label="After you sign in" description="Where a sign-in with no page in mind opens." value={current} options={options} onValueChange={(v) => void choose(v)} last />
    </SettingsSection>
  );
}
