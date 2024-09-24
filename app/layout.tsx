import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { NextUIProvider } from "@nextui-org/react";
import { cookies } from 'next/headers';
import { metadata } from './config/metadata';
import { viewport } from './config/viewport';
import { inter, montserrat } from "@/styles/themes";

export { metadata, viewport };

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = cookies();
    const theme = cookieStore.get('theme')?.value || 'dark';

    return (
        <html lang="en" data-theme={theme} className={cn("dark", inter.variable, montserrat.variable)} suppressHydrationWarning>
        <head>
        </head>
        <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <NextUIProvider>
            {children}
            <Toaster />
        </NextUIProvider>
        </body>
        </html>
    );
}
