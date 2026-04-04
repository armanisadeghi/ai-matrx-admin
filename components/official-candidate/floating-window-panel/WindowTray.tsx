"use client";

/**
 * WindowTray — no longer needed.
 *
 * Minimized chips are now rendered directly by each WindowPanel instance
 * (portalled to document.body) and use the same drag system as the normal
 * windowed state.  This file is kept as a harmless no-op so any existing
 * imports don't break.
 */

export function WindowTray() {
  return null;
}

export default WindowTray;
