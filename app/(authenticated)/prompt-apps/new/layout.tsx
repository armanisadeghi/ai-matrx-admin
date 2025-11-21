import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the New Prompt App route
export const metadata = createRouteMetadata("/prompt-apps/new", {
    title: "Create Prompt App",
    description: "Create a new prompt app",
});

export default function Layout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

