import { del as deleteJson, getJson, postJson } from "@/lib/python-client";
import { startOAuthPopup } from "@/utils/oauth-popup";

/** One connected Notion workspace, as aidream reports it. Never carries a token (it lives in the Vault). */
export interface NotionWorkspace {
  connection_id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  user_name: string | null;
  status: string;
}

/** The person's Notion workspaces (`/notion/connection`). */
export interface NotionConnection {
  connected: boolean;
  workspaces: NotionWorkspace[];
  /** False until the AI Matrx Notion app is configured on the server. */
  oauth_available?: boolean | null;
}

export interface NotionCheck {
  workspaces: { workspace_name: string | null; ok: boolean; error?: string | null }[];
}

export const NOTION_ICON_URL = "https://www.notion.so/images/favicon.ico";

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export async function loadNotionConnection(): Promise<NotionConnection> {
  try {
    return (await getJson<NotionConnection>("/api/notion/connection")).data;
  } catch (cause) {
    throw new Error(message(cause, "Could not load your Notion connection."));
  }
}

/** Asks Notion whether each stored workspace token still works. */
export async function checkNotionConnection(): Promise<NotionCheck> {
  try {
    return (await postJson<NotionCheck, Record<string, never>>("/api/notion/connection/check", {})).data;
  } catch (cause) {
    throw new Error(message(cause, "Notion did not accept the connection. Reconnect it."));
  }
}

/** Disconnects one workspace; no id disconnects all. */
export async function disconnectNotion(connectionId?: string): Promise<NotionConnection> {
  try {
    const query = connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : "";
    const { data } = await deleteJson<NotionConnection>(`/api/notion/connection${query}`);
    if (!data) throw new Error("Notion did not confirm the disconnect.");
    return data;
  } catch (cause) {
    throw new Error(message(cause, "Could not disconnect Notion."));
  }
}

export function notionConnectUrl(returnUrl: string, organizationId: string): string {
  const params = new URLSearchParams({ return_url: returnUrl, organization_id: organizationId });
  return `/api/notion/oauth/start?${params.toString()}`;
}

export function startNotionSignIn(
  returnUrl: string,
  organizationId: string,
): Promise<{ ok: true; value: "connected" } | { ok: false; error: string; cancelled: boolean }> {
  return startOAuthPopup({
    url: notionConnectUrl(returnUrl, organizationId),
    target: "notion_oauth",
    successType: "notion_oauth_complete",
    errorType: "notion_oauth_error",
    readSuccessValue: () => "connected" as const,
  });
}
