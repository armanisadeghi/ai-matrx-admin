import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { isRfc4122Uuid } from "@ai-matrx/kit/uuid";
import { getClaimsUser } from "@ai-matrx/auth";
import { sendEmail } from "@/lib/email/client";
import { accountEmail } from "@/lib/notifications/notifyFromSql";

/**
 * POST /api/sharing/email-file — the editors' File → Email ▸ rows.
 * "Email this file": the typed addresses get the file's link and a note.
 * "Email collaborators": the same, to every person the file is shared with (their account
 * addresses are read here, never sent to the browser). The sender must be the file's owner or
 * one of the people it is shared with.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await getClaimsUser(supabase);
    if (!user?.email) return NextResponse.json({ success: false, msg: "Sign in to send email" }, { status: 401 });

    const body = await request.json();
    const { resourceType, resourceId, resourceName, url, message, to, collaborators } = body as Record<string, unknown>;
    if (typeof resourceType !== "string" || !/^[a-z][a-z0-9_]{0,63}$/i.test(resourceType) || !isRfc4122Uuid(resourceId)) {
      return NextResponse.json({ success: false, msg: "Missing file" }, { status: 400 });
    }
    let link: URL;
    try {
      link = new URL(String(url));
    } catch {
      return NextResponse.json({ success: false, msg: "The file link is not a link" }, { status: 400 });
    }
    if (link.protocol !== "https:" && link.protocol !== "http:") {
      return NextResponse.json({ success: false, msg: "The file link is not a web link" }, { status: 400 });
    }
    const name = typeof resourceName === "string" && resourceName.trim() ? resourceName.trim() : "Untitled";
    const note = typeof message === "string" ? message.trim().slice(0, 2000) : "";

    const recipients = new Set<string>();
    if (collaborators === true) {
      const admin = createAdminClient();
      const { data: grants, error } = await admin
        .schema("iam")
        .from("permissions")
        .select("granted_to_user_id, created_by, status")
        .eq("resource_id", resourceId as string);
      if (error) throw error;
      const live = (grants ?? []).filter((g) => g.status !== "rejected");
      const involved = live.some((g) => g.created_by === user.id || g.granted_to_user_id === user.id);
      if (!involved) return NextResponse.json({ success: false, msg: "This file is not shared with anyone yet" }, { status: 403 });
      const ids = new Set<string>();
      for (const g of live) {
        if (g.granted_to_user_id && g.granted_to_user_id !== user.id) ids.add(g.granted_to_user_id);
        if (g.created_by && g.created_by !== user.id) ids.add(g.created_by);
      }
      for (const id of ids) {
        const addr = await accountEmail(admin, id);
        if (addr) recipients.add(addr);
      }
      if (recipients.size === 0) return NextResponse.json({ success: false, msg: "No one else has this file yet" }, { status: 400 });
    } else {
      const list = Array.isArray(to) ? to : typeof to === "string" ? to.split(/[\s,;]+/) : [];
      for (const raw of list) {
        const addr = String(raw).trim();
        if (!addr) continue;
        if (!EMAIL.test(addr)) return NextResponse.json({ success: false, msg: `${addr} is not an email address` }, { status: 400 });
        recipients.add(addr);
      }
      if (recipients.size === 0) return NextResponse.json({ success: false, msg: "Add an email address" }, { status: 400 });
      if (recipients.size > 20) return NextResponse.json({ success: false, msg: "At most 20 addresses" }, { status: 400 });
    }

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
<p style="color:#374151;font-size:14px">${esc(user.email)} sent you a file.</p>
${note ? `<p style="color:#111827;font-size:15px;white-space:pre-wrap">${esc(note)}</p>` : ""}
<p><a href="${esc(link.toString())}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open ${esc(name)}</a></p>
</div>`;
    const text = `${user.email} sent you "${name}".\n${note ? `\n${note}\n` : ""}\n${link.toString()}`;
    const result = await sendEmail({
      to: [...recipients],
      subject: `${name}`,
      html,
      text,
      replyTo: user.email,
    });
    if (!result.success) {
      const why = "suppressed" in result && result.suppressed ? "Email is switched off on this copy" : "Could not send the email";
      return NextResponse.json({ success: false, msg: why }, { status: 502 });
    }
    return NextResponse.json({ success: true, sent: recipients.size });
  } catch (error) {
    console.error("Error in POST /api/sharing/email-file:", error);
    return NextResponse.json({ success: false, msg: "Failed to send email" }, { status: 500 });
  }
}
