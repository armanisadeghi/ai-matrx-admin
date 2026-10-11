/**
 * The two decisions the Google link control makes before it touches anything, kept pure so a test
 * can break them: what "Update from Google" does, and what the conflict dialog is allowed to say.
 */

export type UpdateDecision = "up_to_date" | "apply" | "conflict";

/**
 * Update from Google. Google unchanged -> nothing to do. Google changed and nothing changed here ->
 * apply it. Google changed AND something changed here -> ask; never overwrite quietly.
 */
export function decideUpdate(remoteChanged: boolean, localChanged: boolean): UpdateDecision {
  if (!remoteChanged) return "up_to_date";
  return localChanged ? "conflict" : "apply";
}

export interface ConflictCopy {
  title: string;
  description: string;
}

/** The dialog says only what is true: "both" only when both really changed. */
export function conflictCopy(noun: string, appName: string, localChanged: boolean): ConflictCopy {
  if (localChanged) {
    return {
      title: "Changed in both places",
      description: `This ${noun} and the ${appName} file both changed since the last sync. Keep which one?`,
    };
  }
  return {
    title: `Changed in ${appName}`,
    description: `The ${appName} file changed since the last sync; this ${noun} has not. Pushing would overwrite those changes. Keep which one?`,
  };
}
