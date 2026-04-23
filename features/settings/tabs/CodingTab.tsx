"use client";

import { Code } from "lucide-react";
import {
  SettingsSwitch,
  SettingsSelect,
  SettingsSection,
  SettingsSubHeader,
} from "@/components/official/settings";
import { useSetting } from "../hooks/useSetting";

export default function CodingTab() {
  const [language, setLanguage] = useSetting<string>(
    "userPreferences.coding.preferredLanguage",
  );
  const [theme, setTheme] = useSetting<string>(
    "userPreferences.coding.preferredTheme",
  );
  const [instance, setInstance] = useSetting<string>(
    "userPreferences.coding.instancePreference",
  );
  const [aiActivity, setAiActivity] = useSetting<string>(
    "userPreferences.coding.aiActivityLevel",
  );
  const [git, setGit] = useSetting<boolean>(
    "userPreferences.coding.gitIntegration",
  );
  const [completion, setCompletion] = useSetting<boolean>(
    "userPreferences.coding.codeCompletion",
  );
  const [analysis, setAnalysis] = useSetting<boolean>(
    "userPreferences.coding.codeAnalysis",
  );
  const [formatting, setFormatting] = useSetting<boolean>(
    "userPreferences.coding.codeFormatting",
  );
  const [voice, setVoice] = useSetting<boolean>(
    "userPreferences.coding.voiceAssistance",
  );

  return (
    <>
      <SettingsSubHeader
        title="Coding"
        description="Defaults for the code editor and coding assistants."
        icon={Code}
      />
      <SettingsSection title="Environment">
        <SettingsSelect
          label="Preferred language"
          value={language}
          onValueChange={setLanguage}
          options={[
            { value: "javascript", label: "JavaScript" },
            { value: "typescript", label: "TypeScript" },
            { value: "python", label: "Python" },
            { value: "java", label: "Java" },
          ]}
        />
        <SettingsSelect
          label="Editor theme"
          value={theme}
          onValueChange={setTheme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <SettingsSelect
          label="Execution"
          description="Where code runs by default."
          value={instance}
          onValueChange={setInstance}
          options={[
            { value: "local", label: "Local" },
            { value: "cloud", label: "Cloud" },
          ]}
        />
        <SettingsSelect
          label="AI activity"
          value={aiActivity}
          onValueChange={setAiActivity}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          last
        />
      </SettingsSection>
      <SettingsSection title="Features">
        <SettingsSwitch
          label="Git integration"
          checked={git}
          onCheckedChange={setGit}
        />
        <SettingsSwitch
          label="Code completion"
          description="Inline AI autocompletion suggestions."
          checked={completion}
          onCheckedChange={setCompletion}
        />
        <SettingsSwitch
          label="Code analysis"
          description="Real-time static analysis and linting."
          checked={analysis}
          onCheckedChange={setAnalysis}
        />
        <SettingsSwitch
          label="Code formatting"
          description="Format on save."
          checked={formatting}
          onCheckedChange={setFormatting}
        />
        <SettingsSwitch
          label="Voice assistance"
          description="Dictate and command the editor with voice."
          checked={voice}
          onCheckedChange={setVoice}
          last
        />
      </SettingsSection>
    </>
  );
}
