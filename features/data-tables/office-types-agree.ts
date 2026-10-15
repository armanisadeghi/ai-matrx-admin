/**
 * Compile-time guard: the Office record types (hand-written in `@ai-matrx/office/core`, because a
 * package cannot import this app's generated types) must stay mutually assignable with the rows the
 * generated `Database` type says the `workbench` tables return. A migration that changes one of these
 * tables breaks `tsc` here until the package type is updated and published. No runtime.
 */
import type { Database } from "@/types/database.types";
import type { Workbook, WorkbookSnapshot, DocumentRow, DocumentSnapshot, DocumentSource, WorkbookSource } from "@ai-matrx/office/core";

type T = Database["workbench"]["Tables"];
type E = Database["public"]["Enums"];

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type MustBeTrue<X extends true> = X;

export type OfficeTypesAgree = [
  MustBeTrue<Same<Workbook, T["udt_workbooks"]["Row"]>>,
  MustBeTrue<Same<WorkbookSnapshot, T["udt_workbook_snapshots"]["Row"]>>,
  MustBeTrue<Same<DocumentRow, T["udt_documents"]["Row"]>>,
  MustBeTrue<Same<DocumentSnapshot, T["udt_document_snapshots"]["Row"]>>,
  MustBeTrue<Same<DocumentSource, E["document_source"]>>,
  MustBeTrue<Same<WorkbookSource, E["workbook_source"]>>,
];
