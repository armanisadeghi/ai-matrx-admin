// components/AppletThemeProvider.tsx
import {createContext, useContext, ReactNode} from 'react';
import {AppletTheme} from "@/app/(authenticated)/applets/concepts/theme";

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
    // Convert theme colors to CSS custom properties
    const themeStyles = {
        [`--applet-primary`]: theme.colors.primary,
        [`--applet-secondary`]: theme.colors.secondary,
        [`--applet-accent`]: theme.colors.accent,
        [`--applet-background`]: theme.colors.background,
        [`--applet-foreground`]: theme.colors.foreground,
        [`--applet-muted`]: theme.colors.muted,
        [`--applet-border`]: theme.colors.border,
        // Add any custom gradients
        ...(theme.gradients && {
            [`--applet-gradient-primary`]: theme.gradients.primary,
            [`--applet-gradient-secondary`]: theme.gradients.secondary,
        }),
        // Add custom typography
        ...(theme.typography && {
            [`--applet-font-family`]: theme.typography.fontFamily,
            [`--applet-heading-family`]: theme.typography.headingFamily,
        }),
    };

    return (
        <div
            data-applet={appletKey}
            className="applet-theme-root"
            //@ts-ignore
            style={themeStyles}
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
