import { Theme } from './types';

function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export const defaultTheme: Theme = {
    name: 'Default',
    colors: {
        background: { light: '#f5f5f5', dark: '#020202' },
        card: { light: '#f5f5f5', dark: '#262626' },
        border: { light: '#e6e6e6', dark: '#404040' },
        matrixBorder: { light: '#f5f5f5', dark: '#404040' },
        foreground: { light: '#000000', dark: '#ffffff' },
        cardForeground: { light: '#000000', dark: '#ffffff' },
        popover: { light: '#f4f5f5', dark: '#1e4c4c' },
        popoverForeground: { light: '#000000', dark: '#ffffff' },
        primary: { light: '#3b82f6', dark: '#3b82f6' },
        primaryForeground: { light: '#ffffff', dark: '#1c2c4f' },
        secondary: { light: '#8b5cf6', dark: '#8b5cf6' },
        secondaryForeground: { light: '#ffffff', dark: '#fafcfe' },
        muted: { light: '#e6f0e6', dark: '#003300' },
        mutedForeground: { light: '#737373', dark: '#ffffff' },
        accent: { light: '#f4f5f5', dark: '#262626' },
        accentForeground: { light: '#000000', dark: '#fafafa' },
        destructive: { light: '#ef4444', dark: '#7f1d1d' },
        destructiveForeground: { light: '#ffffff', dark: '#ffffff' },
        input: { light: '#e6f0f0', dark: '#1e4c4c' },
        ring: { light: '#3b82f6', dark: '#0ea5e9' },
        chart1: { light: '#4d79ff', dark: '#4d79ff' },
        chart2: { light: '#2eb872', dark: '#2eb872' },
        chart3: { light: '#ffa033', dark: '#ffa033' },
        chart4: { light: '#a64dff', dark: '#a64dff' },
        chart5: { light: '#ff4d7f', dark: '#ff4d7f' },
    },
};

export const contrastRedTheme: Theme = {
    name: 'Contrast Red',
    colors: {
        ...defaultTheme.colors,
        primary: { light: '#e11d48', dark: '#e11d48' },
        primaryForeground: { light: '#fff1f2', dark: '#fff1f2' },
        secondary: { light: '#f5f5f5', dark: '#f5f5f5' },
        secondaryForeground: { light: '#171717', dark: '#171717' },
        muted: { light: '#f5f5f5', dark: '#f5f5f5' },
        mutedForeground: { light: '#737373', dark: '#737373' },
        accent: { light: '#f5f5f5', dark: '#f5f5f5' },
        accentForeground: { light: '#171717', dark: '#171717' },
        ring: { light: '#e11d48', dark: '#e11d48' },
    },
};

export const contrastBlueTheme: Theme = {
    name: 'Contrast Blue',
    colors: {
        ...defaultTheme.colors,
        primary: { light: '#2563eb', dark: '#2563eb' },
        primaryForeground: { light: '#f8fafc', dark: '#f8fafc' },
        secondary: { light: '#f1f5f9', dark: '#f1f5f9' },
        secondaryForeground: { light: '#1e293b', dark: '#1e293b' },
        muted: { light: '#f1f5f9', dark: '#f1f5f9' },
        mutedForeground: { light: '#64748b', dark: '#64748b' },
        accent: { light: '#f1f5f9', dark: '#f1f5f9' },
        accentForeground: { light: '#1e293b', dark: '#1e293b' },
        ring: { light: '#2563eb', dark: '#2563eb' },
    },
};

export const contrastGreenTheme: Theme = {
    name: 'Contrast Green',
    colors: {
        ...defaultTheme.colors,
        primary: { light: '#16a34a', dark: '#16a34a' },
        primaryForeground: { light: '#fff1f2', dark: '#fff1f2' },
        secondary: { light: '#f5f5f5', dark: '#f5f5f5' },
        secondaryForeground: { light: '#1a1a1a', dark: '#1a1a1a' },
        muted: { light: '#f5f5f5', dark: '#f5f5f5' },
        mutedForeground: { light: '#757575', dark: '#757575' },
        accent: { light: '#f5f5f5', dark: '#f5f5f5' },
        accentForeground: { light: '#1a1a1a', dark: '#1a1a1a' },
        ring: { light: '#16a34a', dark: '#16a34a' },
    },
};

export const contrastVioletTheme: Theme = {
    name: 'Contrast Violet',
    colors: {
        ...defaultTheme.colors,
        primary: { light: '#7c3aed', dark: '#7c3aed' },
        primaryForeground: { light: '#fafcff', dark: '#fafcff' },
        secondary: { light: '#f4f4f8', dark: '#f4f4f8' },
        secondaryForeground: { light: '#1c1b22', dark: '#1c1b22' },
        muted: { light: '#f4f4f8', dark: '#f4f4f8' },
        mutedForeground: { light: '#6e6d74', dark: '#6e6d74' },
        accent: { light: '#f4f4f8', dark: '#f4f4f8' },
        accentForeground: { light: '#1c1b22', dark: '#1c1b22' },
        ring: { light: '#7c3aed', dark: '#7c3aed' },
    },
};

export const contrastYellowTheme: Theme = {
    name: 'Contrast Yellow',
    colors: {
        ...defaultTheme.colors,
        primary: { light: '#eab308', dark: '#eab308' },
        primaryForeground: { light: '#422006', dark: '#422006' },
        secondary: { light: '#fefce8', dark: '#fefce8' },
        secondaryForeground: { light: '#1c1917', dark: '#1c1917' },
        muted: { light: '#fefce8', dark: '#fefce8' },
        mutedForeground: { light: '#78716c', dark: '#78716c' },
        accent: { light: '#fefce8', dark: '#fefce8' },
        accentForeground: { light: '#1c1917', dark: '#1c1917' },
        ring: { light: '#eab308', dark: '#eab308' },
    },
};

export const themes: Theme[] = [
    defaultTheme,
    contrastRedTheme,
    contrastBlueTheme,
    contrastGreenTheme,
    contrastVioletTheme,
    contrastYellowTheme,
];
