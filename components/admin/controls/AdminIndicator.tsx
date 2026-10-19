// components/admin/AdminIndicator.tsx
import React, { useState } from "react";
import { useDock } from "@ai-matrx/summon/dock";
import { clientDockStore } from "@/lib/sync/dock-positions";
import SmallIndicator from "./SmallIndicator";
import MediumIndicator from "./MediumIndicator";
import LargeIndicator from "./LargeIndicator";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminDebugger } from "@/lib/redux/slices/userSlice";

type IndicatorSize = "small" | "medium" | "large";

/**
 * Floating admin chip — registered as `overlayId: "adminIndicator"` in
 * the window-panels registry. The unified renderer mounts this component
 * with `{ isOpen, onClose, ...defaultData }`. We accept the props for
 * contract conformance but the chip ignores `onClose` — closing happens
 * via `dispatch(toggleOverlay({ overlayId: "adminIndicator" }))` from
 * the sidebar / user menu.
 *
 * Self-gates on super-admin so a stray Redux dispatch by a non-admin
 * (e.g. via persisted state) cannot leak the chip into a normal user's UI.
 */
interface AdminIndicatorProps {
  isOpen?: boolean;
  // Accepted for the summon render contract; intentionally unused — the chip
  // is closed via the same toggleOverlay action used to open it.
  onClose?: () => void;
}

const AdminIndicator: React.FC<AdminIndicatorProps> = () => {
  const isSuperAdmin = useAppSelector(selectIsSuperAdminDebugger);
  const [size, setSize] = useState<IndicatorSize>("small");
  // Drag: summon's dock (pointer events, threshold, viewport clamp, window z-lane, remembered
  // position) — the chip used to hand-roll mousemove listeners that re-rendered on every move.
  const dock = useDock({
    id: "admin-indicator",
    corner: "top-left",
    defaultPosition: { x: 50, y: 5 },
    store: clientDockStore,
    zIndex: 9999,
  });
  const chromeStyle: React.CSSProperties = {
    ...dock.style,
    userSelect: "none",
    cursor: dock.dragging ? "grabbing" : "default",
    filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))",
  };
  // Size cycling functions
  const cycleSize = (direction: "up" | "down") => {
    const sizes: IndicatorSize[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(size);
    if (direction === "up") {
      const nextIndex = (currentIndex + 1) % sizes.length;
      setSize(sizes[nextIndex]);
    } else if (direction === "down") {
      const prevIndex = (currentIndex - 1 + sizes.length) % sizes.length;
      setSize(sizes[prevIndex]);
    }
  };

  // Render the appropriate indicator based on size
  const renderIndicator = () => {
    switch (size) {
      case "medium":
        return (
          <div ref={dock.ref} data-dock="admin-indicator" style={chromeStyle}>
            <MediumIndicator
              onDragStart={dock.handleProps.onPointerDown}
              onSizeUp={() => cycleSize("up")}
              onSizeDown={() => cycleSize("down")}
            />
          </div>
        );
      case "large":
        return (
          <LargeIndicator
            onSizeDown={() => setSize("medium")}
            onSizeSmall={() => setSize("small")}
          />
        );
      default: // "small" case
        return (
          <div ref={dock.ref} data-dock="admin-indicator" style={chromeStyle}>
            <SmallIndicator
              onDragStart={dock.handleProps.onPointerDown}
              onSizeChange={() => cycleSize("up")}
            />
          </div>
        );
    }
  };

  if (!isSuperAdmin) return null;

  return <>{renderIndicator()}</>;
};

export default AdminIndicator;
