/**
 * Tray layout constants.
 *
 * Hardcoded previously inside `windowManagerSlice.ts` and `WindowTray.tsx`.
 * Centralised here so the mobile-responsive sizing path can derive chip
 * dimensions from a single source.
 *
 * Note: `windowManagerSlice` re-exports `TRAY_CHIP_W` and `TRAY_CHIP_H` for
 * backward compatibility — external consumers should still import from here
 * going forward.
 */

/** Desktop chip width in px. */
export const TRAY_CHIP_W_DESKTOP = 270;

/** Desktop chip height in px. */
export const TRAY_CHIP_H_DESKTOP = 100;

/** Horizontal gap between chips. */
export const TRAY_GAP_X = 8;

/** Vertical gap between rows of chips. */
export const TRAY_GAP_Y = 8;

/**
 * Mobile chip width target. The tray becomes a horizontal-scroll strip on
 * mobile, so the width is a target upper bound clamped against the viewport.
 */
export const TRAY_CHIP_W_MOBILE_MAX = 180;

/** Mobile chip height — slightly shorter to fit tight screens. */
export const TRAY_CHIP_H_MOBILE = 72;

/** Viewport width below which the mobile tray layout takes over. */
export const TRAY_MOBILE_BREAKPOINT = 768;

/**
 * Compute the chip width for a given viewport. On mobile, fits ~2 chips
 * across with safe-area padding; never exceeds the desktop size on wider
 * screens.
 */
export function computeTrayChipWidth(viewportWidth: number): number {
  if (viewportWidth < TRAY_MOBILE_BREAKPOINT) {
    return Math.min(
      TRAY_CHIP_W_MOBILE_MAX,
      Math.max(120, Math.floor(viewportWidth / 2) - 24),
    );
  }
  return TRAY_CHIP_W_DESKTOP;
}

/** Chip height for a given viewport. */
export function computeTrayChipHeight(viewportWidth: number): number {
  return viewportWidth < TRAY_MOBILE_BREAKPOINT
    ? TRAY_CHIP_H_MOBILE
    : TRAY_CHIP_H_DESKTOP;
}
