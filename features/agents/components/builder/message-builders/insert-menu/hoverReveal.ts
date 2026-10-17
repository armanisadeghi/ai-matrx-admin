/**
 * A message header's controls rest hidden: only the role and the view menu
 * show until the message is hovered or holds focus. An open menu keeps its
 * trigger shown; a touch screen has no hover, so there they always show.
 */
export const HOVER_REVEAL =
  "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 pointer-coarse:opacity-100";
