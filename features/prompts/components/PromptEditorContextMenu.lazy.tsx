"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

interface PromptEditorContextMenuLazyProps {
  getTextarea: () => HTMLTextAreaElement | null;
  children: React.ReactNode;
  onContentInserted?: () => void;
  useDatabase?: boolean;
  quickAccessBlocks?: string[];
  className?: string;
}

const PromptEditorContextMenuImpl = dynamic(
  () =>
    import("./PromptEditorContextMenu").then((m) => m.PromptEditorContextMenu),
  { ssr: false },
);

export const PromptEditorContextMenu: React.FC<
  PromptEditorContextMenuLazyProps
> = ({ children, ...rest }) => {
  const [activated, setActivated] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const pendingEventRef = useRef<{ x: number; y: number } | null>(null);

  // Once the real component mounts, replay the captured right-click so the
  // menu opens at the original cursor position without a second interaction.
  useEffect(() => {
    if (!activated || !pendingEventRef.current) return;

    const { x, y } = pendingEventRef.current;
    pendingEventRef.current = null;

    // Wait one frame for the real ContextMenuTrigger to attach its listeners.
    const frame = requestAnimationFrame(() => {
      const target =
        wrapperRef.current?.firstElementChild ?? wrapperRef.current;
      target?.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 2,
        }),
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [activated]);

  if (activated) {
    return (
      <PromptEditorContextMenuImpl {...rest}>
        {children}
      </PromptEditorContextMenuImpl>
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    pendingEventRef.current = { x: e.clientX, y: e.clientY };
    // Kick off the dynamic import now; the effect above will replay the event
    // once the real component has mounted.
    import("./PromptEditorContextMenu").then(() => {
      setActivated(true);
    });
  };

  return (
    <span
      ref={wrapperRef}
      onContextMenu={handleContextMenu}
      className="contents"
    >
      {children}
    </span>
  );
};
