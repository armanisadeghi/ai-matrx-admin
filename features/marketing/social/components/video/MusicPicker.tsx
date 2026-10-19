"use client";

/**
 * The Music control of a video: None, a bed made from a mood and a tempo, or the person's own track. It shows the
 * choice's name live as it is picked. The same control sits on the clone brief, the format form and the project page.
 */

import { useState } from "react";
import { Upload } from "lucide-react";

import { Badge, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";

import { DEFAULT_BED, MOOD_OPTIONS, NO_MUSIC, TEMPO_OPTIONS, musicName, musicSound, type MusicChoice } from "../../video/music";
import { uploadBriefFile } from "../../video/upload";
import { FilePickButton } from "./StudioParts";

const KINDS = [
  { value: "none", label: "None" },
  { value: "bed", label: "Mood + tempo" },
  { value: "file", label: "My own track" },
];

export function MusicPicker({
  value,
  onChange,
  disabled,
  label = "Music",
}: {
  value: MusicChoice;
  onChange: (next: MusicChoice) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  // The last own track stays picked while the person looks at the other kinds.
  const [lastFile, setLastFile] = useState<Extract<MusicChoice, { kind: "file" }> | null>(value.kind === "file" ? value : null);

  const pickKind = (kind: string) => {
    if (kind === "none") onChange(NO_MUSIC);
    else if (kind === "bed") onChange(value.kind === "bed" ? value : DEFAULT_BED);
    else if (lastFile) onChange(lastFile);
    else onChange({ kind: "file", file: { fileId: "", contentHash: "" }, name: "" });
  };

  const upload = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const made = await uploadBriefFile(f, "Video/Music");
      const next = { kind: "file", file: made, name: f.name } as const;
      setLastFile(next);
      onChange(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const fileReady = value.kind === "file" && value.file.fileId !== "";
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl aria-label={label} value={value.kind} onValueChange={pickKind} data={KINDS.map((option) => ({ ...option, disabled }))} />
      {value.kind === "bed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Music mood"
            value={value.mood}
            disabled={disabled}
            onValueChange={(mood) => onChange({ ...value, mood: mood as typeof value.mood })}
            options={MOOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Select
            aria-label="Music tempo"
            value={value.tempo}
            disabled={disabled}
            onValueChange={(tempo) => onChange({ ...value, tempo: tempo as typeof value.tempo })}
            options={TEMPO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      ) : null}
      {value.kind === "file" ? (
        <div className="flex items-center gap-2">
          <FilePickButton accept="audio/*" icon={<Upload />} disabled={disabled || uploading} onFiles={(f) => void upload(f)}>
            {fileReady ? "Replace track" : "Upload a track"}
          </FilePickButton>
          {uploading ? <span className="type-meta text-muted-foreground">Uploading…</span> : null}
        </div>
      ) : null}
      {value.kind === "bed" || fileReady ? (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <Badge tone="success">{musicName(value)}</Badge>
          {musicSound(value) ? <span className="type-meta text-muted-foreground">{musicSound(value)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
