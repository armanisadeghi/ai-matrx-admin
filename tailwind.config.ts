import type { Config } from "tailwindcss";
import { colors } from './utils/tailwind-config/colors';
const { fontFamily } = require("tailwindcss/defaultTheme");
import { textureUtilities } from './utils/tailwind-config/textures';
import { createUtilities } from './utils/tailwind-config/utilities';
import { plugins } from './utils/tailwind-config/plugins';

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./constants/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./features/**/*.{js,ts,jsx,tsx,mdx}",
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
            gridTemplateColumns: {
                '12': 'repeat(12, minmax(0, 1fr))',
                '24': 'repeat(24, minmax(0, 1fr))',
            },
            gridTemplateRows: {
                '12': 'repeat(12, minmax(0, 1fr))',
                '24': 'repeat(24, minmax(0, 1fr))',
            },        
            colors,
            keyframes: {
                spin: {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                },
                spinner: {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                },
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "caret-blink": {
                    "0%,70%,100%": { opacity: "1" },
                    "20%,50%": { opacity: "0" },
                },
                "slide-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-collapsible-content-height)" },
                },
                "slide-up": {
                    from: { height: "var(--radix-collapsible-content-height)" },
                    to: { height: "0" },
                },
                shimmer: {
                    from: { backgroundPosition: "0 0" },
                    to: { backgroundPosition: "-200% 0" },
                },
                "hover-bounce": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                "fade-in": {
                    "0%": {
                        opacity: "0",
                        transform: "scale(0.95)",
                    },
                    "100%": {
                        opacity: "1",
                        transform: "scale(1)",
                    },
                },
                "fade-out": {
                    "0%": {
                        opacity: "1",
                        transform: "scale(1)",
                    },
                    "100%": {
                        opacity: "0",
                        transform: "scale(0.95)",
                    },
                },
                fadeInOut: {
                    "0%": { opacity: "0" },
                    "15%": { opacity: "1" },
                    "85%": { opacity: "1" },
                    "100%": { opacity: "0" },
                },
                pulse: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
                slowPulse: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                glow: {
                    "0%": {
                        filter: "drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 12px var(--glow-color))",
                    },
                    "100%": {
                        filter: "drop-shadow(0 0 12px var(--glow-color)) drop-shadow(0 0 20px var(--glow-color))",
                    },
                },
                "glow-sweep": {
                    "0%": {
                        backgroundPosition: "-100% 0",
                    },
                    "50%": {
                        backgroundPosition: "200% 0",
                    },
                    "100%": {
                        backgroundPosition: "-100% 0",
                    },
                },
                "scale-in": {
                    "0%": {
                        opacity: "0",
                        transform: "scale(0.95) translateY(10px)",
                    },
                    "100%": {
                        opacity: "1",
                        transform: "scale(1) translateY(0)",
                    },
                },
                "scale-out": {
                    "0%": {
                        opacity: "1",
                        transform: "scale(1) translateY(0)",
                    },
                    "100%": {
                        opacity: "0",
                        transform: "scale(0.95) translateY(10px)",
                    },
                },
                fadeIn: {
                    "0%": {
                        opacity: "0",
                        transform: "translateY(-10px)",
                    },
                    "100%": {
                        opacity: "1",
                        transform: "translateY(0)",
                    },
                },
                "smooth-drop": {
                    "0%": { height: "0" },
                    "100%": { height: "auto" },
                },
                "smooth-lift": {
                    "0%": { height: "auto" },
                    "100%": { height: "0" },
                },
                "float-particle": {
                    "0%, 100%": {
                        transform: "translateY(0) translateX(0)",
                        opacity: "0.2",
                    },
                    "25%": {
                        transform: "translateY(-10px) translateX(5px)",
                        opacity: "0.5",
                    },
                    "50%": {
                        transform: "translateY(-5px) translateX(10px)",
                        opacity: "0.3",
                    },
                    "75%": {
                        transform: "translateY(5px) translateX(-5px)",
                        opacity: "0.4",
                    },
                },
                "pulse-line": {
                    "0%, 100%": {
                        opacity: "0.1",
                    },
                    "50%": {
                        opacity: "0.3",
                    },
                },
                sparkle: {
                    "0%, 100%": {
                        opacity: "1",
                        transform: "scale(1)",
                    },
                    "50%": {
                        opacity: "0.8",
                        transform: "scale(1.2)",
                    },
                },
                "thinking-text": {
                    "0%": {
                        opacity: "0.3",
                    },
                    "15%": {
                        opacity: "1",
                    },
                    "85%": {
                        opacity: "1",
                    },
                    "100%": {
                        opacity: "0.3",
                    },
                },
                pulseWave: {
                    '0%': { opacity: '0.3', transform: 'scale(0.8)' },
                    '50%': { opacity: '1', transform: 'scale(1)' },
                    '100%': { opacity: '0.3', transform: 'scale(0.8)' },
                },
                progressSpin: {
                    '0%': { strokeDashoffset: '88' },
                    '100%': { strokeDashoffset: '0' },
                },
                bounce: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                textFade: {
                    '0%': { opacity: '0', transform: 'translateY(5px)' },
                    '10%': { opacity: '1', transform: 'translateY(0)' },
                    '23%': { opacity: '1', transform: 'translateY(0)' },
                    '33%': { opacity: '0', transform: 'translateY(-5px)' },
                    '100%': { opacity: '0' },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.4s ease-out",
                "accordion-up": "accordion-up 0.4s ease-out",
                "caret-blink": "caret-blink 1.25s ease-out infinite",
                shimmer: "shimmer 2s linear infinite",
                "hover-bounce": "hover-bounce 0.3s var(--animated-menu-bounce)",
                "fade-in": "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "fade-out": "fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "fade-in-out": "fadeInOut 2s ease-in-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                spin: "spin 1s linear infinite",
                pizza: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                pulse: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                slowPulse: "slowPulse 5s ease-in-out infinite",
                glow: "glow 2s ease-in-out infinite alternate",
                "glow-sweep": "glow-sweep 3s ease-in-out infinite",
                "slide-down": "slide-down 0.5s ease-out",
                "slide-up": "slide-up 0.3s ease-out",
                "scale-in": "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "scale-out": "scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                fadeIn: "fadeIn 0.2s ease-out forwards",
                "smooth-drop": "smooth-drop 0.6s ease-in-out",
                "smooth-lift": "smooth-lift 0.6s ease-in-out",
                "float-particle": "float-particle 5s linear infinite",
                "pulse-line": "pulse-line 3s ease-in-out infinite",
                sparkle: "sparkle 1.5s ease-in-out infinite",
                "thinking-text": "thinking-text 2.5s ease-in-out infinite",
                'pulse-wave': 'pulseWave 1.5s infinite ease-in-out',
                'progress-spin': 'progressSpin 3s infinite linear',
                'bounce': 'bounce 1s infinite ease-in-out',
                'text-fade': 'textFade 12s infinite',
            },
            minWidth: {
                '128': '32rem',
            },
            maxWidth: {
                // Adding the specific percentage-based value
                '[80%]': '80%',
                '[90%]': '90%', // Adding 90% for mobile use
            },
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            fontSize: {
                '2xs': ['0.6rem', {lineHeight: '0.9rem'}],
                xs: ['0.8rem', {lineHeight: '1.1rem'}],
                sm: ['0.85rem', {lineHeight: '1.2rem'}],
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
                sans: [
                    "var(--font-inter)",
                    "var(--font-opensans)", 
                    "var(--font-roboto)",
                    "var(--typography-fontFamily-sans)", 
                    ...fontFamily.sans
                ],
                heading: ["var(--typography-fontFamily-heading)", ...fontFamily.sans],
                mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
            },
            boxShadow: {
                input: '0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)'
            },
            backgroundImage: {
                'gradient-1': 'var(--gradient-1)',
                'gradient-2': 'var(--gradient-2)',
                'gradient-3': 'var(--gradient-3)',
                checkerboard: 'var(--checkerboard)',
                'matrx-card-background': 'var(--matrx-card-background)'
            },
            containerQueries: {
                sm: '30rem',
                md: '45rem',
                lg: '64rem',
            },
            transitionTimingFunction: {
                bounce: 'var(--animated-menu-bounce)',
                smooth: 'var(--animated-menu-smooth)'
            },
            zIndex: {
                'dropdown': 'var(--z-dropdown)',
                'sticky': 'var(--z-sticky)',
                'fixed': 'var(--z-fixed)',
                'modal-backdrop': 'var(--z-modal-backdrop)',
                'modal': 'var(--z-modal)',
                'popover': 'var(--z-popover)',
                'tooltip': 'var(--z-tooltip)',
                'notification': 'var(--z-notification)',
                'max': 'var(--z-max)',
            },
            typography: {
                DEFAULT: {
                    css: {
                        fontFamily: 'var(--font-inter), var(--font-opensans), var(--font-roboto), var(--typography-fontFamily-sans), ui-sans-serif, system-ui, sans-serif',
                        lineHeight: 1.6,
                        color: 'hsl(var(--foreground))',
                        maxWidth: 'none',
                        p: {
                            marginBottom: '1rem',
                            color: 'hsl(var(--foreground))',
                        },
                        a: {
                            color: 'hsl(var(--primary))',
                            textDecoration: 'none',
                            fontWeight: '500',
                            '&:hover': {
                                color: 'hsl(var(--primary))',
                                textDecoration: 'underline',
                            },
                        },
                        strong: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                        },
                        h1: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '700',
                        },
                        h2: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                        },
                        h3: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                        },
                        h4: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                        },
                        code: {
                            color: 'hsl(var(--foreground))',
                            backgroundColor: 'hsl(var(--muted))',
                            borderRadius: '0.25rem',
                            padding: '0.125rem 0.25rem',
                            fontWeight: '500',
                        },
                        'code::before': {
                            content: '""',
                        },
                        'code::after': {
                            content: '""',
                        },
                        pre: {
                            backgroundColor: 'hsl(var(--muted))',
                            color: 'hsl(var(--foreground))',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                        },
                        'pre code': {
                            backgroundColor: 'transparent',
                            padding: '0',
                        },
                        blockquote: {
                            color: 'hsl(var(--muted-foreground))',
                            borderLeftColor: 'hsl(var(--border))',
                            fontStyle: 'italic',
                        },
                        hr: {
                            borderColor: 'hsl(var(--border))',
                        },
                        ol: {
                            color: 'hsl(var(--foreground))',
                        },
                        ul: {
                            color: 'hsl(var(--foreground))',
                        },
                        li: {
                            color: 'hsl(var(--foreground))',
                        },
                        'ol > li::marker': {
                            color: 'hsl(var(--muted-foreground))',
                        },
                        'ul > li::marker': {
                            color: 'hsl(var(--muted-foreground))',
                        },
                        table: {
                            color: 'hsl(var(--foreground))',
                        },
                        thead: {
                            borderBottomColor: 'hsl(var(--border))',
                        },
                        'thead th': {
                            color: 'hsl(var(--foreground))',
                        },
                        'tbody tr': {
                            borderBottomColor: 'hsl(var(--border))',
                        },
                        'tbody td': {
                            color: 'hsl(var(--foreground))',
                        },
                    },
                },
            },
        }
    },
    plugins: [
        ...plugins,
        require('@tailwindcss/typography'),
        function({ addUtilities, theme }) {
            addUtilities({ ...textureUtilities });
            createUtilities({ addUtilities, theme });
        },
    ]
};

export default config;