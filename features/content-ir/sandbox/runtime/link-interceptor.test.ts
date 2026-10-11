/** @jest-environment jsdom */
import { installLinkInterceptor } from "./link-interceptor";

function setup(html: string) {
    document.body.innerHTML = html;
    const request = jest.fn(async () => ({ ok: true }) as { ok: boolean; error?: string });
    const dispose = installLinkInterceptor(document, request);
    return { request, dispose };
}

function click(el: Element, init: MouseEventInit = {}, type = "click") {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
    el.dispatchEvent(ev);
    return ev;
}

describe("link interceptor (frame runtime)", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("relays a plain anchor click as open_url and stops the frame navigating", () => {
        const { request, dispose } = setup(`<a id="a" href="https://example.com/x" target="_blank">go</a>`);
        const ev = click(document.getElementById("a")!);
        expect(request).toHaveBeenCalledWith("open_url", { url: "https://example.com/x" });
        expect(ev.defaultPrevented).toBe(true);
        dispose();
    });

    it("relays relative paths, clicks on children of the anchor, and middle clicks", () => {
        const { request, dispose } = setup(`<a href="/notes"><span id="s">n</span></a>`);
        click(document.getElementById("s")!);
        click(document.getElementById("s")!, { button: 1 }, "auxclick");
        click(document.getElementById("s")!, { button: 2 }, "auxclick");
        expect(request).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenCalledWith("open_url", { url: "/notes" });
        dispose();
    });

    it("sends javascript: to the host too (the host refuses it) and marks the anchor when refused", async () => {
        const { request, dispose } = setup(`<a id="a" href="javascript:alert(1)">x</a>`);
        request.mockResolvedValueOnce({ ok: false, error: "no" });
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        click(document.getElementById("a")!);
        await Promise.resolve();
        await Promise.resolve();
        expect(request).toHaveBeenCalledWith("open_url", { url: "javascript:alert(1)" });
        expect(document.getElementById("a")!.getAttribute("data-matrx-link-refused")).toBe("true");
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        dispose();
    });

    it("leaves #fragments, download anchors, author-prevented clicks and non-links alone", () => {
        const { request, dispose } = setup(
            `<a id="h" href="#top">h</a><a id="d" href="blob:x" download="f.txt">d</a><a id="p" href="https://e.co">p</a><button id="b">b</button><a id="n">no href</a>`,
        );
        document.getElementById("p")!.addEventListener("click", (e) => e.preventDefault());
        // Author handler on the anchor itself runs before the document listener.
        for (const id of ["h", "d", "p", "b", "n"]) click(document.getElementById(id)!);
        expect(request).not.toHaveBeenCalled();
        dispose();
    });
});
