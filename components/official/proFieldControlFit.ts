/**
 * THE ONE FITTING RULE for ProInput and ProTextarea's controls (2026-10-15).
 *
 * A writing field's controls never take the room the text needs, and a control
 * that does not fit is never deleted — it moves inside "…". Until this module
 * each field had its own step-down rule: ProInput dropped its mic AND its "…"
 * outright below ~220px when it also had Clear + Send (voice, copy, clean-up and
 * read-aloud became unreachable), and on a phone a 110px field kept two letters
 * of text beside Clear and Send.
 *
 * The rule:
 *  - REQUIRED controls always show: Send (the field's action) and "…" whenever
 *    it holds anything.
 *  - OPTIONAL controls show in priority order while the text keeps its floor;
 *    the rest go inside "…". Folding runs from the lowest priority up: Expand,
 *    then Clear, then the mic's device chooser, then the mic itself.
 *  - On a phone the device chooser never sits beside the mic (Arman,
 *    2026-10-15): it is always inside "…" as "Microphone".
 *  - A live recording always keeps its stop button inline (the caller forces it).
 *
 * Widths are the real rendered footprints per pointer and density (measured
 * 2026-10-15 on a fine pointer and a 375px phone), so a phone folds earlier
 * instead of being crushed.
 */

export type FoldableControl = "mic" | "clear" | "expand";

/** How the mic shows: inline with its device chooser, inline alone, inside "…", or not offered. */
export type MicFit = "with-chooser" | "alone" | "folded" | "none";

export interface ControlSizes {
  /** One tap box (Send, "…", Clear, Expand). */
  box: number;
  /** The mic capsule with its device chevron, margins included. */
  micWithChooser: number;
  /** The mic capsule alone, margins included. */
  micAlone: number;
}

/** 38px tap box; the mic capsule's own 3px margins included. */
export const FINE_SIZES: ControlSizes = { box: 38, micWithChooser: 50, micAlone: 34 };
/** Touch: the tap box keeps 38px of layout (the 44px hit area is invisible); the mic capsule pads out. */
export const COARSE_SIZES: ControlSizes = { box: 38, micWithChooser: 70, micAlone: 46 };
/** The dense field scope (`data-matrx-tap-dense`): a 24px pill in a 28px box. */
export const DENSE_SIZES: ControlSizes = { box: 28, micWithChooser: 44, micAlone: 30 };

export function controlSizes(opts: { coarse: boolean; dense: boolean }): ControlSizes {
  if (opts.dense) return DENSE_SIZES;
  return opts.coarse ? COARSE_SIZES : FINE_SIZES;
}

/** Below this field height the controls take the dense 28px size. */
export const DENSE_FIELD_MAX_HEIGHT_PX = 34;

export function isDenseField(fieldHeight: number): boolean {
  return fieldHeight > 0 && fieldHeight < DENSE_FIELD_MAX_HEIGHT_PX;
}

/**
 * The text's floor: half the field, never more than 140px and never less than
 * 48px (about five characters).
 */
export function minTextPx(fieldWidth: number): number {
  return Math.max(48, Math.min(140, Math.round(fieldWidth * 0.5)));
}

export interface FitRequest {
  /** The field's measured width; 0 = not measured yet (first paint, jsdom) → everything that may be inline is. */
  fieldWidth: number;
  sizes: ControlSizes;
  /** Space the field always spends outside the controls: its left padding, a start icon, the text gap. */
  fixedPx?: number;
  /** The text floor; defaults to `minTextPx(fieldWidth)`. A reserved control row passes 0. */
  minText?: number;
  hasSubmit: boolean;
  /** The "…" menu has items of its own (copy, clean-up, read-aloud, agents…). */
  menuHasOwnItems: boolean;
  /** The field offers voice input. */
  mic: boolean;
  /** The device chooser may sit beside the mic (false on a phone). Default true. */
  chooserMayBeInline?: boolean;
  /** Clear is offered right now (the field has text). */
  clear: boolean;
  /** Expand is offered right now (the text overflows the box). */
  expand: boolean;
}

export interface FitResult {
  mic: MicFit;
  clearInline: boolean;
  expandInline: boolean;
  /** Controls that live inside "…" because they did not fit. */
  folded: FoldableControl[];
  /** The device chooser is inside "…" (the mic is not inline with its chevron). */
  chooserInMenu: boolean;
  /** "…" shows: it has its own items or holds a folded control or the chooser. */
  showMenu: boolean;
  /** Width every inline control takes together, px. */
  inlineWidth: number;
}

export function fitFieldControls(req: FitRequest): FitResult {
  const { sizes } = req;
  const folded: FoldableControl[] = [];
  const chooserMayBeInline = req.chooserMayBeInline ?? true;
  let mic: MicFit = !req.mic ? "none" : chooserMayBeInline ? "with-chooser" : "alone";
  let clearInline = req.clear;
  let expandInline = req.expand;

  const menuWillShow = () =>
    req.menuHasOwnItems || folded.length > 0 || (req.mic && mic !== "with-chooser");
  const width = () =>
    (req.hasSubmit ? sizes.box : 0) +
    (menuWillShow() ? sizes.box : 0) +
    (mic === "with-chooser" ? sizes.micWithChooser : mic === "alone" ? sizes.micAlone : 0) +
    (clearInline ? sizes.box : 0) +
    (expandInline ? sizes.box : 0);

  if (req.fieldWidth > 0) {
    const floor = req.minText ?? minTextPx(req.fieldWidth);
    const room = req.fieldWidth - (req.fixedPx ?? 0) - floor;
    const steps: Array<() => void> = [
      () => {
        if (expandInline) {
          expandInline = false;
          folded.push("expand");
        }
      },
      () => {
        if (clearInline) {
          clearInline = false;
          folded.push("clear");
        }
      },
      () => {
        if (mic === "with-chooser") mic = "alone";
      },
      () => {
        if (mic === "alone") {
          mic = "folded";
          folded.push("mic");
        }
      },
    ];
    for (const step of steps) {
      if (width() <= room) break;
      step();
    }
  }

  return {
    mic,
    clearInline,
    expandInline,
    folded,
    chooserInMenu: req.mic && mic !== "with-chooser",
    showMenu: menuWillShow(),
    inlineWidth: width(),
  };
}
