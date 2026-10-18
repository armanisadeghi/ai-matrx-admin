import { NextRequest, NextResponse } from "next/server";
import { safeRelativePath } from "@/utils/auth/safe-redirect";
import { escapeHtml } from "@ai-matrx/kit/html-escape";

/** The popup's last page: tells its opener the outcome (same-origin), then closes on success. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const connected = request.nextUrl.searchParams.get("slack") === "connected";
  const error = request.nextUrl.searchParams.get("slack_error") ?? "Slack connection failed.";
  const returnUrl = safeRelativePath(request.nextUrl.searchParams.get("return_url"), "/settings");
  const message = connected ? { type: "slack_oauth_complete" } : { type: "slack_oauth_error", error };
  const serialized = JSON.stringify(message).replaceAll("<", "\\u003c");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Slack connection</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#111;color:#eee">
<main style="text-align:center;max-width:400px;padding:2rem">
  <p style="font-size:1.25rem;${connected ? "" : "color:#f87171"}">${connected ? "Slack connected" : "Connection failed"}</p>
  <p style="color:#999">${connected ? "This window will close automatically." : escapeHtml(error)}</p>
  <a href="${escapeHtml(returnUrl)}" style="color:#93c5fd">Return to AI Matrx</a>
</main>
<script>
try { if (window.opener) window.opener.postMessage(${serialized}, window.location.origin); } catch (_) {}
${connected ? "setTimeout(function () { window.close(); }, 800);" : ""}
</script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
