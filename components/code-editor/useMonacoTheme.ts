import { useState, useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";

export const useMonacoTheme = () => {
    const monaco = useMonaco();
    const [isDark, setIsDark] = useState(() =>
        typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false
    );

    useEffect(() => {
        if (monaco) {
            // Define custom themes
            monaco.editor.defineTheme("customDark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                    "editor.background": "#1a1b26",
                },
            });

            monaco.editor.defineTheme("customLight", {
                base: "vs",
                inherit: true,
                rules: [],
                colors: {
                    "editor.background": "#ffffff",
                },
            });

            // Set initial theme
            monaco.editor.setTheme(isDark ? "customDark" : "customLight");
        }

        // Setup theme observer
        const updateTheme = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
            if (monaco) {
                monaco.editor.setTheme(isDarkMode ? "customDark" : "customLight");
            }
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
