import { applyAssistClearance } from "../assistClearance";

function bounds(top: number, bottom: number): DOMRect {
  return new DOMRect(0, top, 1000, bottom - top);
}

describe("Assists clearance preserves editable fields", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(["textarea", "contenteditable", "textbox"])(
    "does not add padding inside a scrolling %s",
    (kind) => {
      const page = document.createElement("div");
      page.style.overflowY = "auto";
      const editor = document.createElement(
        kind === "textarea" ? "textarea" : "div",
      );
      if (kind === "contenteditable")
        editor.setAttribute("contenteditable", "true");
      if (kind === "textbox") editor.setAttribute("role", "textbox");
      editor.style.overflowY = "auto";
      editor.style.paddingBottom = "11px";
      page.appendChild(editor);
      const dock = document.createElement("button");
      dock.setAttribute("data-assists-dock", "");
      document.body.append(page, dock);
      for (const el of [page, editor]) {
        Object.defineProperty(el, "scrollHeight", { value: 1000 });
        Object.defineProperty(el, "clientHeight", { value: 200 });
        el.getBoundingClientRect = () => bounds(100, 740);
      }
      dock.getBoundingClientRect = () => bounds(700, 732);
      Object.defineProperty(window, "innerHeight", {
        value: 800,
        configurable: true,
      });
      Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value: () => [dock, editor, page],
      });
      applyAssistClearance();
      expect(editor.style.paddingBottom).toBe("11px");
      expect(editor.hasAttribute("data-assist-clearance")).toBe(false);
      expect(page.style.paddingBottom).toBe("48px");
    },
  );
});

describe("Assists clearance leaves a runway owner alone", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds no inset to a [data-matrx-page-scroll] scroller inside .shell-main (the shell's runway is its page end)", () => {
    const shell = document.createElement("div");
    shell.className = "shell-main";
    const rail = document.createElement("aside");
    rail.setAttribute("data-matrx-page-scroll", "");
    rail.style.overflowY = "auto";
    shell.appendChild(rail);
    const dock = document.createElement("button");
    dock.setAttribute("data-assists-dock", "");
    document.body.append(shell, dock);
    Object.defineProperty(rail, "scrollHeight", { value: 1000 });
    Object.defineProperty(rail, "clientHeight", { value: 200 });
    rail.getBoundingClientRect = () => bounds(100, 740);
    dock.getBoundingClientRect = () => bounds(700, 732);
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => [dock, rail] });
    applyAssistClearance();
    expect(rail.hasAttribute("data-assist-clearance")).toBe(false);
    expect(rail.style.paddingBottom).toBe("");
  });
});
