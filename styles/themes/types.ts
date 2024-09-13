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

export type Theme = {
    name: string;
    colors: ThemeColors;
};

export type ThemeMode = 'light' | 'dark';
