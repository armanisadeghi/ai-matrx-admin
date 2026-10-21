/** @jest-environment jsdom */
// A closed RenameDialog must not mount its body (store subscriptions + O(files) sibling scan).
// Rendered WITHOUT a redux Provider: the body's useAppDispatch/useAppSelector would throw.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { RenameDialog } from "./RenameDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("renders nothing and touches no store while closed", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => {
    root.render(<RenameDialog open={false} onOpenChange={() => {}} kind="file" resourceId="f1" currentName="a.txt" />);
  });
  expect(host.innerHTML).toBe("");
  act(() => root.unmount());
});
