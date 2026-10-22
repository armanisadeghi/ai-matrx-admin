/** "Look and brand color…" opens the editor on the Look tab: the overlay render passes region "look" through. */
import * as React from "react";
import OverlayRender from "../shellLayoutEditorWindow.render";

jest.mock("@/features/window-panels/windows/shell-layout/ShellLayoutEditorWindow", () => ({
  __esModule: true,
  default: (props: { region: string }) => props.region,
}));

it("passes region look through", () => {
  const el = OverlayRender({ data: { region: "look" }, instanceId: "i", close: jest.fn() } as never) as React.ReactElement<{ region: string }>;
  expect(el.props.region).toBe("look");
});
