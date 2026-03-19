// components/AppletThemeProvider.tsx
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { AppletTheme } from "@/components/applet/reusable-sections/applet-themes";

interface AppletThemeContextType {
    theme: AppletTheme;
    setTheme: (theme: AppletTheme) => void;
}

const AppletThemeContext = createContext<AppletThemeContextType | null>(null);

export function AppletThemeProvider(
    {
        children,
        theme,
        appletKey,
    }: {
        children: ReactNode;
        theme: AppletTheme;
        appletKey: string;
    }) {
    // Map reusable-sections AppletTheme (Tailwind-oriented tokens) to CSS custom properties
    const themeStyles: Record<string, string> = {
        '--applet-primary': theme.primaryColor,
        '--applet-secondary': theme.secondaryColor,
        '--applet-accent': theme.accentColor,
        '--applet-background': theme.containerBg,
        '--applet-foreground': theme.titleText,
        '--applet-muted': theme.descriptionText,
        '--applet-border': theme.containerBorder,
    };

    return (
        <div
            data-applet={appletKey}
            className="applet-theme-root"
            style={themeStyles as CSSProperties}
        >
            <AppletThemeContext.Provider value={{
                theme, setTheme: () => {
                }
            }}>
                {children}
            </AppletThemeContext.Provider>
        </div>
    );
}



/*

// Example usage in an Applet component
export function AppletView({config, theme}: { config: AppletConfig; theme: AppletTheme }) {
    return (
        <AppletThemeProvider theme={theme} appletKey={config.key}>
            <div className="bg-applet-background text-applet-foreground">
                <header className="border-b border-applet-border">
                    <h1 className="text-applet-primary font-bold">{config.displayName}</h1>
                </header>
                <main className="bg-applet-background">
                    {/!* Your applets content here *!/}
                </main>
            </div>
        </AppletThemeProvider>
    );
}

*/
