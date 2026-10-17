/**
 * A RESTORED CANVAS RESERVES ITS COLUMN AT FIRST PAINT — the page never moves when it lands.
 *
 * The canvas remembers being open (localStorage, `CANVAS_STORAGE_KEY`), but its state hydrates
 * only after the client boots, seconds in on a loaded machine. Until then the shell drew full
 * width, and the restored column then pushed the page left (CLS 0.086 on /chat/new, review
 * 2026-10-16). This inline script runs during HTML parse, before the first paint: when the saved
 * canvas will come back open, it sets `--shell-canvas-w` to the width the column will take (the
 * same fit as `fitCanvasWidth` with the web rules) and draws a plain column placeholder
 * (`data-canvas-reserved`, canvas-host.css). ShellCanvasColumn takes over once the state hydrates.
 *
 * Mirrors the restore rules: phones never restore the canvas open; a fullscreen canvas covers the
 * app instead of insetting it; a canvas holding only launcher tabs closes on restore.
 * Guard: `pnpm check:smoke --restored`.
 */
import {
  CANVAS_LAUNCHER_KIND,
  CANVAS_PHONE_MAX_WIDTH,
  CANVAS_STORAGE_KEY,
  CANVAS_WEB_LAYOUT_RULES,
} from "@ai-matrx/canvas";

const rules = CANVAS_WEB_LAYOUT_RULES;

export const CANVAS_PREPAINT_SCRIPT = `(function(){try{
if(window.innerWidth<=${CANVAS_PHONE_MAX_WIDTH})return;
var s=JSON.parse(localStorage.getItem(${JSON.stringify(CANVAS_STORAGE_KEY)})||"null");
if(!s||!s.isOpen||s.isFullscreen)return;
var items=s.items||{};
if(!Object.keys(items).some(function(k){return items[k]&&items[k].kind!==${JSON.stringify(CANVAS_LAUNCHER_KIND)}}))return;
var m=document.querySelector(".shell-main");
var region=m?Math.round(window.innerWidth-m.getBoundingClientRect().left):window.innerWidth;
var d=${JSON.stringify(rules.defaultWidth)};
var want=typeof s.width==="number"?s.width:(typeof d==="number"?d:Math.round(region*d.fraction));
var w=region<=0?Math.max(${rules.minWidth},want):Math.max(${rules.minWidth},Math.min(want,region-${rules.centreMinWidth}));
var r=document.documentElement;
r.style.setProperty("--shell-canvas-w",w+"px");
r.setAttribute("data-canvas-open","");
r.setAttribute("data-canvas-reserved","");
}catch(_){}})()`;

/** Render right after the page's main column (it measures `.shell-main`), before the canvas column. */
export function CanvasPrepaintScript() {
  return <script dangerouslySetInnerHTML={{ __html: CANVAS_PREPAINT_SCRIPT }} />;
}
