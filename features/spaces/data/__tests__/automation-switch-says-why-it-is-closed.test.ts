// LANE AT-UIFIX item 4: a viewer (test@test.com) pressed an automation's on/off switch and nothing happened and
// nothing was said — the door wants the Editor level. The switch is closed with a one-line reason instead.
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({}), useMyLevel: () => ({ loading: false, error: null, data: null }) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({ Button: () => null, Input: () => null, Switch: () => null }));

import { automationSwitchReason } from "../Automations";

const rights = (level: string | null, organise: boolean) => ({ known: true, level, organise });

describe("the automation switch", () => {
  it("says what it needs, in one short line, to a viewer", () => {
    const why = automationSwitchReason(rights("viewer", false));
    expect(why).toBe("Needs Edit access");
    expect(why!.length).toBeLessThanOrEqual(60);
  });
  it("says so plainly to someone with no access at all", () => {
    expect(automationSwitchReason(rights(null, false))).toBe("You don't have access");
  });
  it("is OPEN to a member holding Edit (the door asks Edit) and to Full access", () => {
    expect(automationSwitchReason(rights("editor", true))).toBeNull();
    expect(automationSwitchReason(rights("admin", true))).toBeNull();
  });
});

// CD-AUTO-11 (BA-, 2026-10-21): live walk as a viewer showed the switch disabled with only a hover title — a click said
// nothing. The reason is now a visible line on the panel.
describe("the closed switch's visible note", () => {
  const { SwitchClosedNote } = require("../Automations");
  const { renderToStaticMarkup } = require("react-dom/server");
  const React = require("react");
  it("says the reason where the person looks", () => {
    expect(renderToStaticMarkup(React.createElement(SwitchClosedNote, { reason: "Needs Edit access" }))).toContain("Needs Edit access");
  });
  it("says nothing when the switch is open or the access is still being read", () => {
    expect(renderToStaticMarkup(React.createElement(SwitchClosedNote, { reason: null }))).toBe("");
    expect(renderToStaticMarkup(React.createElement(SwitchClosedNote, { reason: "Checking your access…" }))).toBe("");
  });
  it("is drawn by the panel's list", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "../Automations.tsx"), "utf8") as string;
    expect(src).toMatch(/<SwitchClosedNote reason=\{switchReason\} \/>/);
  });
});
