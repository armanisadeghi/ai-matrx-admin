import { COLOR_STYLES, TAILWIND_COLORS, TailwindColor } from "../constants";
import { ColorOption } from "../types/editor.types";


export function getNextAvailableColor(colorAssignments: Map<string, string>): string {
    const usedColors = new Set(colorAssignments.values());
    return TAILWIND_COLORS.find((color) => !usedColors.has(color)) || TAILWIND_COLORS[0];
}

export function getColorClassName(color: TailwindColor | string): string {
    return COLOR_STYLES[color as TailwindColor];
}

export function getAllColorOptions(): ColorOption[] {
    return TAILWIND_COLORS.map(color => ({
        color,
        className: COLOR_STYLES[color]
    }));
}