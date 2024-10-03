// File: styles/themes/flashcards.types.ts

export type ThemeColor = {
    light: string;
    dark: string;
};

export type ThemeColors = {
    background: ThemeColor;
    card: ThemeColor;
    border: ThemeColor;
    matrixBorder: ThemeColor;
    foreground: ThemeColor;
    cardForeground: ThemeColor;
    popover: ThemeColor;
    popoverForeground: ThemeColor;
    primary: ThemeColor;
    primaryForeground: ThemeColor;
    secondary: ThemeColor;
    secondaryForeground: ThemeColor;
    muted: ThemeColor;
    mutedForeground: ThemeColor;
    accent: ThemeColor;
    accentForeground: ThemeColor;
    destructive: ThemeColor;
    destructiveForeground: ThemeColor;
    input: ThemeColor;
    ring: ThemeColor;
    chart1: ThemeColor;
    chart2: ThemeColor;
    chart3: ThemeColor;
    chart4: ThemeColor;
    chart5: ThemeColor;
};

export type Typography = {
    fontFamily: {
        sans: string;
        heading: string;
    };
    fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
    };
    fontWeight: {
        light: string;
        normal: string;
        medium: string;
        semibold: string;
        bold: string;
    };
};

export type Theme = {
    name: string;
    colors: ThemeColors;
    typography: Typography;
};

export type ThemeMode = 'light' | 'dark';
