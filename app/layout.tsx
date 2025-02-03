// app/layout.tsx

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { NextUIProvider } from "@nextui-org/react";
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { metadata } from './config/metadata';
import { viewport } from './config/viewport';
import { inter, montserrat } from "@/styles/themes";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import { initializeSchemaSystem } from "@/utils/schema/schema-processing/processSchema";

const schemaSystem = initializeSchemaSystem();

export { metadata, viewport };

interface RootLayoutProps {
    children: React.ReactNode;
}

// Extend metadata to include autofill prevention
const extendedMetadata: Metadata = {
    ...metadata,
    other: {
        ...metadata.other,
        'google': 'notranslate',  // Prevent Google Translate popup
        'format-detection': 'telephone=no', // Prevent phone number detection
        'autofill-off': 'true', // Disable browser autofill
        'password-manager-off': 'true' // Signal to password managers
    }
};

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const theme = cookieStore.get('theme')?.value || 'dark';

    return (
        <html
            lang="en"
            data-theme={theme}
            className={cn("dark", inter.variable, montserrat.variable)}
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
                "min-h-screen bg-matrx-background font-sans antialiased",
                // Add data attributes to prevent autofill on body level
                "data-form-type-none data-autofill-off"
            )}
            // Additional attributes to prevent autofill
            data-lpignore="true"
            data-form-type="other"
        >
        <NextUIProvider>
            <NavigationLoader />
            {children}
            <Toaster />
        </NextUIProvider>

        {/* Optional: Add a MutationObserver script to remove LastPass elements */}
        <script
            dangerouslySetInnerHTML={{
                __html: `
                            if (typeof window !== 'undefined') {
                                const observer = new MutationObserver((mutations) => {
                                    mutations.forEach((mutation) => {
                                        mutation.addedNodes.forEach((node) => {
                                            if (node.nodeType === 1 && 
                                                (node as Element).getAttribute('data-lastpass-root')) {
                                                node.remove();
                                            }
                                        });
                                    });
                                });
                                
                                observer.observe(document.body, {
                                    childList: true,
                                    subtree: true
                                });
                            }
                        `
            }}
        />
        </body>
        </html>
    );
}
