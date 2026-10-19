/**
 * @jest-environment jsdom
 */
// AT-FOLLOW: a connected-app refusal on a run step is a clickable action to that app's setting.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ReconnectAction, reconnectDoor } from "../reconnect-action";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CASES: [string, string][] = [
  ["Your Microsoft connection needs attention. Reconnect it under Settings → Integrations → Microsoft. Nothing was sent.", "/user-settings/integrations/microsoft"],
  ["Your Slack connection needs reconnecting. Open Settings → Integrations → Slack.", "/user-settings/integrations"],
  ["Your Google connection has expired or was revoked. Reconnect it under Settings → Integrations → Google Workspace.", "/user-settings/integrations/google-workspace"],
];

it.each(CASES)("names the door for: %s", (says, href) => {
  expect(reconnectDoor(says)?.href).toBe(href);
});

it("is silent for a refusal that names no setting", () => {
  expect(reconnectDoor("The channel was not found.")).toBeNull();
});

it("renders a link that opens the setting in a new tab", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<ReconnectAction says={CASES[0][0]} />));
  const a = host.querySelector("a[data-testid=spaces-automation-reconnect]") as HTMLAnchorElement;
  expect(a.getAttribute("href")).toBe("/user-settings/integrations/microsoft");
  expect(a.target).toBe("_blank");
  expect(a.textContent).toBe("Reconnect Microsoft");
});

it("is wired into both run views and the automation's problem line", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../Automations.tsx"), "utf8") as string;
  expect(src.match(/<ReconnectAction /g)?.length).toBe(3);
});
