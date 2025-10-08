import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Cache for 12 hours (43200 seconds)
export const revalidate = 43200;

export async function GET() {
    try {
        const supabase = await createClient();

        // Fetch all non-deprecated AI models
        const { data: models, error } = await supabase
            .from("ai_model")
            .select("*")
            .eq("is_deprecated", false)
            .order("common_name", { ascending: true });

        if (error) {
            console.error("Error fetching AI models:", error);
            return NextResponse.json(
                { error: "Failed to fetch AI models" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { models, cached_at: new Date().toISOString() },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
                },
            }
        );
    } catch (error) {
        console.error("Unexpected error fetching AI models:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}

