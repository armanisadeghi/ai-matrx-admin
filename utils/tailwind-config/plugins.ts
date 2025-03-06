// utils/tailwind-config/plugins.ts

import { heroui } from "@heroui/react";
import animations from '@midudev/tailwind-animations';
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
    require("@xpd/tailwind-3dtransforms"),
    require("flowbite/plugin"),
    require('tailwind-scrollbar'),
    require('tailwind-scrollbar-hide'),
    require('tailwindcss-3d'),
    require('@tailwindcss/container-queries'),
    heroui({
        prefix: "next-",
        addCommonColors: false,
        defaultTheme: "dark",
        defaultExtendTheme: "dark",
        layout: {},
    }),
    addVariablesForColors,
    animations,
    createUtilities
];