import type { DocumentSource } from "@/features/data-tables/types";

const SOURCE_LABELS: Record<DocumentSource, string> = {
  created: "Created",
  imported_docx: "Imported DOCX",
  imported_md: "Imported Markdown",
  imported_txt: "Imported Text",
  linked_gdoc: "Imported from Google Docs",
};

export function documentSourceLabel(source: DocumentSource): string {
  return SOURCE_LABELS[source] ?? source;
}
