"use client";

import { LayoutTemplate, Palette, Sun } from "lucide-react";
import { SettingsSelect } from "@/components/official/settings/primitives/SettingsSelect";
import { SettingsSection } from "@/components/official/settings/layout/SettingsSection";
import { SettingsSubHeader } from "@/components/official/settings/layout/SettingsSubHeader";
import { SettingsCallout } from "@/components/official/settings/layout/SettingsCallout";
import { useSetting } from "../hooks/useSetting";
import SuspenseLoader from "@/components/loaders/SuspenseLoader";
import { useActiveSettingsTabId } from "../components/SettingsTabHost";
import { useUniversalSettings } from "../universal/UniversalSettingsContext";
import { UniversalSettingsRows } from "../universal/UniversalSettingsPane";
import { THEME_MODE_OPTIONS, type ThemeMode } from "../agent-writable-settings";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import {
  OFFICE_LOOK_OPTIONS,
  OFFICE_LOOK_SETTING_PATH,
  resolveOfficeLook,
  type OfficeLook,
} from "@/features/file-actions/skin/office-look";

export const TABLE_DENSITY_KNOB_KEY = "tables.density.mode";

function TableDensitySettings() {
  const settings = useUniversalSettings();
  const density = settings.knobByKey(TABLE_DENSITY_KNOB_KEY);
  const registerConsulted =
    !settings.isLoading && !settings.error && Boolean(settings.organizationId);

  return (
    <>
      <SettingsSubHeader
        title="Density"
        description="Set how compact shared data tables appear."
        icon={Palette}
      />
      {settings.isLoading && (
        <div className="flex items-center justify-center py-8">
          <SuspenseLoader size="sm" message="Reading your table density…" />
        </div>
      )}
      {settings.error && (
        <SettingsCallout tone="error" title="Table density could not be read">
          {settings.error}
          <ErrorAlchemyMenu error={settings.error} />
        </SettingsCallout>
      )}
      {!settings.isLoading && !settings.error && !settings.organizationId && (
        <SettingsCallout tone="info" title="Choose an organization first">
          Table density is set for the organization selected in the app header.
        </SettingsCallout>
      )}
      {registerConsulted && !density && (
        <SettingsCallout tone="error" title="Table density is missing from the register">
          The canonical tables.density.mode setting could not be resolved, so no
          preference control is shown.
          <ErrorAlchemyMenu />
        </SettingsCallout>
      )}
      {density && (
        <UniversalSettingsRows knobs={[density]} hideKey />
      )}
    </>
  );
}

export default function AppearanceTab() {
  const activeTabId = useActiveSettingsTabId();
  const [mode, setMode] = useSetting<ThemeMode>("theme.mode");
  const [officeLook, setOfficeLook] = useSetting<OfficeLook | undefined>(OFFICE_LOOK_SETTING_PATH);

  if (activeTabId === "appearance.density") return <TableDensitySettings />;

  return (
    <>
      <SettingsSubHeader
        title="Appearance"
        description="Theme and Office look."
        icon={Palette}
      />

      <SettingsSection title="Theme" icon={Sun}>
        <SettingsSelect<ThemeMode>
          label="Color mode"
          description="Device setting, light, or dark; every open tab follows it."
          value={mode}
          onValueChange={setMode}
          options={THEME_MODE_OPTIONS}
          last
        />
      </SettingsSection>

      <SettingsCallout tone="info">
        Your color mode is saved to your account and applied before the page
        loads on every device.
      </SettingsCallout>

      <SettingsSection title="Office apps" icon={LayoutTemplate}>
        <SettingsSelect<OfficeLook>
          label="Office look"
          description="Google or Microsoft 365, for workbooks, documents and slides."
          value={resolveOfficeLook(officeLook)}
          onValueChange={setOfficeLook}
          options={[...OFFICE_LOOK_OPTIONS]}
          last
        />
      </SettingsSection>
    </>
  );
}
