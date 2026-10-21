// components/selection-toolbar/selection-toolbar-requests.ts
//
// A door INTO the one selection toolbar from outside it: "run your own action
// <id> on the current selection" (the right-click menu's Comment asks for
// `selection:comment`, so it opens the very composer the toolbar's Comment
// opens). SelectionToolbarRoot listens; the action runs through the same
// registry and the same run path as a click on the toolbar's button.

type Listener = (actionId: string) => void;

const listeners = new Set<Listener>();

/** Ask the mounted toolbar to open on the current selection and run `actionId`. False when no toolbar is mounted. */
export function requestSelectionToolbarAction(actionId: string): boolean {
  if (listeners.size === 0) return false;
  for (const listener of [...listeners]) listener(actionId);
  return true;
}

/** SelectionToolbarRoot's subscription. Returns the unsubscribe. */
export function onSelectionToolbarActionRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
