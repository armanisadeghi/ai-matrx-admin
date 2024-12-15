// utils/tailwind-config/utilities.ts

export function createUtilities({ addUtilities, theme }: any) {
    const utilities = {
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
                ${theme('backgroundImage.noise-texture')}
            `,
            backgroundBlendMode: 'normal, overlay',
        },
        '.bg-texture-dark': {
            backgroundImage: `
                linear-gradient(to bottom, ${theme('colors.background')}, ${theme('colors.background')}),
                ${theme('backgroundImage.noise-texture')}
            `,
            backgroundBlendMode: 'normal, soft-light',
        }
    };

    addUtilities(utilities, ['responsive', 'hover', 'focus', 'dark']);
}
