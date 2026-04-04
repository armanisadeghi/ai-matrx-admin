"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  toggleOverlay,
  openOverlay,
  closeOverlay,
  selectIsOverlayOpen,
} from "@/lib/redux/slices/overlaySlice";

export function useVoicePad() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "voicePad"),
  );

  const toggle = useCallback(() => {
    dispatch(toggleOverlay({ overlayId: "voicePad" }));
  }, [dispatch]);

  const open = useCallback(() => {
    dispatch(openOverlay({ overlayId: "voicePad" }));
  }, [dispatch]);

  const close = useCallback(() => {
    dispatch(closeOverlay({ overlayId: "voicePad" }));
  }, [dispatch]);

  return { isOpen, toggle, open, close };
}
