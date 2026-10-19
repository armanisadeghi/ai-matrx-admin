"use client";

import { useEffect, useState } from "react";

import { canActOn } from "@/features/access-gate/service/canActOn";

/**
 * Whether this person may comment on a record: an editor can, and so can anyone shared in at Comment. A commenter's
 * anchor travels as an anchor-only op that the door accepts (content.collab_append); typing stays refused.
 */
export function useCommentAccess(token: "udt_document" | "workbook", id: string, editable: boolean): boolean {
  const [commenter, setCommenter] = useState(false);
  useEffect(() => {
    if (editable) return undefined;
    let live = true;
    void canActOn(token, id, "commenter").then(
      (ok) => live && setCommenter(!!ok),
      () => live && setCommenter(false),
    );
    return () => {
      live = false;
    };
  }, [token, id, editable]);
  return editable || commenter;
}
