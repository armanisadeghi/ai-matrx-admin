import { CartesiaClient } from "@cartesia/cartesia-js";
import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/utils/supabase/resolveUser";

export async function GET(request: NextRequest) {
  try {
    const { user } = await resolveUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Provide a session cookie or Bearer token." },
        { status: 401 },
      );
    }

    const cartesia = new CartesiaClient({
      apiKey: process.env.CARTESIA_API_KEY,
    });

    const resp = await cartesia.auth.accessToken({ grants: { tts: true } });

    return NextResponse.json(resp);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Token generation failed";
    console.error("[/api/cartesia] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
