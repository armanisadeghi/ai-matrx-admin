/**
 * features/files/hooks/useFileNode.ts
 *
 * Ergonomic accessor for a single file record. Returns the domain fields +
 * runtime metadata + convenience booleans.
 */

"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectFileById,
  selectFileIsDirty,
  selectFileIsLoading,
  selectFileError,
  selectFilePendingRequestIds,
} from "../redux/selectors";
import type { CloudFileRecord } from "../types";

export interface UseFileNodeResult {
  file: CloudFileRecord | undefined;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  hasPendingWrites: boolean;
}

export function useFileNode(fileId: string): UseFileNodeResult {
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const isDirty = useAppSelector((s) => selectFileIsDirty(s, fileId));
  const isLoading = useAppSelector((s) => selectFileIsLoading(s, fileId));
  const error = useAppSelector((s) => selectFileError(s, fileId));
  const pendingIds = useAppSelector((s) =>
    selectFilePendingRequestIds(s, fileId),
  );
  return {
    file,
    isDirty,
    isLoading,
    error,
    hasPendingWrites: pendingIds.length > 0,
  };
}
