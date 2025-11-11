import { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data: app } = await supabase
        .from("prompt_apps")
        .select("name, tagline, description")
        .eq("id", id)
        .single();

    const title = app?.name && app.name.trim() !== ""
        ? `${app.name} | Prompt Apps`
        : "Edit Prompt App";

    const description = app?.tagline || app?.description || "Edit and manage your AI-powered prompt application";

    return {
        title,
        description,
        openGraph: {
            title: app?.name || "Prompt App",
            description: description,
            type: "website",
        },
    };
}

export default function PromptAppIdLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

