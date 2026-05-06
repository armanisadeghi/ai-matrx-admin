// features/idle-mischief/utils/isUserBusy.ts
//
// Single source of truth for "is the user actively engaged with the page
// right now, even if they aren't moving the mouse?"
//
// This is the predicate that prevents the mischief subsystem from firing
// while the user is dictating, reading, recording audio, or otherwise
// busy.
//
// Returns true if ANY of these are true:
//
//   1. An interactive element is focused: <input>, <textarea>, or any
//      contenteditable element. The user is in a typing context — they
//      may be typing, dictating into the field, or pausing to think.
//
//   2. Audio recording is in progress (`state.recordings.isRecording`).
//      The user is dictating; the speech-to-text pipeline is consuming
//      their voice and writing transcripts to the page.
//
//   3. Transcription is in progress (`state.recordings.isTranscribing`).
//      Audio just finished recording and the server is converting it; the
//      user is waiting for the transcript to land.
//
//   4. The user has an active text selection (drag-selecting text on the
//      page). Length > 0 in the document selection.
//
//   5. The page is hidden (browser tab in background). We never want to
//      start an act for a user who is on a different tab.
//
// All checks are pure reads — no side effects, no listeners, no Redux
// dispatches. Safe to call on every idle tick (4× per second).

interface RecordingsLike {
  isRecording?: boolean;
  isTranscribing?: boolean;
}

interface RootStateLike {
  recordings?: RecordingsLike;
}

export function isUserBusy(rootState: RootStateLike | null | undefined): boolean {
  if (typeof document === "undefined") return false;

  // 1. Active text-input field focus
  const ae = document.activeElement;
  if (ae && ae !== document.body) {
    const tag = ae.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return true;
    }
    if ((ae as HTMLElement).isContentEditable) {
      return true;
    }
  }

  // 2 & 3. Recording or transcribing
  const recordings = rootState?.recordings;
  if (recordings?.isRecording || recordings?.isTranscribing) {
    return true;
  }

  // 4. Active text selection
  try {
    const sel = document.getSelection();
    if (sel && sel.toString().length > 0) {
      return true;
    }
  } catch {}

  // 5. Page hidden (user on another tab)
  if (document.visibilityState === "hidden") {
    return true;
  }

  return false;
}

/**
 * Human-readable reason the predicate returned true. Used by the
 * diagnostics popover to log WHY mischief was suppressed.
 */
export function whyUserIsBusy(
  rootState: RootStateLike | null | undefined,
): string | null {
  if (typeof document === "undefined") return null;

  const ae = document.activeElement;
  if (ae && ae !== document.body) {
    const tag = ae.tagName;
    if (tag === "INPUT") return "input field focused";
    if (tag === "TEXTAREA") return "textarea focused";
    if (tag === "SELECT") return "select focused";
    if ((ae as HTMLElement).isContentEditable) {
      return "contenteditable focused";
    }
  }

  const recordings = rootState?.recordings;
  if (recordings?.isRecording) return "audio recording in progress";
  if (recordings?.isTranscribing) return "transcription in progress";

  try {
    const sel = document.getSelection();
    if (sel && sel.toString().length > 0) return "text selection active";
  } catch {}

  if (document.visibilityState === "hidden") return "tab hidden";

  return null;
}
