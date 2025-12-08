// utils/tailwind-config/plugins.ts

// Removed @midudev/tailwind-animations - incompatible with Turbopack CSS parser
import { createUtilities } from './utilities';
const { default: flattenColorPalette } = require("tailwindcss/lib/util/flattenColorPalette");

// Color variables helper function
function addVariablesForColors({addBase, theme}: any) {
    let allColors = flattenColorPalette(theme("colors"));
    let newVars = Object.fromEntries(
        Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
    );
    addBase({
        ":root": newVars,
    });
}

export const plugins = [
    require("tailwindcss-animate"),
    require('tailwind-scrollbar-hide'),
    require('@tailwindcss/container-queries'),
    addVariablesForColors,
    createUtilities
];