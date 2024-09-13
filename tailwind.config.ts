import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";

const { fontFamily } = require("tailwindcss/defaultTheme");
const { default: flattenColorPalette } = require("tailwindcss/lib/util/flattenColorPalette");

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./features/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)", ...fontFamily.sans],
                heading: ["var(--font-montserrat)", ...fontFamily.sans],
            },
            colors: {
                background: 'var(--background)',
                card: 'var(--card)',
                border: 'var(--border)',
                matrixBorder: 'var(--matrix-border)',
                foreground: 'var(--foreground)',
                cardForeground: 'var(--card-foreground)',
                popover: 'var(--popover)',
                popoverForeground: 'var(--popover-foreground)',
                primary: 'var(--primary)',
                primaryForeground: 'var(--primary-foreground)',
                secondary: 'var(--secondary)',
                secondaryForeground: 'var(--secondary-foreground)',
                muted: 'var(--muted)',
                mutedForeground: 'var(--muted-foreground)',
                accent: 'var(--accent)',
                accentForeground: 'var(--accent-foreground)',
                destructive: 'var(--destructive)',
                destructiveForeground: 'var(--destructive-foreground)',
                input: 'var(--input)',
                ring: 'var(--ring)',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                shimmer: {
                    from: {
                        backgroundPosition: "0 0",
                    },
                    to: {
                        backgroundPosition: "-200% 0",
                    },
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                shimmer: "shimmer 2s linear infinite",
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        require("flowbite/plugin"),
        nextui({
            prefix: "next-",
            addCommonColors: false,
            defaultTheme: "light",
            defaultExtendTheme: "light",
            layout: {},
        }),
        addVariablesForColors,
    ],
};

function addVariablesForColors({ addBase, theme }: any) {
    let allColors = flattenColorPalette(theme("colors"));
    let newVars = Object.fromEntries(
        Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
    );

    addBase({
        ":root": newVars,
    });
}

export default config;
