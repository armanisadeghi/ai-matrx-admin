// File: styles/themes/themeDefinitions.ts

import {Theme, ThemeColor} from './types';

const createThemeColor = (light: string, dark: string): ThemeColor => ({light, dark});
const createTheme = (name: string, colors: Partial<Theme['colors']>): Theme => ({
    name,
    colors: {
        background: createThemeColor('#f5f5f5', '#020202'),
        card: createThemeColor('#f5f5f5', '#262626'),
        border: createThemeColor('#e6e6e6', '#404040'),
        matrixBorder: createThemeColor('#f5f5f5', '#404040'),
        foreground: createThemeColor('#000000', '#ffffff'),
        cardForeground: createThemeColor('#000000', '#ffffff'),
        popover: createThemeColor('#f4f5f5', '#1e4c4c'),
        popoverForeground: createThemeColor('#000000', '#ffffff'),
        primary: createThemeColor('#3b82f6', '#3b82f6'),
        primaryForeground: createThemeColor('#ffffff', '#1c2c4f'),
        secondary: createThemeColor('#8b5cf6', '#8b5cf6'),
        secondaryForeground: createThemeColor('#ffffff', '#fafcfe'),
        muted: createThemeColor('#e6f0e6', '#003300'),
        mutedForeground: createThemeColor('#737373', '#ffffff'),
        accent: createThemeColor('#f4f5f5', '#262626'),
        accentForeground: createThemeColor('#000000', '#fafafa'),
        destructive: createThemeColor('#ef4444', '#7f1d1d'),
        destructiveForeground: createThemeColor('#ffffff', '#ffffff'),
        input: createThemeColor('#e6f0f0', '#1e4c4c'),
        ring: createThemeColor('#3b82f6', '#0ea5e9'),
        chart1: createThemeColor('#4d79ff', '#4d79ff'),
        chart2: createThemeColor('#2eb872', '#2eb872'),
        chart3: createThemeColor('#ffa033', '#ffa033'),
        chart4: createThemeColor('#a64dff', '#a64dff'),
        chart5: createThemeColor('#ff4d7f', '#ff4d7f'),
        ...colors,
    },
    typography: {
        fontFamily: {
            sans: 'Inter, sans-serif',
            heading: 'Montserrat, sans-serif',
        },
        fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
        },
        fontWeight: {
            light: '300',
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
    },
});

export const defaultTheme = createTheme('Default', {});
export const contrastRedTheme = createTheme('Contrast Red', {
    primary: createThemeColor('#e11d48', '#e11d48'),
    primaryForeground: createThemeColor('#fff1f2', '#fff1f2'),
    secondary: createThemeColor('#f5f5f5', '#f5f5f5'),
    secondaryForeground: createThemeColor('#171717', '#171717'),
    muted: createThemeColor('#f5f5f5', '#f5f5f5'),
    mutedForeground: createThemeColor('#737373', '#737373'),
    accent: createThemeColor('#f5f5f5', '#f5f5f5'),
    accentForeground: createThemeColor('#171717', '#171717'),
    ring: createThemeColor('#e11d48', '#e11d48'),
});
export const contrastBlueTheme = createTheme('Contrast Blue', {
    primary: createThemeColor('#2563eb', '#2563eb'),
    primaryForeground: createThemeColor('#f8fafc', '#f8fafc'),
    secondary: createThemeColor('#f1f5f9', '#f1f5f9'),
    secondaryForeground: createThemeColor('#1e293b', '#1e293b'),
    muted: createThemeColor('#f1f5f9', '#f1f5f9'),
    mutedForeground: createThemeColor('#64748b', '#64748b'),
    accent: createThemeColor('#f1f5f9', '#f1f5f9'),
    accentForeground: createThemeColor('#1e293b', '#1e293b'),
    ring: createThemeColor('#2563eb', '#2563eb'),
});
export const contrastGreenTheme = createTheme('Contrast Green', {
    primary: createThemeColor('#16a34a', '#16a34a'),
    primaryForeground: createThemeColor('#fff1f2', '#fff1f2'),
    secondary: createThemeColor('#f5f5f5', '#f5f5f5'),
    secondaryForeground: createThemeColor('#1a1a1a', '#1a1a1a'),
    muted: createThemeColor('#f5f5f5', '#f5f5f5'),
    mutedForeground: createThemeColor('#757575', '#757575'),
    accent: createThemeColor('#f5f5f5', '#f5f5f5'),
    accentForeground: createThemeColor('#1a1a1a', '#1a1a1a'),
    ring: createThemeColor('#16a34a', '#16a34a'),
});
export const contrastVioletTheme = createTheme('Contrast Violet', {
    primary: createThemeColor('#7c3aed', '#7c3aed'),
    primaryForeground: createThemeColor('#fafcff', '#fafcff'),
    secondary: createThemeColor('#f4f4f8', '#f4f4f8'),
    secondaryForeground: createThemeColor('#1c1b22', '#1c1b22'),
    muted: createThemeColor('#f4f4f8', '#f4f4f8'),
    mutedForeground: createThemeColor('#6e6d74', '#6e6d74'),
    accent: createThemeColor('#f4f4f8', '#f4f4f8'),
    accentForeground: createThemeColor('#1c1b22', '#1c1b22'),
    ring: createThemeColor('#7c3aed', '#7c3aed'),
});
export const contrastYellowTheme = createTheme('Contrast Yellow', {
    primary: createThemeColor('#eab308', '#eab308'),
    primaryForeground: createThemeColor('#422006', '#422006'),
    secondary: createThemeColor('#fefce8', '#fefce8'),
    secondaryForeground: createThemeColor('#1c1917', '#1c1917'),
    muted: createThemeColor('#fefce8', '#fefce8'),
    mutedForeground: createThemeColor('#78716c', '#78716c'),
    accent: createThemeColor('#fefce8', '#fefce8'),
    accentForeground: createThemeColor('#1c1917', '#1c1917'),
    ring: createThemeColor('#eab308', '#eab308'),
});
export const themes: Theme[] = [
    defaultTheme,
    contrastRedTheme,
    contrastBlueTheme,
    contrastGreenTheme,
    contrastVioletTheme,
    contrastYellowTheme,
];
