// File Location: @/app/layout.tsx

import "@/styles/globals.css"
import {Metadata, Viewport} from "next"
import {siteConfig} from "@/config/extras/site";
import {ThemeProvider} from "@/components/layout/ThemeProvider";

import {Toaster} from "@/components/ui/toaster";
import {cn} from "@/lib/utils";
import {inter, montserrat} from "@/lib/fonts";
import {NextUIProvider} from "@nextui-org/react";
import Script from 'next/script';


export const metadata: Metadata = {
    title: {
        default: "App Matrx",
        template: `%s - App Matrx`,
    },
    description: "App Matrx is a revolutionary no-code AI platform that empowers businesses to build sophisticated AI applications without writing a single line of code. Unleash the power of AI with our intuitive drag-and-drop interface and pre-built components, streamlining your workflows and automating complex tasks. Experience the future of business automation with App Matrx.",
    keywords: [
        "App Matrx",
        "AI",
        "Artificial Intelligence",
        "No-Code",
        "Low-Code",
        "Automation",
        "Workflow Automation",
        "Business Automation",
        "AI Platform",
        "AI Tools",
        "AI Applications",
        "Drag-and-Drop",
        "Machine Learning",
        "Deep Learning",
        "Natural Language Processing",
        "Computer Vision",
        "Data Science",
        "AI for Business",
        "AI Solutions",
        "AI Innovation",
        "Future of Work",
        "Digital Transformation"
    ],
    authors: [
        {
            name: "Armani Sadeghi",
            url: "https://appmatrix.com",
        },
    ],
    creator: "Armani Sadeghi",
    openGraph: {
        type: "website",
        locale: "en_US",
        // url: siteConfig.url,
        title: "App Matrx",
        description: "App Matrx is a revolutionary no-code AI platform that empowers businesses to build sophisticated AI applications without writing a single line of code. Unleash the power of AI with our intuitive drag-and-drop interface and pre-built components, streamlining your workflows and automating complex tasks. Experience the future of business automation with App Matrx.",
        siteName: "App Matrx",
        images: [
            {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: "App Matrx",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "App Matrx",
        description: "A large-scale application built with Next.js and Shadcn UI",
        images: [siteConfig.ogImage],
        creator: "@your_twitter_handle", // Replace with your actual Twitter handle
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon-16x16.png",
        apple: "/apple-touch-icon.png",
    },
    // manifest: `${siteConfig.url}/site.webmanifest`,
}

export const viewport: Viewport = {
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "white"},
        {media: "(prefers-color-scheme: dark)", color: "black"},
    ],
}

interface RootLayoutProps {
    children: React.ReactNode
}

export default function RootLayout({children}: RootLayoutProps) {
    return (
        <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${montserrat.variable}`}>
        <head>
            <Script id="theme-script" strategy="beforeInteractive">
                {`
                    (function() {
                        function getInitialTheme() {
                            if (typeof window !== 'undefined') {
                                const storedTheme = localStorage.getItem('theme');
                                if (storedTheme === 'light') {
                                    return 'light';
                                }
                            }
                            return 'dark'; // Default to dark
                        }
                        
                        const theme = getInitialTheme();
                        document.documentElement.classList.toggle('dark', theme === 'dark');
                        document.documentElement.style.colorScheme = theme;
                    })();
                    `}
            </Script>
        </head>
        <body
            className={cn(
                "min-h-screen bg-background font-sans antialiased",
            )}
        >
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
            <NextUIProvider>
                {children}
                <Toaster/>
            </NextUIProvider>
        </ThemeProvider>
        </body>
        </html>
    )
}
