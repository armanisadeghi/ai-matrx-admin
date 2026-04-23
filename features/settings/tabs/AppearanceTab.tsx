"use client";

import { Palette, Sun } from "lucide-react";
import {
  SettingsSwitch,
  SettingsSelect,
  SettingsSegmented,
  SettingsSection,
  SettingsSubHeader,
  SettingsCallout,
} from "@/components/official/settings";
import { useSetting } from "../hooks/useSetting";

/**
 * Appearance — theme mode (theme slice, boot-critical) + display module
 * (userPreferences, warm-cache). Two persistence tiers in one tab.
 */
export default function AppearanceTab() {
  const [mode, setMode] = useSetting<"light" | "dark">("theme.mode");
  const [theme, setTheme] = useSetting<string>("userPreferences.display.theme");
  const [darkMode, setDarkMode] = useSetting<boolean>(
    "userPreferences.display.darkMode",
  );
  const [dashboardLayout, setDashboardLayout] = useSetting<string>(
    "userPreferences.display.dashboardLayout",
  );
  const [sidebarLayout, setSidebarLayout] = useSetting<string>(
    "userPreferences.display.sidebarLayout",
  );
  const [headerLayout, setHeaderLayout] = useSetting<string>(
    "userPreferences.display.headerLayout",
  );
  const [windowMode, setWindowMode] = useSetting<string>(
    "userPreferences.display.windowMode",
  );

  return (
    <>
      <SettingsSubHeader
        title="Appearance"
        description="Theme, layout, and window presentation."
        icon={Palette}
      />

      <SettingsSection title="Theme" icon={Sun}>
        <SettingsSegmented<"light" | "dark">
          label="Color mode"
          description="Applies before first paint — synced across tabs."
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <SettingsSwitch
          label="Dark mode (legacy flag)"
          description="Used by older components that don't yet read from the theme slice."
          badge={{ label: "Deprecated", variant: "deprecated" }}
          checked={darkMode}
          onCheckedChange={setDarkMode}
        />
        <SettingsSelect
          label="Accent theme"
          description="Custom color scheme overlays."
          value={theme}
          onValueChange={setTheme}
          options={[
            { value: "default", label: "Default" },
            { value: "night", label: "Night" },
            { value: "forest", label: "Forest" },
            { value: "ocean", label: "Ocean" },
            { value: "sunset", label: "Sunset" },
          ]}
          last
        />
      </SettingsSection>

      <SettingsSection title="Layout">
        <SettingsSelect
          label="Dashboard layout"
          value={dashboardLayout}
          onValueChange={setDashboardLayout}
          options={[
            { value: "default", label: "Default" },
            { value: "compact", label: "Compact" },
            { value: "spacious", label: "Spacious" },
            { value: "grid", label: "Grid" },
          ]}
        />
        <SettingsSelect
          label="Sidebar"
          value={sidebarLayout}
          onValueChange={setSidebarLayout}
          options={[
            { value: "default", label: "Default" },
            { value: "collapsed", label: "Auto-collapse" },
            { value: "expanded", label: "Always expanded" },
            { value: "floating", label: "Floating" },
          ]}
        />
        <SettingsSelect
          label="Header"
          value={headerLayout}
          onValueChange={setHeaderLayout}
          options={[
            { value: "default", label: "Default" },
            { value: "compact", label: "Compact" },
            { value: "minimal", label: "Minimal" },
            { value: "expanded", label: "Expanded" },
          ]}
        />
        <SettingsSelect
          label="Window mode"
          value={windowMode}
          onValueChange={setWindowMode}
          options={[
            { value: "default", label: "Default" },
            { value: "fullscreen", label: "Fullscreen" },
            { value: "windowed", label: "Windowed" },
            { value: "minimal", label: "Minimal" },
          ]}
          last
        />
      </SettingsSection>

      <SettingsCallout tone="info">
        Theme color mode is saved to your account and applied before the page
        paints on reload. Layout preferences sync via IndexedDB.
      </SettingsCallout>
    </>
  );
}
