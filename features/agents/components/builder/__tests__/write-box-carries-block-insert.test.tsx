/**
 * A CONTENT BLOCK PICKED FROM THE WRITE BOX'S RIGHT-CLICK MENU BECOMES A DECLARED {{<name>}} CHIP
 * (Arman walk 2026-10-12: Troubleshooting Guide inserted a rendered Section card, another inserted
 * plain text). The context menu only inserts the token when the host hands it `onInsertPromptBlock`;
 * the Write box built its own menu and dropped it.
 *
 * Breaks it names:
 * - PromptWriteBox stops forwarding `menuProps` to the menu → "forwards" goes red.
 * - a builder prompt field renders PromptWriteBox without `menuProps` → "every host" goes red.
 */
import fs from "node:fs";
import path from "node:path";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

const seen: Array<Record<string, unknown>> = [];
jest.mock("@ai-matrx/context-menu/react", () => ({
  EditableContextMenu: (props: Record<string, unknown>) => {
    seen.push(props);
    return <div>{props.children as React.ReactNode}</div>;
  },
}));
jest.mock("@ai-matrx/rich-editor/editor/RichEditor", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("@ai-matrx/rich-editor/core/section-menu", () => ({ sectionMenuSection: () => null, wrapEditorSelection: () => undefined }));
jest.mock("@ai-matrx/rich-editor/format/FormatButtons", () => ({ FormatButtons: () => null }));
jest.mock("@ai-matrx/rich-editor/format/format-target", () => ({ textareaFormatTarget: () => null }));
jest.mock("@ai-matrx/rich-editor/core/prompt-inserts", () => ({ insertIntoText: () => ({ text: "", caret: 0 }) }));
jest.mock("@ai-matrx/content-ir", () => ({ kindSchemaToJsonSchema: () => null }));
jest.mock("@/features/content-ir/registry/kind-catalog", () => ({ catalogResolver: () => null, listAllKinds: async () => [], listCompiledKinds: () => [] }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => [] }));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => ({
  selectAgentContextPolicies: () => [],
  selectAgentVariableDefinitions: () => [],
}));

import { PromptWriteBox } from "../message-builders/PromptAssist";

describe("the Write box's right-click menu", () => {
  it("forwards the host's onInsertPromptBlock so a picked block becomes a {{<name>}} token", () => {
    const onInsertPromptBlock = jest.fn(async () => true);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    act(() => {
      createRoot(host).render(
      <PromptWriteBox
        value=""
        onChange={() => undefined}
        controllerRef={{ current: null }}
        surfaceName="t"
        menuProps={{ onInsertPromptBlock }}
      />,
      );
    });
    expect(seen.at(-1)?.onInsertPromptBlock).toBe(onInsertPromptBlock);
  });

  it("every host of PromptWriteBox in the builder passes menuProps", () => {
    const dir = path.join(__dirname, "..", "message-builders");
    const files = [path.join(dir, "MessageItem.tsx"), path.join(dir, "system-instructions", "SystemMessage.tsx")];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      const uses = src.match(/<PromptWriteBox[\s\S]*?\/>/g) ?? [];
      expect(uses.length).toBeGreaterThan(0);
      for (const use of uses) expect(use).toContain("menuProps={blockEditing.menuProps}");
    }
  });
});
