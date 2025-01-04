// tailwind.config.ts
import type { Config } from "tailwindcss";
import { animations } from './utils/tailwind-config/animations';
import { colors } from './utils/tailwind-config/colors';
const {fontFamily} = require("tailwindcss/defaultTheme");
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
            colors,
            ...animations,
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
            gridTemplateColumns: {
                '24': 'repeat(24, minmax(0, 1fr))',
            },
            gridTemplateRows: {
                '24': 'repeat(24, minmax(0, 1fr))',
            }
        }
    },
    plugins: [
        ...plugins,
        function({ addUtilities, theme }) {
            addUtilities({ ...textureUtilities });
            createUtilities({ addUtilities, theme });
        }
    ]
};

export default config;
