"use client";

import { FilePlus2, LibraryBig } from "lucide-react";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { EducationToolHeader } from "@/features/education/components/EducationToolHeader";
import { educationLibraryListConfig } from "../listConfig";
import { EDUCATION_LIBRARY_SURFACE } from "../librarySurface";

export function EducationLibraryPage() {
  // One action list: the list header draws each verb, the frame's "…" carries every one; the primary
  // (Create kit) is also the empty state's door.
  const actions: ListPageAction[] = [
    { id: "community", label: "Community", icon: LibraryBig, href: "/education/library/community" },
    { id: "create", label: "Create kit", icon: FilePlus2, href: "/education/kits/new", primary: true },
  ];

  return (
    <div className="h-full [--shell-header-h:0px]">
      {/* Every other education tool home carries its identity through
          EducationToolHeader; the Library list rendered with no page title
          anywhere at all (page-pass 2026-09-28) — nothing in the shell
          header, nothing in the body. `EntityListPage` never renders one
          itself (see its header doctrine), so this was the missing piece. */}
      <EducationToolHeader title="Library" />
      <EntityListPage
        config={educationLibraryListConfig}
        // Agent surface `matrx-user/education-library`: what the list shows +
        // the `library_view` write (features/education/library/librarySurface.ts).
        surface={EDUCATION_LIBRARY_SURFACE}
        actions={actions}
      />
    </div>
  );
}
