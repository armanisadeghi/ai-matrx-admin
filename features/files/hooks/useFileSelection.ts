/**
 * features/files/hooks/useFileSelection.ts
 *
 * Multi-select with anchor + shift-click range semantics. Intended to drive
 * the FileList / FileTree — both share the same selection state.
 */

"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsSelected,
  selectSelectedCount,
  selectSelection,
} from "@/features/files/redux/selectors";
import { clearSelection, setSelection, toggleSelection } from "@/features/files/redux/slice";

export interface UseFileSelectionResult {
  selectedIds: string[];
  anchorId: string | null;
  isSelected: (id: string) => boolean;
  count: number;
  toggle: (id: string) => void;
  select: (ids: string[], anchorId?: string | null) => void;
  clear: () => void;
  handleClick: (
    id: string,
    event: React.MouseEvent,
    orderedIds: string[],
  ) => void;
}

export function useFileSelection(): UseFileSelectionResult {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectSelection);
  const count = useAppSelector(selectSelectedCount);

  const isSelected = useCallback(
    (id: string): boolean => selection.selectedIds.includes(id),
    [selection.selectedIds],
  );

  const toggle = useCallback(
    (id: string) => dispatch(toggleSelection({ id })),
    [dispatch],
  );

  const select = useCallback(
    (ids: string[], anchorId: string | null = null) =>
      dispatch(setSelection({ selectedIds: ids, anchorId })),
    [dispatch],
  );

  const clear = useCallback(() => dispatch(clearSelection()), [dispatch]);

  const handleClick = useCallback(
    (id: string, event: React.MouseEvent, orderedIds: string[]) => {
      const { metaKey, ctrlKey, shiftKey } = event;
      const multi = metaKey || ctrlKey;

      if (shiftKey && selection.anchorId) {
        const startIdx = orderedIds.indexOf(selection.anchorId);
        const endIdx = orderedIds.indexOf(id);
        if (startIdx === -1 || endIdx === -1) {
          dispatch(setSelection({ selectedIds: [id], anchorId: id }));
          return;
        }
        const [lo, hi] =
          startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = orderedIds.slice(lo, hi + 1);
        dispatch(
          setSelection({
            selectedIds: range,
            anchorId: selection.anchorId,
          }),
        );
        return;
      }

      if (multi) {
        dispatch(toggleSelection({ id }));
        return;
      }

      dispatch(setSelection({ selectedIds: [id], anchorId: id }));
    },
    [dispatch, selection.anchorId],
  );

  return {
    selectedIds: selection.selectedIds,
    anchorId: selection.anchorId,
    isSelected,
    count,
    toggle,
    select,
    clear,
    handleClick,
  };
}

/** Pragmatic helper: check selection membership via selector outside the hook. */
export function useIsFileSelected(id: string): boolean {
  return useAppSelector((s) => selectIsSelected(s, id));
}
