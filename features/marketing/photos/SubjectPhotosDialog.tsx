"use client";

/**
 * Add / remove / reorder the photos of one offering or person. The first photo is the hero (the one video clones and
 * product stills are built from). Reuses: the canonical file upload (`useFileUpload`), `InlineMediaRef` for rendering and
 * the canonical image viewer (`openImageViewer`). Storage is the brand library (`subject-photos.ts`).
 */

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/lib/redux/hooks";
import { extractErrorMessage } from "@/utils/errors";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { pythonFileInlineUrl } from "@/features/files/handler/utils/python-base";
import { fileIdToMediaRef } from "@/features/files/redux/converters";
import { openImageViewer } from "@/features/overlays/definitions/imageViewer.overlay";
import {
  addSubjectPhoto,
  listSubjectPhotos,
  moveSubjectPhoto,
  removeSubjectPhoto,
  type PhotoSubject,
} from "./subject-photos";

/** The words for a failed photo change: the database's own refusals in plain sentences, anything else as the server said it. */
export function photoFailureReason(e: unknown): string {
  const text = extractErrorMessage(e);
  if (/assert_same_org|same organi[sz]ation|23514/i.test(`${text} ${(e as { code?: unknown } | null)?.code ?? ""}`)) {
    return "The photo was stored in a different organization than this brand's, so it can't be attached. Try again.";
  }
  return text || "Try again.";
}

export const subjectPhotosKey = (s: Pick<PhotoSubject, "brandId" | "kind" | "id">) =>
  ["marketing", "subject-photos", s.brandId, s.kind, s.id] as const;

export function useSubjectPhotos(subject: PhotoSubject, enabled = true) {
  return useQuery({
    queryKey: subjectPhotosKey(subject),
    queryFn: ({ signal }) => listSubjectPhotos(subject, signal),
    enabled,
  });
}

export function SubjectPhotosDialog({
  subject,
  name,
  open,
  onOpenChange,
}: {
  subject: PhotoSubject;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useFileUpload();
  const photos = useSubjectPhotos(subject, open);
  const list = photos.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["marketing", "subject-photos", subject.brandId] });
  // A failed change says so inside the dialog (a toast can sit behind it) in a plain sentence.
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (what: string, fn: () => Promise<void>) => {
    setProblem(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      const reason = photoFailureReason(e);
      setProblem(`Could not ${what}. ${reason}`);
      toast.error(`Could not ${what}`, { description: reason });
    }
  };
  const addFiles = (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;
    void run("add the photo", async () => {
      for (const file of picked) {
        const up = await upload(
          { kind: "file", file },
          { folderPath: subject.kind === "offering" ? "Images/Products" : "Images/People", organizationId: subject.organizationId },
        );
        await addSubjectPhoto(subject, up.fileId, file.name);
      }
    });
  };
  const view = (index: number) =>
    openImageViewer(dispatch, {
      images: list.map((p) => pythonFileInlineUrl(p.fileId)),
      alts: list.map(() => name),
      initialIndex: index,
      title: name,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" data-subject-photos={subject.id}>
        <DialogHeader>
          <DialogTitle>{name}: photos</DialogTitle>
          <DialogDescription>The first photo is the main one. Clones show these.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p, i) => (
            <div key={p.asset.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/40" data-photo={p.asset.id}>
              <button type="button" className="absolute inset-0" aria-label={`View photo ${i + 1}`} onClick={() => view(i)}>
                <InlineMediaRef
                  ref={fileIdToMediaRef(p.fileId)}
                  size="fill"
                  fit="cover"
                  rounded="none"
                  fallback="icon"
                  errorFallback="icon"
                  alt={name}
                  className="absolute inset-0 h-full w-full"
                />
              </button>
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Main</span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 p-1">
                <span className="flex">
                  <Button variant="ghost" size="icon" aria-label="Move earlier" disabled={i === 0} onClick={() => void run("move the photo", () => moveSubjectPhoto(subject, p.asset.id, i - 1))}>
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Move later" disabled={i === list.length - 1} onClick={() => void run("move the photo", () => moveSubjectPhoto(subject, p.asset.id, i + 1))}>
                    <ArrowRight className="size-4" />
                  </Button>
                </span>
                <Button variant="ghost" size="icon" aria-label="Remove photo" onClick={() => void run("remove the photo", () => removeSubjectPhoto(subject, p.asset.id))}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/50"
          >
            {uploading || photos.isPending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            Add photos
          </button>
        </div>
        {problem ? <p role="alert" className="type-meta text-destructive" data-photo-problem>{problem}</p> : null}
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </DialogContent>
    </Dialog>
  );
}
