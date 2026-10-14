/** @jest-environment jsdom */
import { installImageDoor, srcsetThroughImageDoor, throughImageDoor } from "./image-door";

const BASE = "https://manage.aimatrx.com/kind-sandbox";
const LOGO = "https://fullspecstaff.com/wp-content/uploads/2022/04/Full-Spectrum-Search-Group.svg";
const DOOR = `https://manage.aimatrx.com/api/image-proxy?url=${encodeURIComponent(LOGO)}`;

describe("image door (frame runtime)", () => {
    it("routes the live brand_basics logo through the door", () => {
        expect(throughImageDoor(LOGO, BASE)).toBe(DOOR);
    });

    it("leaves data:, blob:, relative and already-doored URLs alone", () => {
        for (const v of ["data:image/png;base64,AAAA", "blob:https://manage.aimatrx.com/1", "/logo.png", DOOR]) {
            expect(throughImageDoor(v, BASE)).toBe(v);
        }
    });

    it("routes every srcset candidate and keeps its descriptor", () => {
        expect(srcsetThroughImageDoor(`${LOGO} 1x, /local.png 2x`, BASE)).toBe(`${DOOR} 1x, /local.png 2x`);
    });

    it("rewrites img src written by attribute AND by property, before any request", () => {
        installImageDoor(window);
        const base = document.baseURI;
        const viaAttr = document.createElement("img");
        viaAttr.setAttribute("src", LOGO);
        expect(viaAttr.getAttribute("src")).toBe(throughImageDoor(LOGO, base));
        const viaProp = document.createElement("img");
        viaProp.src = LOGO;
        expect(viaProp.getAttribute("src")).toBe(throughImageDoor(LOGO, base));
        expect(viaProp.getAttribute("src")).toContain("/api/image-proxy?url=");
        // Non-image attributes and elements are untouched.
        const a = document.createElement("a");
        a.setAttribute("href", LOGO);
        expect(a.getAttribute("href")).toBe(LOGO);
    });
});
