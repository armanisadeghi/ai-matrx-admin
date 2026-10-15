/**
 * Where a One Tap sign-in lands: a FULL document load, so every server-rendered and client-held piece
 * of the page reads the new session (the same reason password login lands through HardRedirectForm).
 * The current page reloads in place; the auth pages pass the destination the person was headed for.
 */
export function landAfterSignIn(destination?: string): void {
  if (destination) window.location.assign(destination);
  else window.location.reload();
}
