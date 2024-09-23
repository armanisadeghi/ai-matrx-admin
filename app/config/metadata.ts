// File Location: app/config/metadata.ts
import { Metadata } from "next"
import { siteConfig } from "@/config/extras/site"

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
        creator: "@your_twitter_handle",
    },
    icons: {
        icon: [
            {url: "/favicon.ico", sizes: "any"},
            {url: "/favicon.svg", type: "image/svg+xml"},
        ],
        apple: "/apple-touch-icon.png",
        shortcut: "/favicon.ico",
    },
    manifest: "/site.webmanifest",
}
