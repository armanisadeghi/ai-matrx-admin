// utils/tailwind-config/utilities.ts
export function createUtilities({ addUtilities, theme }: any) {
    const utilities = {
        ".animate-glow": {
            animation: "glow 2s ease-in-out infinite alternate",
        },
        ".glow": {
            "--glow-color": "currentColor",
            filter: "drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 12px var(--glow-color))",
        },
        ".glow-strong": {
            "--glow-color": "currentColor",
            filter: "drop-shadow(0 0 12px var(--glow-color)) drop-shadow(0 0 20px var(--glow-color))",
        },
        // New utilities for the glow-sweep effect
        ".glow-text": {
            position: "relative",
            "--glow-color": "rgba(59, 130, 246, 0.5)",
            textShadow: "0 0 8px var(--glow-color)",
            isolation: "isolate",
        },
        ".glow-text-blue": {
            "--glow-color": "rgba(59, 130, 246, 0.5)",
        },
        ".glow-text-purple": {
            "--glow-color": "rgba(139, 92, 246, 0.5)",
        },
        ".glow-text-cyan": {
            "--glow-color": "rgba(34, 211, 238, 0.5)",
        },
        ".glow-sweep": {
            position: "relative",
            overflow: "hidden",
            "&::before": {
                content: '""',
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background: "linear-gradient(90deg, transparent, var(--glow-color), transparent)",
                backgroundSize: "200% 100%",
                zIndex: "-1",
                animation: "glow-sweep 3s ease-in-out infinite",
            },
        },
        ".glow-sweep-delayed": {
            "&::before": {
                animationDelay: "0.5s",
            },
        },
        ".bg-matrx-back": {
            backgroundImage: `${theme("backgroundImage.matrx-texture")}`,
            backgroundColor: "hsl(var(--background))",
        },
        ".bg-matrx-card-back": {
            backgroundImage: `${theme("backgroundImage.matrx-card-texture")}`,
            backgroundColor: "hsl(var(--background))",
        },
        ".bg-texture-light": {
            backgroundImage: `
                linear-gradient(to bottom, ${theme("colors.background")}, ${theme("colors.background")}),
                ${theme("backgroundImage.noise-texture")}
            `,
            backgroundBlendMode: "normal, overlay",
        },
        ".bg-texture-dark": {
            backgroundImage: `
                linear-gradient(to bottom, ${theme("colors.background")}, ${theme("colors.background")}),
                ${theme("backgroundImage.noise-texture")}
            `,
            backgroundBlendMode: "normal, soft-light",
        },
        ".bg-gradient-radial": {
            backgroundImage: "radial-gradient(var(--tw-gradient-stops))",
        },
        ".mask-bottom": {
            maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
        },
        ".fade-bottom": {
            maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
        },
        ".mask-fade-bottom": {
            "-webkit-mask-image": "linear-gradient(to bottom, black 50%, transparent 100%)",
            "mask-image": "linear-gradient(to bottom, black 50%, transparent 100%)",
        },
        // Dynamic Viewport Height utilities - for keyboard-aware layouts
        ".h-dvh": {
            height: "100dvh",
        },
        ".min-h-dvh": {
            minHeight: "100dvh",
        },
        ".max-h-dvh": {
            maxHeight: "100dvh",
        },
        ".h-svh": {
            height: "100svh", // Small viewport height (smallest)
        },
        ".min-h-svh": {
            minHeight: "100svh",
        },
        ".h-lvh": {
            height: "100lvh", // Large viewport height (largest)
        },
        ".min-h-lvh": {
            minHeight: "100lvh",
        },
        // Keyboard-safe spacing utilities
        ".pb-safe": {
            paddingBottom: "env(safe-area-inset-bottom, 1rem)",
        },
        ".mb-safe": {
            marginBottom: "env(safe-area-inset-bottom, 1rem)",
        },
        ".pt-safe": {
            paddingTop: "env(safe-area-inset-top, 1rem)",
        },
        ".mt-safe": {
            marginTop: "env(safe-area-inset-top, 1rem)",
        },
    };
    addUtilities(utilities, ["responsive", "hover", "focus", "dark"]);
}
