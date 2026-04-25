"use client";

import { Type } from "lucide-react";
import { SettingsSwitch } from "@/components/official/settings/primitives/SettingsSwitch";
import { SettingsSelect } from "@/components/official/settings/primitives/SettingsSelect";
import { SettingsSection } from "@/components/official/settings/layout/SettingsSection";
import { SettingsSubHeader } from "@/components/official/settings/layout/SettingsSubHeader";
import { useSetting } from "../hooks/useSetting";

export default function TextGenerationTab() {
  const [model, setModel] = useSetting<string>(
    "userPreferences.textGeneration.defaultModel",
  );
  const [tone, setTone] = useSetting<string>(
    "userPreferences.textGeneration.tone",
  );
  const [creativity, setCreativity] = useSetting<string>(
    "userPreferences.textGeneration.creativityLevel",
  );
  const [language, setLanguage] = useSetting<string>(
    "userPreferences.textGeneration.language",
  );
  const [plagiarism, setPlagiarism] = useSetting<boolean>(
    "userPreferences.textGeneration.plagiarismCheckEnabled",
  );

  return (
    <>
      <SettingsSubHeader
        title="Text generation"
        description="Defaults for text-generation surfaces."
        icon={Type}
      />
      <SettingsSection title="Model & style">
        <SettingsSelect
          label="Model"
          value={model}
          onValueChange={setModel}
          options={[
            { value: "GPT-4o", label: "GPT-4o" },
            { value: "GPT-4", label: "GPT-4" },
            { value: "Claude-3", label: "Claude 3" },
            { value: "Claude-3.5", label: "Claude 3.5" },
            { value: "Gemini-Pro", label: "Gemini Pro" },
            { value: "Llama-3", label: "Llama 3" },
          ]}
        />
        <SettingsSelect
          label="Tone"
          value={tone}
          onValueChange={setTone}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "professional", label: "Professional" },
            { value: "casual", label: "Casual" },
            { value: "friendly", label: "Friendly" },
            { value: "formal", label: "Formal" },
            { value: "creative", label: "Creative" },
            { value: "technical", label: "Technical" },
            { value: "persuasive", label: "Persuasive" },
          ]}
        />
        <SettingsSelect
          label="Creativity"
          value={creativity}
          onValueChange={setCreativity}
          options={[
            { value: "low", label: "Low — factual" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High — creative" },
          ]}
        />
        <SettingsSelect
          label="Language"
          value={language}
          onValueChange={setLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Spanish" },
            { value: "fr", label: "French" },
            { value: "de", label: "German" },
            { value: "it", label: "Italian" },
            { value: "pt", label: "Portuguese" },
            { value: "zh", label: "Chinese" },
            { value: "ja", label: "Japanese" },
            { value: "ko", label: "Korean" },
            { value: "ru", label: "Russian" },
          ]}
        />
        <SettingsSwitch
          label="Plagiarism check"
          description="Run output through a plagiarism check before showing it."
          checked={plagiarism}
          onCheckedChange={setPlagiarism}
          last
        />
      </SettingsSection>
    </>
  );
}
