export const animations = {
    keyframes: {
        spin: {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" },
        },
        spinner: {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" },
        },
        "accordion-down": {
            from: { height: "0" },
            to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: "0" },
        },
        "caret-blink": {
            "0%,70%,100%": { opacity: "1" },
            "20%,50%": { opacity: "0" },
        },
        "slide-down": {
            from: { height: "0" },
            to: { height: "var(--radix-collapsible-content-height)" },
        },
        "slide-up": {
            from: { height: "var(--radix-collapsible-content-height)" },
            to: { height: "0" },
        },
        shimmer: {
            from: { backgroundPosition: "0 0" },
            to: { backgroundPosition: "-200% 0" },
        },
        "hover-bounce": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-8px)" },
        },
        "fade-in": {
            "0%": {
                opacity: "0",
                transform: "scale(0.95)",
            },
            "100%": {
                opacity: "1",
                transform: "scale(1)",
            },
        },
        "fade-out": {
            "0%": {
                opacity: "1",
                transform: "scale(1)",
            },
            "100%": {
                opacity: "0",
                transform: "scale(0.95)",
            },
        },
        "fadeInOut": {
            "0%": { opacity: "0" },
            "15%": { opacity: "1" },
            "85%": { opacity: "1" },
            "100%": { opacity: "0" },
        },
        pulse: {
            "0%, 100%": { opacity: "1" },
            "50%": { opacity: "0.7" },
        },
        slowPulse: {
            "0%, 100%": { opacity: "1" },
            "50%": { opacity: "0.5" },
        },
        glow: {
            "0%": {
                filter: "drop-shadow(0 0 8px var(--glow-color)) drop-shadow(0 0 12px var(--glow-color))",
            },
            "100%": {
                filter: "drop-shadow(0 0 12px var(--glow-color)) drop-shadow(0 0 20px var(--glow-color))",
            },
        },
        "glow-sweep": {
            "0%": {
                backgroundPosition: "-100% 0",
            },
            "50%": {
                backgroundPosition: "200% 0",
            },
            "100%": {
                backgroundPosition: "-100% 0",
            },
        },
        "scale-in": {
            "0%": {
                opacity: "0",
                transform: "scale(0.95) translateY(10px)",
            },
            "100%": {
                opacity: "1",
                transform: "scale(1) translateY(0)",
            },
        },
        "scale-out": {
            "0%": {
                opacity: "1",
                transform: "scale(1) translateY(0)",
            },
            "100%": {
                opacity: "0",
                transform: "scale(0.95) translateY(10px)",
            },
        },
        fadeIn: {
            "0%": {
                opacity: "0",
                transform: "translateY(-10px)",
            },
            "100%": {
                opacity: "1",
                transform: "translateY(0)",
            },
        },
        "smooth-drop": {
            "0%": { height: "0"},
            "100%": { height: "auto"},
        },
        "smooth-lift": {
            "0%": { height: "auto" },
            "100%": { height: "0" },
        },
    },
    animation: {
        "accordion-down": "accordion-down 0.4s ease-out",
        "accordion-up": "accordion-up 0.4s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "hover-bounce": "hover-bounce 0.3s var(--animated-menu-bounce)",
        "fade-in": "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in-out": "fadeInOut 2s ease-in-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        spin: "spin 1s linear infinite",
        pizza: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        pulse: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        slowPulse: "slowPulse 5s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "glow-sweep": "glow-sweep 3s ease-in-out infinite",
        "slide-down": "slide-down 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-out": "scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        fadeIn: "fadeIn 0.2s ease-out forwards",
        "smooth-drop": "smooth-drop 0.6s ease-in-out",
        "smooth-lift": "smooth-lift 0.6s ease-in-out",
    },
};