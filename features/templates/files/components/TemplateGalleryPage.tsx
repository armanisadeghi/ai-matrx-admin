"use client";

/** The full-page template gallery (Google's /templates): /workbooks/templates and /documents/templates. */
import type { ReactNode } from "react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import type { TemplateKind } from "../types";
import { TemplateGallery } from "./TemplateGallery";

export function TemplateGalleryPage({ kind }: { kind: TemplateKind }): ReactNode {
  const parent = kind === "workbook" ? { label: "Workbooks", href: "/workbooks" } : { label: "Documents", href: "/documents" };
  return (
    <>
      <RecordPageHeader parents={[parent]} record={{ name: "Template gallery" }} />
      <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8">
          <TemplateGallery kind={kind} />
        </div>
      </div>
    </>
  );
}
