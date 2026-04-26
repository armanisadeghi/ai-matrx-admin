import { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = (await createClient()) as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          single: () => Promise<{
            data: { name?: string; tagline?: string; description?: string } | null;
          }>;
        };
      };
    };
  };

  const { data: app } = await supabase
    .from("aga_apps")
    .select("name, tagline, description")
    .eq("id", id)
    .single();

  const name =
    app?.name && app.name.trim() !== "" ? app.name.trim() : "Agent App";
  const rawDesc = app?.tagline || app?.description;
  const description =
    rawDesc && rawDesc.trim() !== ""
      ? rawDesc.slice(0, 120)
      : "Edit and manage your AI-powered agent application";

  return createDynamicRouteMetadata("/agent-apps", {
    title: name,
    description,
    letter: "Ag",
  });
}

export default function AgentAppIdLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
