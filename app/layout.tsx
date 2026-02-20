// app/layout.tsx
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { metadata } from "./config/metadata";
import { viewport } from "./config/viewport";
import { inter, montserrat, openSans, roboto } from "@/styles/themes";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { SpeedInsights } from "@vercel/speed-insights/next"


export { metadata, viewport };

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const theme = cookieStore.get("theme")?.value || "dark";
    return (
        <html
            lang="en"
            data-theme={theme}
            className={cn("dark", inter.variable, montserrat.variable, openSans.variable, roboto.variable)}
            suppressHydrationWarning
        >
            <head>
                {/* Prevent autofill/password manager interference */}
                <meta name="autofill-off" content="true" />
                <meta name="password-manager-off" content="true" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="google" content="notranslate" />
            </head>
            <body
                className={cn(
                    "min-h-dvh bg-textured font-sans antialiased",
                    // Add data attributes to prevent autofill on body level
                    "data-form-type-none data-autofill-off"
                )}
                // Additional attributes to prevent autofill
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
            </body>
        </html>
    );
}
