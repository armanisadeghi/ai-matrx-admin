// AT-FOLLOW: a connected-app refusal on a run step ships its reconnect action. The server's refusals all end in
// "Settings → Integrations → <App>", so one reader turns that sentence into a link to that app's setting.
import React from "react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const DOORS: [RegExp, string, string][] = [
  [/microsoft|outlook|teams/i, "Microsoft", "/user-settings/integrations/microsoft"],
  [/google|gmail/i, "Google", "/user-settings/integrations/google-workspace"],
  [/slack/i, "Slack", "/user-settings/integrations"],
  [/github/i, "GitHub", "/user-settings/integrations"],
];

/** The door a refusal sentence names, or null when the sentence is not a connected-app refusal. */
export function reconnectDoor(says: string | null | undefined): { label: string; href: string } | null {
  if (!says) return null;
  const named = /Settings\s*(?:→|->)\s*Integrations(?:\s*(?:→|->)\s*([A-Za-z ]+))?/i.exec(says);
  if (!named) return null;
  const app = (named[1] ?? "").trim();
  for (const [test, label, href] of DOORS) {
    if (test.test(app) || (!app && test.test(says))) return { label, href };
  }
  return { label: "Integrations", href: "/user-settings/integrations" };
}

export function ReconnectAction({ says }: { says: string | null | undefined }) {
  const door = reconnectDoor(says);
  if (!door) return null;
  return (
    <OutboundLink
      className="ml-2 underline"
      href={door.href}
      data-testid="spaces-automation-reconnect"
    >
      {door.label === "Integrations" ? "Open integrations" : `Reconnect ${door.label}`}
    </OutboundLink>
  );
}
