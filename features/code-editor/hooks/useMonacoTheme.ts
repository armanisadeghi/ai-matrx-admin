import { useState, useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";

export const useMonacoTheme = () => {
    const monaco = useMonaco();
    const [isDark, setIsDark] = useState(() =>
        typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false
    );

    useEffect(() => {
        // SIMPLE FIX: Don't set themes globally via this hook
        // Let individual editors control their own themes
        // This hook now just tracks dark mode state
        
        // Setup theme observer to track system dark mode
        const updateTheme = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    updateTheme();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, [monaco]);

    return isDark;
};
