/**
 * THE SWITCH KEEPS THE PAGE'S ADDRESS (2026-10-17). HR timesheets' "Drill-down" switch built its
 * link from the bare path, dropping the employer (`org_filter`) and pay period, so the page fell back
 * to the employer picker. RED before: the pushed href was "/hr/time/timesheets?drill=1".
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/hr/time/timesheets",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("org_filter=org-1&period=p-9"),
}));
jest.mock("@/lib/deployment/navigate", () => ({ pushAppHref: (_router: unknown, href: string) => push(href) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user-1" }));
jest.mock("../describeOnce", () => ({ describeOnce: () => Promise.resolve({ ok: true }) }));
jest.mock("../useDrillExplorer", () => ({ drillClientFor: () => ({}) }));

import { DrillOrList } from "../DrillOrList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("opening the drill-down keeps the employer and pay period", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <DrillOrList definition="hr_timesheets" listLabel="Timesheets" firstScreen="list" organizationId="org-1" renderDrill={() => null} list={<div>rows</div>} />,
    );
  });
  await act(async () => {
    (host.querySelector("[data-drill-open]") as HTMLButtonElement).click();
  });
  expect(push).toHaveBeenCalledWith("/hr/time/timesheets?org_filter=org-1&period=p-9&drill=1");
  act(() => root.unmount());
});
