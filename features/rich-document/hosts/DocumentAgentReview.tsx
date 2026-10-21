"use client";

// features/rich-document/hosts/DocumentAgentReview.tsx
//
// A text field's AI powers (Clean up, Help with this…, Custom agent) on a RENDERED document: the
// chat package's review-and-apply window (window-panels/windows/text-review/DocumentAgentReview —
// the same body Matrx 2 opens from an answer's menu), bound to the web's edit port. The port adds
// what only the web's sources need on top of each source's own save adapter: a note's revision
// receipt, partial-save and post-acknowledgement recovery (../actions/handlers/preparedEdit).

import * as React from "react";
import {
  DocumentAgentReview as PackageDocumentAgentReview,
  type DocumentAgentReviewProps as PackageDocumentAgentReviewProps,
} from "@ai-matrx/chat/window-panels/windows/text-review/DocumentAgentReview";
import type { PreparedEditPort } from "@ai-matrx/chat/window-panels/windows/text-review/prepared-edit";
import {
  acknowledgedPreparedSource,
  prepareContentEdit,
  savePreparedContentEdit,
} from "../actions/handlers/preparedEdit";

/** The web's edit port: notes carry revision receipts; every other source is its adapter. */
export const webPreparedEditPort: PreparedEditPort = {
  prepare: prepareContentEdit,
  save: savePreparedContentEdit,
  acknowledged: acknowledgedPreparedSource,
};

export type DocumentAgentReviewProps = Omit<PackageDocumentAgentReviewProps, "editPort">;

export function DocumentAgentReview(props: DocumentAgentReviewProps): React.ReactElement {
  return <PackageDocumentAgentReview {...props} editPort={webPreparedEditPort} />;
}

export default DocumentAgentReview;
