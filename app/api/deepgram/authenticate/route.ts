import { DeepgramError, DeepgramClient } from "@deepgram/sdk";
import { NextResponse, type NextRequest } from "next/server";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  // exit early so we don't request tokens while in devmode
  if (process.env.DEEPGRAM_ENV === "development") {
    return NextResponse.json({
      access_token: process.env.DEEPGRAM_API_KEY ?? "",
      url: request.url,
    });
  }

  const url = request.url;
  const deepgram = new DeepgramClient({
    apiKey: process.env.DEEPGRAM_API_KEY ?? "",
  });

  try {
    const tokenData = await deepgram.auth.v1.tokens.grant();
    const access_token = tokenData?.access_token;

    if (!access_token) {
      return NextResponse.json(
        { message: "Failed to obtain Deepgram access token." },
        { status: 502 }
      );
    }

    const res = NextResponse.json({ access_token, url });
    res.headers.set("Surrogate-Control", "no-store");
    res.headers.set(
      "Cache-Control",
      "s-maxage=0, no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.headers.set("Expires", "0");
    return res;
  } catch (err) {
    if (err instanceof DeepgramError) {
      return NextResponse.json(
        err.body ?? { message: err.message },
        { status: err.statusCode ?? 500 }
      );
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Deepgram authentication failed." },
      { status: 500 }
    );
  }
}
