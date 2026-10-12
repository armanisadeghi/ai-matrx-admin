/**
 * The two homes built from one component set (`FileHome`): what differs between the Workbooks
 * home (Google Sheets' twin) and the Documents home (Google Docs' twin) is only this.
 */

import type { ComponentType } from "react";
import { FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { GoogleDocsMark, GoogleSheetsMark } from "@/features/google-workspace/linked/marks";
import { GoogleSlidesLogo } from "@/components/icons/google-brand";
import type { FileEntityType } from "../useFileFavorites";

export interface HomeKind {
  kind: "workbook" | "document" | "presentation";
  /** The entity-registry token (row doors, peek). */
  token: "workbook" | "udt_document" | "presentation";
  entityType: FileEntityType;
  /** "workbook" / "document" — the band title ("Start a new workbook"); our lexicon, not Google's "spreadsheet". */
  startNoun: string;
  /** "workbooks" / "documents" — the Recent heading and the search box. */
  pluralNoun: string;
  href: (id: string) => string;
  Icon: ComponentType<{ className?: string }>;
  /** The kind icon's colour (Sheets green, Docs blue, Slides amber). */
  iconTone: string;
  GoogleMark: ComponentType<{ className?: string }>;
  googleApp: string;
}

export const WORKBOOK_HOME: HomeKind = {
  kind: "workbook",
  token: "workbook",
  entityType: "workbook",
  startNoun: "workbook",
  pluralNoun: "workbooks",
  href: (id) => `/workbooks/${id}`,
  Icon: FileSpreadsheet,
  iconTone: "text-success",
  GoogleMark: GoogleSheetsMark,
  googleApp: "Google Sheets",
};

export const DOCUMENT_HOME: HomeKind = {
  kind: "document",
  token: "udt_document",
  entityType: "udt_document",
  startNoun: "document",
  pluralNoun: "documents",
  href: (id) => `/documents/${id}`,
  Icon: FileText,
  iconTone: "text-info",
  GoogleMark: GoogleDocsMark,
  googleApp: "Google Docs",
};

export const PRESENTATION_HOME: HomeKind = {
  kind: "presentation",
  token: "presentation",
  entityType: "presentation",
  startNoun: "presentation",
  pluralNoun: "presentations",
  href: (id) => `/presentations/${id}`,
  Icon: Presentation,
  iconTone: "text-warning",
  GoogleMark: GoogleSlidesLogo,
  googleApp: "Google Slides",
};
