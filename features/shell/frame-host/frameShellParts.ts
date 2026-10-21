// The shell parts both shells render — AppShell renders these plus its classic-only ones; FrameShell
// renders exactly these. Plain data (the parity test imports it without the server-only FrameShell).
/** The shell parts both shells render (AppShell renders these plus its classic-only ones). */
export const FRAME_SHARED_SHELL_PARTS = [
  "Providers",
  "SettingsRouteProvider",
  "VisualViewportSync",
  "FloatingClearanceSync",
  "ShellLayoutSync",
  "DeferredIslands",
] as const;
