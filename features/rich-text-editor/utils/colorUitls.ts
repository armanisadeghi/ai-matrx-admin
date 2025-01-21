import { COLOR_STYLES, TAILWIND_COLORS, TailwindColor } from "../constants";
import { ColorOption } from "../types/editor.types";


export function getNextAvailableColor(colorAssignments: Map<string, string>): string {
    const usedColors = new Set(colorAssignments.values());
    const availableColors = TAILWIND_COLORS.filter(color => !usedColors.has(color));
    const randomIndex = Math.floor(Math.random() * (availableColors.length || TAILWIND_COLORS.length));
    return availableColors.length > 0 ? availableColors[randomIndex] : TAILWIND_COLORS[randomIndex];
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