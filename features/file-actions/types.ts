import type { ResourceType } from "@/utils/permissions/types";
import type { ServiceResult } from "@/features/data-tables/types";
import type { FileEntityType } from "./useFileFavorites";

type Result<T> = ServiceResult<T>;

/** One downloadable format of a record; `run` throws to report failure. */
export type FileDownload = { label: string; run: () => Promise<void> };

export type FileKindAdapter<Row extends { id: string; user_id: string }> = {
  noun: "workbook" | "document";
  resourceType: ResourceType;
  entityType: FileEntityType;
  nameOf: (row: Row) => string;
  projectIdOf: (row: Row) => string | null;
  hrefFor: (id: string) => string;
  rename: (id: string, name: string) => Promise<Result<unknown>>;
  copy: (id: string, name: string) => Promise<Result<{ id: string }>>;
  move: (id: string, projectId: string | null) => Promise<Result<unknown>>;
  trash: (id: string) => Promise<Result<unknown>>;
  restore: (id: string) => Promise<Result<unknown>>;
  downloads: (id: string, name: string) => FileDownload[];
};
