// File Location: app/config/viewport.ts
import { Viewport } from "next"

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    // This tells browsers to resize the content when virtual keyboard appears
    // Supported by iOS Safari 15+, Chrome 108+, and modern in-app browsers like Tesla
    interactiveWidget: "resizes-content",
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "white"},
        {media: "(prefers-color-scheme: dark)", color: "black"},
    ],
}
