export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Legacy Image Studio batch-save endpoint.
 *
 * The studio UI now uploads generated variants through the cloud-files Redux
 * pipeline (`useImageStudio` → `uploadFiles`). This route remains so route
 * tables and incremental builds stay consistent; older clients receive a
 * clear response instead of 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is retired. Save from Image Studio uses cloud-files uploads in the app.",
    },
    { status: 410 },
  );
}
