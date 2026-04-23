"use client";

import { Camera } from "lucide-react";
import {
  SettingsSwitch,
  SettingsSelect,
  SettingsSection,
  SettingsSubHeader,
} from "@/components/official/settings";
import { useSetting } from "../hooks/useSetting";

export default function PhotoEditingTab() {
  const [filter, setFilter] = useSetting<string>(
    "userPreferences.photoEditing.defaultFilter",
  );
  const [resolution, setResolution] = useSetting<string>(
    "userPreferences.photoEditing.resolution",
  );
  const [aspectRatio, setAspectRatio] = useSetting<string>(
    "userPreferences.photoEditing.defaultAspectRatio",
  );
  const [autoEnhance, setAutoEnhance] = useSetting<boolean>(
    "userPreferences.photoEditing.autoEnhance",
  );
  const [watermark, setWatermark] = useSetting<boolean>(
    "userPreferences.photoEditing.watermarkEnabled",
  );

  return (
    <>
      <SettingsSubHeader
        title="Photo editing"
        description="Defaults for the photo editor."
        icon={Camera}
      />
      <SettingsSection title="Filters & export">
        <SettingsSelect
          label="Default filter"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "none", label: "None" },
            { value: "vivid", label: "Vivid" },
            { value: "warm", label: "Warm" },
            { value: "cool", label: "Cool" },
            { value: "black-white", label: "Black & white" },
            { value: "sepia", label: "Sepia" },
            { value: "vintage", label: "Vintage" },
            { value: "dramatic", label: "Dramatic" },
          ]}
        />
        <SettingsSelect
          label="Export resolution"
          value={resolution}
          onValueChange={setResolution}
          options={[
            { value: "original", label: "Original" },
            { value: "4k", label: "4K" },
            { value: "1080p", label: "1080p" },
            { value: "720p", label: "720p" },
            { value: "480p", label: "480p" },
          ]}
        />
        <SettingsSelect
          label="Aspect ratio"
          value={aspectRatio}
          onValueChange={setAspectRatio}
          options={[
            { value: "original", label: "Original" },
            { value: "16:9", label: "16 : 9" },
            { value: "4:3", label: "4 : 3" },
            { value: "1:1", label: "1 : 1" },
            { value: "9:16", label: "9 : 16" },
            { value: "3:2", label: "3 : 2" },
            { value: "21:9", label: "21 : 9" },
          ]}
        />
      </SettingsSection>
      <SettingsSection title="Processing">
        <SettingsSwitch
          label="Auto-enhance"
          description="Apply automatic exposure and colour correction on import."
          checked={autoEnhance}
          onCheckedChange={setAutoEnhance}
        />
        <SettingsSwitch
          label="Watermark"
          description="Add a subtle watermark to exported images."
          checked={watermark}
          onCheckedChange={setWatermark}
          last
        />
      </SettingsSection>
    </>
  );
}
