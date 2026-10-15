// domain-panel-width — the person's dragged width of the sidebar's domain panel (the chats list
// beside the icon strip). Stored in localStorage and published as `--shell-domain-panel-w-user`
// on <html> by an inline script before first paint, so a saved width never shifts the layout on load.
// styles/shell.css reads it with a 15rem fallback.

export const DOMAIN_PANEL_STORAGE_KEY = "matrx:domain-panel-w";
export const DOMAIN_PANEL_VAR = "--shell-domain-panel-w-user";
export const DOMAIN_PANEL_MIN_PX = 192;
export const DOMAIN_PANEL_MAX_PX = 480;

/** Runs before the sidebar paints; must never throw. */
export const DOMAIN_PANEL_PREPAINT_SCRIPT = `(function(){try{var w=parseInt(window.localStorage.getItem(${JSON.stringify(DOMAIN_PANEL_STORAGE_KEY)}),10);if(w>=${DOMAIN_PANEL_MIN_PX}&&w<=${DOMAIN_PANEL_MAX_PX}){document.documentElement.style.setProperty(${JSON.stringify(DOMAIN_PANEL_VAR)},w+"px");}}catch(_){}})();`;

export function clampDomainPanelWidth(px: number): number {
  return Math.min(DOMAIN_PANEL_MAX_PX, Math.max(DOMAIN_PANEL_MIN_PX, Math.round(px)));
}

/** Remember a width (null forgets it, back to the default). */
export function rememberDomainPanelWidth(px: number | null): void {
  try {
    if (px === null) window.localStorage.removeItem(DOMAIN_PANEL_STORAGE_KEY);
    else window.localStorage.setItem(DOMAIN_PANEL_STORAGE_KEY, String(clampDomainPanelWidth(px)));
  } catch {
    // Storage blocked: the width simply resets on reload.
  }
}
