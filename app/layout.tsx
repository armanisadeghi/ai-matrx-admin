// app/layout.tsx
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { metadata } from "./config/metadata";
import { viewport } from "./config/viewport";
import { inter, montserrat, openSans, roboto } from "@/styles/themes/fonts";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SyncBootScript, syncPolicies } from "@/lib/sync";


export { metadata, viewport };

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    return (
        <html
            lang="en"
            data-scroll-behavior="smooth"
            className={cn(inter.variable, montserrat.variable, openSans.variable, roboto.variable)}
            suppressHydrationWarning
        >
            <head>
                {/* Prevent autofill/password manager interference */}
                <meta name="autofill-off" content="true" />
                <meta name="password-manager-off" content="true" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="google" content="notranslate" />
                {/* Sync-engine pre-paint script — declarative, built from
                    each policy's `prePaint` descriptors. Owns `.dark` class
                    and `data-theme` on <html> before first paint (no FOUC).
                    Replaces: the ad-hoc inline theme script + hardcoded
                    `className="dark"` that previously lived here. */}
                <SyncBootScript policies={syncPolicies} />
            </head>
            <body
                className={cn(
                    "min-h-dvh bg-textured font-sans antialiased",
                    "data-form-type-none data-autofill-off"
                )}
                data-lpignore="true"
                data-form-type="other"
            >
                <Suspense>
                    <PostHogProvider>
                        {children}
                        <Toaster />
                        <Sonner />
                    </PostHogProvider>
                </Suspense>
                <SpeedInsights />
                {/* Glass portal layer — lives outside all content stacking contexts.
                    NO position, NO z-index, NO transform, NO overflow, NO filter here — ever.
                    Children (dock, panels) are position:fixed themselves.
                    A stacking context on this wrapper would block their backdrop-filter in Chromium. */}
                <div id="glass-layer" />
            </body>
        </html>
    );
}
