import { NextResponse } from "next/server";
import {
  loadAdminOrganizationDirectory,
  manageAdminOrganizationMembership,
} from "@/features/admin/users/server/organizationMembershipAdmin";
import { isOrgRole } from "@/features/organizations/types";
import { requireSuperAdmin } from "@/utils/auth/adminUtils";
import { extractErrorMessage } from "@/utils/errors";

function errorResponse(error: unknown) {
  const message = extractErrorMessage(error, "Unknown error");
  const status = message.startsWith("Unauthorized")
    ? 401
    : message.startsWith("Forbidden")
      ? 403
      : 400;
  return NextResponse.json({ error: message }, { status });
}

interface MembershipRequestBody {
  organizationId: string;
  userId: string;
  role?: unknown;
  /** Recorded on the person's admin audit row. */
  reason?: string;
}

async function parseMembershipRequest(
  request: Request,
): Promise<MembershipRequestBody> {
  const body = (await request.json().catch(() => null)) as {
    organizationId?: unknown;
    userId?: unknown;
    role?: unknown;
    reason?: unknown;
  } | null;

  if (
    !body ||
    typeof body.organizationId !== "string" ||
    typeof body.userId !== "string"
  ) {
    throw new Error("organizationId and userId are required");
  }

  return {
    organizationId: body.organizationId,
    userId: body.userId,
    role: body.role,
    reason: typeof body.reason === "string" ? body.reason : undefined,
  };
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    // ?archive=active (default) | archived | all — the table's ArchiveFilter, answered by the read.
    const archive = new URL(request.url).searchParams.get("archive");
    return NextResponse.json({
      directory: await loadAdminOrganizationDirectory(
        archive === "archived" || archive === "all" ? archive : "active",
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await parseMembershipRequest(request);
    if (typeof body.role !== "string" || !isOrgRole(body.role)) {
      throw new Error("role must be owner, admin, or member");
    }
    const result = await manageAdminOrganizationMembership({
      action: "add",
      organizationId: body.organizationId,
      userId: body.userId,
      reason: body.reason,
      role: body.role,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await parseMembershipRequest(request);
    if (typeof body.role !== "string" || !isOrgRole(body.role)) {
      throw new Error("role must be owner, admin, or member");
    }
    const result = await manageAdminOrganizationMembership({
      action: "set_role",
      organizationId: body.organizationId,
      userId: body.userId,
      reason: body.reason,
      role: body.role,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await parseMembershipRequest(request);
    const result = await manageAdminOrganizationMembership({
      action: "remove",
      organizationId: body.organizationId,
      userId: body.userId,
      reason: body.reason,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
