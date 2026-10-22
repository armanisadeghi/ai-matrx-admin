(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Audit round 2 #1 (custom-experience, 2026-10-22): one widget whose body threw ("Language py is not
// supported.", from a Space page) replaced the WHOLE launchpad with "Something went wrong". Each widget body
// now sits in its own boundary: the failing box says so and offers Retry; every other box keeps drawing.
jest.mock("../widgets/bodies/KpisWidget", () => ({ KpisWidget: () => <p>counts drawn</p> }));
jest.mock("../widgets/bodies/MetricWidget", () => ({ MetricWidget: () => null }));
jest.mock("../widgets/bodies/RecentWidget", () => ({ RecentWidget: () => null }));
jest.mock("../widgets/bodies/TasksWidget", () => ({
  TasksWidget: () => {
    if ((globalThis as { __tasksThrow?: boolean }).__tasksThrow) throw new Error("Language py is not supported.");
    return <p>tasks drawn</p>;
  },
}));
jest.mock("../widgets/bodies/AgendaWidget", () => ({ AgendaWidget: () => null }));
jest.mock("../widgets/bodies/FavoritesWidget", () => ({ FavoritesWidget: () => null }));
jest.mock("../widgets/bodies/AgentsWidget", () => ({ AgentsWidget: () => null }));
jest.mock("../widgets/bodies/PageWidget", () => ({ PageWidget: () => null }));
jest.mock("../widgets/bodies/TableWidget", () => ({ TableWidget: () => null }));
jest.mock("../widgets/bodies/AppletWidget", () => ({ AppletWidget: () => null }));
jest.mock("../widgets/bodies/LaunchpadLinkWidget", () => ({ LaunchpadLinkWidget: () => null }));
jest.mock("../widgets/bodies/AppPageWidget", () => ({ AppPageWidget: () => null }));
jest.mock("../widgets/bodies/MeetMatrxWidget", () => ({ MeetMatrxWidget: () => null }));
jest.mock("@ai-matrx/kit/media-query", () => ({ useIsMobile: () => false }));
jest.mock("@/lib/diagnostics/captureReactError", () => ({ captureReactRenderError: jest.fn() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { LaunchpadGrid } from "../components/LaunchpadGrid";
import { addWidget, EMPTY_LAUNCHPAD_DOC } from "../doc";

const flag = globalThis as { __tasksThrow?: boolean };

describe("one widget that throws never takes the launchpad down", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("the failing box says so; the others keep drawing; Retry redraws it", () => {
    flag.__tasksThrow = true;
    let doc = addWidget(EMPTY_LAUNCHPAD_DOC, { id: "w_tasks", type: "tasks", w: 6 }, 0);
    doc = addWidget(doc, { id: "w_kpis", type: "kpis", w: 6 }, 0);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<LaunchpadGrid doc={doc} />));
    expect(host.textContent).toContain("counts drawn");
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("This widget could not be shown.");
    expect(host.textContent).not.toContain("tasks drawn");

    flag.__tasksThrow = false;
    const retry = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Retry"));
    act(() => retry?.click());
    expect(host.textContent).toContain("tasks drawn");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    act(() => root.unmount());
  });
});
