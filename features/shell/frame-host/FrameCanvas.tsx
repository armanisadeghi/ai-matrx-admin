"use client";

// THE CANVAS IN THE NEW APP FRAME — the frame's `loadCanvas` module, loaded only when the canvas is
// first opened (FrameHostImpl's `import("./FrameCanvas")`), then kept mounted. The canvas itself is
// the classic shell's too (`ShellCanvasBody`: surface scope, write handlers, the package column);
// the frame owns width and placement; the column's own pane header (tabs, Expand, Close) is the ONE
// title row — the frame draws none around a loaded canvas.
import { ShellCanvasBody } from "@/features/canvas/host/ShellCanvasBody";
import type { CanvasProps } from "@/features/shell/frame/types";

export default function FrameCanvas(_: CanvasProps) {
  return <ShellCanvasBody placement="fill" className="h-full" />;
}
