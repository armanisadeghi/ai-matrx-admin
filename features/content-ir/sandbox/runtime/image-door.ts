/**
 * image-door — a shape's remote `<img>` loads through the platform image door.
 *
 * The frame's CSP `img-src` is `data: blob:` plus `/api/image-proxy`
 * (app/kind-sandbox/route.ts, chair ruling 2): a direct remote image request
 * is the exfiltration channel the frame closes. Shapes render images straight
 * from their data (`<img src={data.logo_url}>` — brand logos, avatars,
 * thumbnails), so without this every remote image was refused, the reader saw
 * a gap and the author got an incident (2026-10-14: brand_basics' logo).
 * Asking every author to wrap URLs is the instance fix; this is the class fix:
 * the one place a URL becomes an image request — the attribute/property write
 * — rewrites an absolute remote http(s) URL to the door BEFORE the browser
 * fetches it. The proxy is SSRF-guarded and serves only `image/*`, so the CSP
 * guarantee is unchanged. Anything this cannot see (a CSS `url()`) is still
 * refused and reported by the frame bridge's violation listener.
 */

const DOOR_PATH = "/api/image-proxy";

/** The door URL for `value`, or `value` unchanged when it needs no door. */
export function throughImageDoor(value: string, base: string): string {
    const raw = value.trim();
    if (!/^https?:\/\//i.test(raw)) return value;
    let url: URL;
    let door: URL;
    try {
        url = new URL(raw);
        door = new URL(DOOR_PATH, base);
    } catch {
        return value;
    }
    if (url.origin === door.origin && url.pathname === door.pathname) return value;
    door.searchParams.set("url", url.href);
    return door.href;
}

/**
 * Each candidate of a `srcset` ("url 2x, url 640w") through the door. Parsed
 * the way the HTML spec does — a URL runs to whitespace, so the commas inside
 * a `data:` URL are never mistaken for candidate separators.
 */
export function srcsetThroughImageDoor(value: string, base: string): string {
    if (!/https?:\/\//i.test(value)) return value;
    const out: string[] = [];
    let i = 0;
    while (i < value.length) {
        while (i < value.length && /[\s,]/.test(value[i] ?? "")) i++;
        if (i >= value.length) break;
        let end = i;
        while (end < value.length && !/\s/.test(value[end] ?? "")) end++;
        let url = value.slice(i, end);
        let descriptor = "";
        if (url.endsWith(",")) {
            url = url.replace(/,+$/, "");
        } else {
            const comma = value.indexOf(",", end);
            const stop = comma === -1 ? value.length : comma;
            descriptor = value.slice(end, stop).trim();
            end = stop;
        }
        out.push(descriptor ? `${throughImageDoor(url, base)} ${descriptor}` : throughImageDoor(url, base));
        i = end;
    }
    return out.join(", ");
}

function isImageSlot(el: Element, name: string): "url" | "srcset" | null {
    const tag = el.localName;
    const attr = name.toLowerCase();
    if (tag === "img") return attr === "src" ? "url" : attr === "srcset" ? "srcset" : null;
    if (tag === "source") return attr === "srcset" ? "srcset" : attr === "src" ? "url" : null;
    if (tag === "image" && el.namespaceURI === "http://www.w3.org/2000/svg") {
        return attr === "href" || attr === "xlink:href" ? "url" : null;
    }
    return null;
}

const INSTALLED = Symbol.for("matrx.kindSandbox.imageDoor");

/** Idempotent. Patches only this document's realm (the sealed frame). */
export function installImageDoor(win: Window & typeof globalThis = window): void {
    const flagged = win as unknown as Record<symbol, boolean>;
    if (flagged[INSTALLED]) return;
    flagged[INSTALLED] = true;
    const base = () => win.document.baseURI;
    const rewrite = (el: Element, name: string, value: unknown): unknown => {
        if (typeof value !== "string") return value;
        const slot = isImageSlot(el, name);
        if (slot === "url") return throughImageDoor(value, base());
        if (slot === "srcset") return srcsetThroughImageDoor(value, base());
        return value;
    };

    const proto = win.Element.prototype;
    const setAttribute = proto.setAttribute;
    proto.setAttribute = function (this: Element, name: string, value: string) {
        return setAttribute.call(this, name, rewrite(this, name, value) as string);
    };
    const setAttributeNS = proto.setAttributeNS;
    proto.setAttributeNS = function (this: Element, ns: string | null, name: string, value: string) {
        return setAttributeNS.call(this, ns, name, rewrite(this, name, value) as string);
    };

    // `img.src = url` / `img.srcset = …` bypass setAttribute.
    for (const [ctor, props] of [
        [win.HTMLImageElement, ["src", "srcset"]],
        [win.HTMLSourceElement, ["src", "srcset"]],
    ] as const) {
        for (const prop of props) {
            const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, prop);
            if (!descriptor?.set || !descriptor.get) continue;
            const set = descriptor.set;
            Object.defineProperty(ctor.prototype, prop, {
                ...descriptor,
                set(this: Element, value: unknown) {
                    set.call(this, rewrite(this, prop, value));
                },
            });
        }
    }
}
