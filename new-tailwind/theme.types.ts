export interface ThemeColors {
    background: string;
    card: string;
    border: string;
    matrixBorder: string;
    foreground: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    input: string;
    ring: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
}

export interface Theme {
    light: ThemeColors;
    dark: ThemeColors;
}

export type ThemeName = 'default' | 'contrastRed' | 'contrastBlue' | 'contrastGreen' | 'contrastViolet' | 'contrastYellow';