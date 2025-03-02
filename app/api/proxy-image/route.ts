// app/api/proxy-image/route.ts

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return new Response(JSON.stringify({ error: "Missing URL parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const imageResponse = await fetch(url);
        const imageBuffer = await imageResponse.arrayBuffer();

        // Return the proxied image
        return new Response(imageBuffer, {
            status: 200,
            headers: {
                "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
            },
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return new Response(JSON.stringify({ error: "Failed to proxy image" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
