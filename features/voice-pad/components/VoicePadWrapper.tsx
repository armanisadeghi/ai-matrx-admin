"use client";

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";

const VoicePad = dynamic(() => import("./VoicePad"), { ssr: false });

export default function VoicePadWrapper() {
  const isOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "voicePad"),
  );

  if (!isOpen) return null;

  return <VoicePad />;
}
