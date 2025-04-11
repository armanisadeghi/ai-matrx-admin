import { CartesiaClient } from "@cartesia/cartesia-js";
import { NextResponse } from "next/server";

export async function GET() {
	const cartesia = new CartesiaClient({
		apiKey: process.env.CARTESIA_API_KEY,
	});

	const resp = await cartesia.auth.accessToken({ grants: { tts: true }})

	return NextResponse.json(resp);
}
