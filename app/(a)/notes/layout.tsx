import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/notes", {
    title: "Notes",
    description: "Create, organize, and manage your notes and documents",
    additionalMetadata: {
        keywords: ["notes", "documents", "markdown", "editor", "writing"],
    },
});

export default function NotesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
