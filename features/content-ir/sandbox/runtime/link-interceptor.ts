/**
 * link-interceptor — plain `<a href>` works inside the sealed frame.
 *
 * The frame is `sandbox="allow-scripts"` only: no `allow-popups` (so
 * `target="_blank"` is blocked) and no top navigation (a plain click would
 * navigate the FRAME — a relative in-app link would load the whole app inside
 * it). Instead of asking authors to learn a frame-only call, this listener
 * turns every anchor click into the host action `open_url` over the existing
 * bridge, so the link opens in a new tab on the PAGE's side — the same way it
 * does when the component is not framed.
 *
 * Rules:
 *  - bubble phase on `document`, so an author's own `onClick` that calls
 *    `preventDefault()` keeps full control (we skip a defaultPrevented click);
 *  - primary click and middle click (`auxclick`) both open; modifier keys all
 *    mean "new tab" already, so they open the same tab — nothing is lost;
 *  - `#fragment` links and `download` anchors are left to the browser
 *    (they stay inside the frame and need no popup);
 *  - the host decides what may open (`open_url` refuses `javascript:`/`data:`);
 *    a refusal is never silent — it is warned in the frame console and the
 *    anchor is marked `data-matrx-link-refused`.
 */
import { requestHostAction, type HostActionResult } from "./host-action-relay";

export const OPEN_URL_ACTION_KEY = "open_url";

type Request = (key: string, input: unknown) => Promise<HostActionResult>;

function anchorFor(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null;
    const a = target.closest("a[href]");
    return a instanceof HTMLAnchorElement || (a && a.tagName.toLowerCase() === "a")
        ? (a as HTMLAnchorElement)
        : null;
}

/** True when the browser should keep handling the click itself. */
function leftToBrowser(a: HTMLAnchorElement, href: string): boolean {
    if (a.hasAttribute("download")) return true;
    return href.trim().startsWith("#");
}

export function installLinkInterceptor(
    doc: Document = document,
    request: Request = requestHostAction,
): () => void {
    const handle = (event: Event): void => {
        const mouse = event as MouseEvent;
        if (event.defaultPrevented) return;
        // `click` is the primary button (and keyboard activation); `auxclick`
        // fires for the others — only the middle one means "open".
        if (event.type === "auxclick" && mouse.button !== 1) return;
        if (event.type === "click" && mouse.button !== 0) return;
        const a = anchorFor(event.target);
        if (!a) return;
        const href = a.getAttribute("href") ?? "";
        if (!href.trim() || leftToBrowser(a, href)) return;

        event.preventDefault();
        void request(OPEN_URL_ACTION_KEY, { url: href }).then((result) => {
            if (result.ok) {
                a.removeAttribute("data-matrx-link-refused");
                return;
            }
            a.setAttribute("data-matrx-link-refused", "true");
            // eslint-disable-next-line no-console
            console.warn(`[kind-sandbox] link not opened: ${result.error ?? "refused"}`);
        });
    };
    doc.addEventListener("click", handle);
    doc.addEventListener("auxclick", handle);
    return () => {
        doc.removeEventListener("click", handle);
        doc.removeEventListener("auxclick", handle);
    };
}
