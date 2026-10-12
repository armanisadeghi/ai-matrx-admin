import { NextResponse, type NextRequest } from "next/server";
import {
  MATRX_DESKTOP_FEED_REVALIDATE_SECONDS,
  getMatrxDesktopRelease,
  type MatrxDesktopOs,
} from "@/features/matrx-local-download/desktop-release";

const NAMES: Record<MatrxDesktopOs, string> = { mac: "Mac", windows: "Windows", linux: "Linux" };

/**
 * The stable address for each OS's download (`?os=windows|linux`, Mac by default). It reads that
 * OS's update feed (revalidated) and sends the browser to the file the feed names, so the link is
 * always the latest and never holds a version. If the feed cannot be read, or that OS has no release
 * yet, it says so plainly; it never falls back to an old file.
 */
export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get("os");
  const os: MatrxDesktopOs = asked === "windows" || asked === "linux" ? asked : "mac";
  const release = await getMatrxDesktopRelease(os);
  if (!release) {
    return NextResponse.json(
      {
        error: `The ${NAMES[os]} download is not available right now. Please try again in a few minutes.`,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.redirect(release.url, {
    status: 307,
    headers: {
      "Cache-Control": `public, s-maxage=${MATRX_DESKTOP_FEED_REVALIDATE_SECONDS}`,
    },
  });
}
