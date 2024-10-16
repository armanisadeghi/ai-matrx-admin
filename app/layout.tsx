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
    console.log("Server Layout: GROQ_API_KEY: ",process.env.GROQ_API_KEY);

    return (
        <html lang="en" data-theme={theme} className={cn("dark", inter.variable, montserrat.variable)} suppressHydrationWarning>
        <head>
        </head>
        <body className={cn("min-h-screen bg-matrx-background font-sans antialiased")}>
        <NextUIProvider>
            {children}
            <Toaster />
        </NextUIProvider>
        </body>
        </html>
    );
}
