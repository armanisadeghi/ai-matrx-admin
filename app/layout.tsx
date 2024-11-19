// app/layout.tsx

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { NextUIProvider } from "@nextui-org/react";
import { cookies } from 'next/headers';
import { metadata } from './config/metadata';
import { viewport } from './config/viewport';
import { inter, montserrat } from "@/styles/themes";
import NavigationLoader from "@/components/loaders/NavigationLoader";

export { metadata, viewport };

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const theme = cookieStore.get('theme')?.value || 'dark';

    return (
        <html lang="en"
              data-theme={theme}
              className={cn("dark", inter.variable, montserrat.variable)}
              suppressHydrationWarning>
        <head />
        <body className={cn("min-h-screen bg-matrx-background font-sans antialiased")}>
        <NextUIProvider>
            <NavigationLoader />
            {children}
            <Toaster />
        </NextUIProvider>
        </body>
        </html>
    );
}
