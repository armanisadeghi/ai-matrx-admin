// config.ts
import { GridArea, GridLayout } from './gridTypes';

export const GRID_CONFIG = {
    // Grid Structure
    ROWS: 24,
    COLUMNS: 24,

    // Grid Calculations
    GRID_START_INDEX: 1,
    GRID_ADJUSTMENT: 1,

    // Layout Settings
    DEFAULT_GAP: 1,
    MIN_GAP: 0,
    MAX_GAP: 16,
    GAP_STEP: 1,
    TOOLBAR_HEIGHT: 48,  // Added
    CONTAINER_PADDING: 16, // Added

    // UI Settings
    DEFAULT_CONTAINER_NAME: 'Container',
    TOOLBAR_CLASS: 'bg-secondary/10 p-2',  // Added

    // Layout Measurements
    DIMENSIONS: {
        TOOLBAR: {
            HEIGHT: 48,
            PADDING: 8,
        },
        CONTAINER: {
            PADDING: 16,
            GAP: 16,
        },
    }
} as const;

export const GRID_DEFAULTS = {
    EMPTY_AREA: {
        rowStart: 1,
        rowEnd: 2,
        colStart: 1,
        colEnd: 2
    } as GridArea,
    CONTAINER_COLOR_INDEX: 0,
    MERGED_STATUS: false,
    DIMENSIONS: {
        width: 0,
        height: 0
    }
} as const;

export const containerColors = [
    {bg: 'bg-blue-200', text: 'text-blue-800'},
    {bg: 'bg-green-200', text: 'text-green-800'},
    {bg: 'bg-yellow-200', text: 'text-yellow-800'},
    {bg: 'bg-purple-200', text: 'text-purple-800'},
    {bg: 'bg-pink-200', text: 'text-pink-800'},
    {bg: 'bg-orange-200', text: 'text-orange-800'},
    {bg: 'bg-teal-200', text: 'text-teal-800'},
    {bg: 'bg-red-200', text: 'text-red-800'},
];



export const PRESET_LAYOUTS: GridLayout = {
    sidebar: [1, 25, 49, 73, 97, 121, 145, 169, 193, 217, 241, 265],
    header: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mainContent: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
};
