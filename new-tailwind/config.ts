import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background) / <alpha-value>)',
                card: 'hsl(var(--card) / <alpha-value>)',
                border: 'hsl(var(--border) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
                popover: 'hsl(var(--popover) / <alpha-value>)',
                'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
                primary: 'hsl(var(--primary) / <alpha-value>)',
                'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
                secondary: 'hsl(var(--secondary) / <alpha-value>)',
                'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
                muted: 'hsl(var(--muted) / <alpha-value>)',
                'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
                accent: 'hsl(var(--accent) / <alpha-value>)',
                'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
                destructive: 'hsl(var(--destructive) / <alpha-value>)',
                'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
                input: 'hsl(var(--input) / <alpha-value>)',
                ring: 'hsl(var(--ring) / <alpha-value>)',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [],
}

export default config