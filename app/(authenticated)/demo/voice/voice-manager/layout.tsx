import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/voice-manager", {
    title: "Voices",
    description: "Browse a collection of voices you can use in your projects",
});

export default function VoiceManagerLayout({ children }: { children: React.ReactNode }) {
    return children;
}
