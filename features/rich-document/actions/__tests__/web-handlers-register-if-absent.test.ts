/**
 * THE WEB HANDLER INDEX NEVER THROWS WHEN THE PACKAGE REGISTERED AN ID FIRST.
 *
 * The message actions are moving into @ai-matrx/chat (`registerChatMessageActions()`), and the
 * registry throws `DuplicateActionError` on a duplicate id outside development. While both the
 * package and this app carry a handler for the same id, whichever loads second must skip, never
 * throw. This suite registers a package-style copy of `copy` straight into the registry (as the
 * package's register-if-absent entry does), then loads the web handler index the way the app does.
 * Red with any handler calling `registerAction` directly; green through `registerActionIfAbsent`.
 */

import { getAction, registerAction } from "@ai-matrx/rich-content/rich-document/actions/provider";
import type { RichDocumentAction } from "@ai-matrx/rich-content/rich-document/types";

describe("web handlers register only ids nobody registered yet", () => {
  const packageCopy = {
    id: "copy",
    label: "Copy",
    supportedSources: "*",
    run: () => undefined,
  } as unknown as RichDocumentAction;

  it("loads the handler index after a package copy without throwing, and the package copy serves", () => {
    registerAction(packageCopy);
    expect(() => {
      jest.isolateModules(() => {
        require("../handlers");
      });
    }).not.toThrow();
    expect(getAction("copy")).toBe(packageCopy);
    // The rest of the web's handlers still registered.
    expect(getAction("copy-markdown")).toBeDefined();
    expect(getAction("fork-at-message")).toBeDefined();
  });
});
