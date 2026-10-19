// An App page widget names its page the way the app does, never by its raw path ("Page /crm" was the defect).
import { appPageLabel, describeLaunchpadWidget } from "../widgets/catalog";

it("an app page widget is titled by the page's own name, never its path", () => {
  expect(appPageLabel("/crm")).toBe("CRM");
  expect(appPageLabel("/crm?tab=people")).toBe("CRM");
  expect(appPageLabel("/foo-bar")).toBe("Foo bar");
  expect(describeLaunchpadWidget({ type: "app_page", config: { path: "/crm" } })).toBe("CRM");
  expect(describeLaunchpadWidget({ type: "app_page", config: { path: "/crm" } })).not.toContain("/");
});
