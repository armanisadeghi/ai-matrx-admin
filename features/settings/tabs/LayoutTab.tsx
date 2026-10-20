"use client";

// Settings › Appearance › Layout (custom-experience): the doors to the layout editors, the Standard view
// switch, and where sign-in lands. The editors themselves are one window (shellLayoutEditorWindow).
import { LayoutTemplate, PanelLeft, PanelTop, Smartphone } from "lucide-react";
import { SettingsButton } from "@/components/official/settings/primitives/SettingsButton";
import { SettingsSelect } from "@/components/official/settings/primitives/SettingsSelect";
import { SettingsSwitch } from "@/components/official/settings/primitives/SettingsSwitch";
import { SettingsSection } from "@/components/official/settings/layout/SettingsSection";
import { SettingsSubHeader } from "@/components/official/settings/layout/SettingsSubHeader";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { selectHoldsShellLayout, selectShellStandardView } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { shellStandardViewChanged } from "@/features/shell/shell-layout/shellLayoutSlice";
import { setShellStandardViewCookie } from "@/features/shell/shell-layout/ShellLayoutSync";
import { ShellLayoutMount } from "@/features/shell/shell-layout/editor/ShellLayoutMount";
import { useShellLayoutStore } from "@/features/shell/shell-layout/useShellLayoutStore";
import { parseShellLayoutBody } from "@/features/shell/shell-layout/validate";
import { lookOf, startingBody, withLook } from "@/features/shell/shell-layout/editor/regions";
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

/** The Look the shell wears (the layout's `look`), saved on choosing — the same cards as the editor's Look tab. */
function LookSection() {
  const store = useShellLayoutStore();
  if (store.loading) return null;
  const own = store.person ? parseShellLayoutBody(store.person.body).body : null;
  const org = store.organization ? parseShellLayoutBody(store.organization.body).body : null;
  const current = lookOf(own ?? org);
  const choose = async (look: ReturnType<typeof lookOf>) => {
    if (look === current) return;
    const body = withLook(startingBody(own, org, "person"), look);
    const answer = await store.save("person", body, `Look: ${shellLookDef(look).label}`);
    if (!answer.ok) toast.error(answer.error);
  };
  return (
    <SettingsSection title="Look">
      <LookPane value={current} disabled={store.saving} onChange={(look) => void choose(look)} />
    </SettingsSection>
  );
}

const DEFAULT_LANDING = "default";

/** Where sign-in lands: the platform default, or one of your launchpads (the layout's `landing`). */
function LandingSection() {
  const store = useShellLayoutStore();
  const launchpads = useLaunchpads();
  if (store.loading) return null;
  const own = store.person ? parseShellLayoutBody(store.person.body).body : null;
  const org = store.organization ? parseShellLayoutBody(store.organization.body).body : null;
  const current = own?.landing?.kind === "launchpad" ? own.landing.key : DEFAULT_LANDING;
  const options = [{ value: DEFAULT_LANDING, label: "Dashboard" }, ...launchpads.entries.map((e) => ({ value: e.key, label: e.title }))];
  const choose = async (key: string) => {
    const base = startingBody(own, org, "person");
    const { landing: _old, ...rest } = base;
    const body = key === DEFAULT_LANDING ? rest : { ...rest, landing: { kind: "launchpad" as const, key } };
    const answer = await store.save("person", body, key === DEFAULT_LANDING ? "Start on the dashboard" : `Start on ${key}`);
    if (!answer.ok) toast.error(answer.error);
  };
  return (
    <SettingsSection title="Start page">
      <SettingsSelect label="After you sign in" description="Where a sign-in with no page in mind opens." value={current} options={options} onValueChange={(v) => void choose(v)} last />
    </SettingsSection>
  );
}
