import { del as deleteJson, getJson, postJson } from "@/lib/python-client";
import { startOAuthPopup } from "@/utils/oauth-popup";

/**
 * The person's own Slack account, as aidream reports it (`/slack/connection`).
 * Never carries a token: the Slack user token lives in the Vault and is read
 * server-side only.
 */
export interface SlackConnection {
  connected: boolean;
  connection_id: string | null;
  team_name: string | null;
  team_url: string | null;
  user_name: string | null;
  scopes: string[];
  status: string;
  /** False until the AI Matrx Slack app is configured on the server. */
  oauth_available?: boolean | null;
}

export interface SlackCheck {
  ok: boolean;
  team_name: string | null;
  team_url: string | null;
  user_name: string | null;
}

export const SLACK_ICON_URL = "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png";

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export async function loadSlackConnection(): Promise<SlackConnection> {
  try {
    return (await getJson<SlackConnection>("/api/slack/connection")).data;
  } catch (cause) {
    throw new Error(message(cause, "Could not load your Slack connection."));
  }
}

/** Slack `auth.test` with the stored token. */
export async function checkSlackConnection(): Promise<SlackCheck> {
  try {
    return (await postJson<SlackCheck, Record<string, never>>("/api/slack/connection/check", {})).data;
  } catch (cause) {
    throw new Error(message(cause, "Slack did not accept the connection. Reconnect it."));
  }
}

export async function disconnectSlack(): Promise<SlackConnection> {
  try {
    const { data } = await deleteJson<SlackConnection>("/api/slack/connection");
    if (!data) throw new Error("Slack did not confirm the disconnect.");
    return data;
  } catch (cause) {
    throw new Error(message(cause, "Could not disconnect Slack."));
  }
}

export function slackConnectUrl(returnUrl: string, organizationId: string): string {
  const params = new URLSearchParams({ return_url: returnUrl, organization_id: organizationId });
  return `/api/slack/oauth/start?${params.toString()}`;
}

export function startSlackSignIn(
  returnUrl: string,
  organizationId: string,
): Promise<{ ok: true; value: "connected" } | { ok: false; error: string; cancelled: boolean }> {
  return startOAuthPopup({
    url: slackConnectUrl(returnUrl, organizationId),
    target: "slack_oauth",
    successType: "slack_oauth_complete",
    errorType: "slack_oauth_error",
    readSuccessValue: () => "connected" as const,
  });
}
