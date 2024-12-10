import type {Config} from "tailwindcss";
import {nextui} from "@nextui-org/react";
import animations from '@midudev/tailwind-animations'

const {fontFamily} = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");
const {default: flattenColorPalette} = require("tailwindcss/lib/util/flattenColorPalette");

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./constants/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./features/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                matrxBorder: 'var(--matrxBorder)',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
                    foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))"
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))"
                },
                matrxback: 'hsl(var(--matrx-background))',
                chart1: 'hsl(var(--chart-1))',
                chart2: 'hsl(var(--chart-2))',
                chart3: 'hsl(var(--chart-3))',
                chart4: 'hsl(var(--chart-4))',
                chart5: 'hsl(var(--chart-5))',
                accent2: 'hsl(var(--accent-2))',
                accent3: 'hsl(var(--accent-3))',
                info: 'hsl(var(--info))',
                primaryHover: 'hsl(var(--primary-hover))',
                secondaryHover: 'hsl(var(--secondary-hover))',
                accentHover: 'hsl(var(--accent-hover))',
                primaryActive: 'hsl(var(--primary-active))',
                secondaryActive: 'hsl(var(--secondary-active))',
                accentActive: 'hsl(var(--accent-active))',
                elevation1: 'hsl(var(--elevation-1))',
                elevation2: 'hsl(var(--elevation-2))',
                elevation3: 'hsl(var(--elevation-3))',
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                }
            },
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            fontSize: {
                xs: ['0.8rem', {lineHeight: '1.1rem'}],
                sm: ['0.95rem', {lineHeight: '1.3rem'}],
                base: ['1.05rem', {lineHeight: '1.6rem'}],
                lg: ['1.2rem', {lineHeight: '1.8rem'}],
                xl: ['1.35rem', {lineHeight: '1.9rem'}],
                '2xl': ['1.6rem', {lineHeight: '2.1rem'}],
                '3xl': ['2rem', {lineHeight: '2.4rem'}],
                '4xl': ['2.4rem', {lineHeight: '2.6rem'}],
                '5xl': ['3.2rem', {lineHeight: '1'}],
                '6xl': ['4rem', {lineHeight: '1'}],
                '7xl': ['4.8rem', {lineHeight: '1'}],
                '8xl': ['6.4rem', {lineHeight: '1'}],
                '9xl': ['8.2rem', {lineHeight: '1'}]
            },
            fontFamily: {
                sans: ["var(--typography-fontFamily-sans)", ...fontFamily.sans],
                heading: ["var(--typography-fontFamily-heading)", ...fontFamily.sans]
            },
            keyframes: {
                'spin': {
                    from: {
                        transform: 'rotate(0deg)'
                    },
                    to: {
                        transform: 'rotate(360deg)'
                    }
                },
                'spinner': {
                    from: {
                        transform: 'rotate(0deg)'
                    },
                    to: {
                      transform: 'rotate(360deg)'
                    }
                },
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                },
                'caret-blink': {
                    '0%,70%,100%': {
                        opacity: '1'
                    },
                    '20%,50%': {
                        opacity: '0'
                    }
                },
                'slide-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-collapsible-content-height)' }
                },
                'slide-up': {
                    from: { height: 'var(--radix-collapsible-content-height)' },
                    to: { height: '0' }
                },
                shimmer: {
                    from: {
                        backgroundPosition: '0 0'
                    },
                    to: {
                        backgroundPosition: '-200% 0'
                    }
                },
                'hover-bounce': {
                    '0%, 100%': {
                        transform: 'translateY(0)'
                    },
                    '50%': {
                        transform: 'translateY(-8px)'
                    }
                },
                'fade-in': {
                    '0%': {
                        opacity: '0'
                    },
                    '100%': {
                        opacity: '1'
                    }
                },
                'fade-out': {
                    '0%': {
                        opacity: '1'
                    },
                    '100%': {
                        opacity: '0'
                    }
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                slowPulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                glow: {
                    '0%': {
                        filter: 'drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 12px var(--glow-color))'
                    },
                    '100%': {
                        filter: 'drop-shadow(0 0 12px var(--glow-color)) drop-shadow(0 0 20px var(--glow-color))'
                    }
                },

            },
            animation: {
                'accordion-down': 'accordion-down 0.4s ease-out',
                'accordion-up': 'accordion-up 0.4s ease-out',
                'caret-blink': 'caret-blink 1.25s ease-out infinite',
                shimmer: 'shimmer 2s linear infinite',
                'hover-bounce': 'hover-bounce 0.3s var(--animated-menu-bounce)',
                'fade-in': 'fade-in 0.4s ease-in-out',
                'fade-out': 'fade-out 0.4s ease-in-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin': 'spin 1s linear infinite',
                pizza: 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',

                'pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                slowPulse: 'slowPulse 5s ease-in-out infinite',

                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-down': 'slide-down 0.5s ease-out',
                'slide-up': 'slide-up 0.3s ease-out'

            },
            boxShadow: {
                input: '`0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)`'
            },
            backgroundImage: {
                'gradient-1': 'var(--gradient-1)',
                'gradient-2': 'var(--gradient-2)',
                'gradient-3': 'var(--gradient-3)',
                checkerboard: 'var(--checkerboard)',
                // 'matrx-background': 'var(--matrx-background)',
                'matrx-card-background': 'var(--matrx-card-background)'
            },
            transitionTimingFunction: {
                bounce: 'var(--animated-menu-bounce)',
                smooth: 'var(--animated-menu-smooth)'
            },
            gridTemplateColumns: {
                '24': 'repeat(24, minmax(0, 1fr))',
            },
            gridTemplateRows: {
                '24': 'repeat(24, minmax(0, 1fr))',
            },
        }
    },
    plugins: [
        require("tailwindcss-animate"),
        require("@xpd/tailwind-3dtransforms"),
        require("flowbite/plugin"),
        require('tailwind-scrollbar'),
        require('tailwind-scrollbar-hide'),
        require('tailwindcss-3d'),
        nextui({
            prefix: "next-",
            addCommonColors: false,
            defaultTheme: "dark",
            defaultExtendTheme: "dark",
            layout: {},
        }),
        addVariablesForColors,
        animations,
        function ({addUtilities, variants, theme}) {
            const newUtilities = {
                '.animate-glow': {
                    animation: 'glow 2s ease-in-out infinite alternate'
                },
                '.glow': {
                    '--glow-color': 'currentColor',
                    filter: 'drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 12px var(--glow-color))'
                },
                '.glow-strong': {
                    '--glow-color': 'currentColor',
                    filter: 'drop-shadow(0 0 12px var(--glow-color)) drop-shadow(0 0 20px var(--glow-color))'
                },

                '.bg-matrx-back': {
                    backgroundImage: `${theme('backgroundImage.matrx-texture')}`,
                    backgroundColor: 'hsl(var(--background))',
                },
                '.bg-matrx-card-back': {
                    backgroundImage: `${theme('backgroundImage.matrx-card-texture')}`,
                    backgroundColor: 'hsl(var(--background))',
                },

                '.bg-texture-light': {
                    backgroundImage: `
                    linear-gradient(to bottom, ${theme('colors.background')}, ${theme('colors.background')}),
                    ${theme('backgroundImage.noise-texture')}`,
                    backgroundBlendMode: 'normal, overlay',
                },
                '.bg-texture-dark': {
                    backgroundImage: `
                    linear-gradient(to bottom, ${theme('colors.background')}, ${theme('colors.background')}),
                    ${theme('backgroundImage.noise-texture')}`,
                    backgroundBlendMode: 'normal, soft-light',
                },


                '.texture-dots': {
                    backgroundImage: 'radial-gradient(currentColor 0.2px, transparent 0.2px)',
                    backgroundSize: '5px 5px',
                },
                // Variation 1: Larger dots with more spacing
                '.texture-dots-large': {
                    backgroundImage: 'radial-gradient(currentColor 0.4px, transparent 0.4px)',
                    backgroundSize: '8px 8px',
                },
                // Variation 2: Slightly larger than medium dots
                '.texture-dots-medium-large': {
                    backgroundImage: 'radial-gradient(currentColor 0.3px, transparent 0.3px)',
                    backgroundSize: '6px 6px',
                },
                // Variation 3: Medium dots (adjusted for better visibility)
                '.texture-dots-medium': {
                    backgroundImage: 'radial-gradient(currentColor 0.25px, transparent 0.25px)',
                    backgroundSize: '5px 5px',
                },
                // Variation 4: Medium-small dots
                '.texture-dots-medium-small': {
                    backgroundImage: 'radial-gradient(currentColor 0.18px, transparent 0.18px)',
                    backgroundSize: '4px 4px',
                },
                // Variation 5: Smaller dots (adjusted to improve clarity)
                '.texture-dots-small': {
                    backgroundImage: 'radial-gradient(currentColor 0.12px, transparent 0.12px)',
                    backgroundSize: '3px 3px',
                },
                // Variation 6: Tiny dots (increased size to reduce blurriness)
                '.texture-dots-tiny': {
                    backgroundImage: 'radial-gradient(currentColor 0.08px, transparent 0.08px)',
                    backgroundSize: '2px 2px',
                },
                // Variation 7: Ultra-fine dots (slightly increased for visibility)
                '.texture-dots-ultra-fine': {
                    backgroundImage: 'radial-gradient(currentColor 0.05px, transparent 0.05px)',
                    backgroundSize: '2px 2px',
                },
                // Variation 8: Balanced small-to-medium dots
                '.texture-dots-balanced': {
                    backgroundImage: 'radial-gradient(currentColor 0.25px, transparent 0.25px)',
                    backgroundSize: '4.5px 4.5px',
                },
                // Variation 9: Tighter mid-size dots (adjusted for better density)
                '.texture-dots-tight': {
                    backgroundImage: 'radial-gradient(currentColor 0.22px, transparent 0.22px)',
                    backgroundSize: '4px 4px',
                },
                // Variation 10: Superfine dots (increased size for visibility)
                '.texture-dots-superfine': {
                    backgroundImage: 'radial-gradient(currentColor 0.04px, transparent 0.04px)',
                    backgroundSize: '1.5px 1.5px',
                },


                '.texture-lines': {
                    backgroundImage: 'linear-gradient(to right, currentColor 0.5px, transparent 0.5px), linear-gradient(to bottom, currentColor 0.5px, transparent 0.5px)',
                    backgroundSize: '20px 20px',
                },
                '.texture-noise': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-1': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-2': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.15\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-3': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.2\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.25\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-4': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'0.5\' numOctaves=\'5\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.18\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-5': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' seed=\'5\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.22\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-6': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'1\' numOctaves=\'4\' seed=\'10\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.2\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-7': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'5\' seed=\'15\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.17\'/%3E%3C/svg%3E")',
                },
                '.texture-noise-8': {
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'turbulence\' baseFrequency=\'1.5\' numOctaves=\'2\' seed=\'20\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.23\'/%3E%3C/svg%3E")',
                },
            };
            addUtilities(newUtilities, ['responsive', 'hover', 'focus', 'dark']);
        },
    ],
};

function addVariablesForColors({addBase, theme}: any) {
    let allColors = flattenColorPalette(theme("colors"));
    let newVars = Object.fromEntries(
        Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
    );
    addBase({
        ":root": newVars,
    });
}


export default config;
