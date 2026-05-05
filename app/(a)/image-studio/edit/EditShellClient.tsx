"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ImageSource } from "@/features/image-studio/modes/shared/types";
import { ModeImagePicker } from "../_shared/ModeImagePicker";

const EditModeShell = dynamic(
  () =>
    import("@/features/image-studio/modes/edit/EditModeShell").then((m) => ({
      default: m.EditModeShell,
    })),
  { ssr: false },
);

interface Props {
  urlParam: string | null;
  cloudFileId: string | null;
  folder?: string;
}

export default function EditShellClient({
  urlParam,
  cloudFileId,
  folder,
}: Props) {
  const initial = useMemo<ImageSource | null>(() => {
    if (urlParam) return { kind: "url", url: urlParam };
    if (cloudFileId) return { kind: "cloudFileId", cloudFileId };
    return null;
  }, [urlParam, cloudFileId]);

  const [source, setSource] = useState<ImageSource | null>(initial);

  if (!source) {
    return (
      <ModeImagePicker
        title="Pick an image to edit"
        onPick={(file) => setSource({ kind: "file", file })}
      />
    );
  }

  return (
    <EditModeShell
      source={source}
      defaultFolder={folder ?? "Images/Edited"}
      presentation="page"
    />
  );
}
