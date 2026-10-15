// LANE AT-UIFIX item 4: a viewer (test@test.com) pressed an automation's on/off switch and nothing happened and
// nothing was said — the door wants the Editor level. The switch is closed with a one-line reason instead.
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({}), useMyLevel: () => ({ loading: false, error: null, data: null }) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({ Button: () => null, Input: () => null, Switch: () => null }));

import { automationSwitchReason } from "../Automations";

const rights = (level: string | null, structure: boolean) => ({ known: true, level, structure });

describe("the automation switch", () => {
  it("says what it needs, in one short line, to a viewer", () => {
    const why = automationSwitchReason(rights("viewer", false));
    expect(why).toBe("Needs Full access");
    expect(why!.length).toBeLessThanOrEqual(60);
  });
  it("says so plainly to someone with no access at all", () => {
    expect(automationSwitchReason(rights(null, false))).toBe("You don't have access");
  });
  it("is closed to a member holding only Edit (automations are structure), open to Full access", () => {
    expect(automationSwitchReason(rights("editor", false))).toBe("Needs Full access");
    expect(automationSwitchReason(rights("admin", true))).toBeNull();
  });
});
