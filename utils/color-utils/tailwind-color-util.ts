// utils/color-utils/tailwind-color-util.ts

'use client';


import { Colord, extend } from "colord";
import { tailwindColors } from "@/constants/tailwind-colors";
import labPlugin from "colord/plugins/lab";

extend([labPlugin]);

export function findNearestTailwindColor(inputColor: Colord): string {
    let nearestColor = "";
    let smallestDistance = Infinity;

    tailwindColors.forEach((colorGroup) => {
        Object.entries(colorGroup.shades).forEach(([shade, hexValue]) => {
            const distance = inputColor.delta(hexValue);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                nearestColor = `${colorGroup.name.toLowerCase()}-${shade}`;
            }
        });
    });

    return nearestColor;
}
