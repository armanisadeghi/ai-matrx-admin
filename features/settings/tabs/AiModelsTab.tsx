"use client";

import { Cpu, KeyRound } from "lucide-react";
import { SettingsLink, SettingsSection, SettingsSubHeader } from "@ai-matrx/design-system/settings";
import AiModelsPreferences from "@/components/user-preferences/AiModelsPreferences";

// One heading, then the list — no bordered card around the whole screen
// (page-pass 2026-09-27: it was a box holding a box).
export default function AiModelsTab() {
  return (
    <>
      <SettingsSubHeader
        title="Models"
        description="Switch a model off to leave it out of your model pickers. Only current models are listed; retired models never appear in pickers."
        icon={Cpu}
      />
      <AiModelsPreferences />
      {/* A key saved in the Vault runs that vendor's models on it: "Your key", no model points. */}
      <SettingsSection title="Your provider keys">
        <SettingsLink
          label="OpenAI API key"
          description="OpenAI models run on your key."
          icon={KeyRound}
          href="/vault?mode=new&kind=openai_api_key"
          actionLabel="Add"
        />
        <SettingsLink
          label="Anthropic API key"
          description="Claude models run on your key."
          icon={KeyRound}
          href="/vault?mode=new&kind=anthropic_api_key"
          actionLabel="Add"
          last
        />
      </SettingsSection>
    </>
  );
}
