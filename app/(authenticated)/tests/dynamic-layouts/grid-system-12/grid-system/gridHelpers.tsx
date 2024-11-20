// gridHelpers.ts
import { GRID_CONFIG, GRID_DEFAULTS } from './config';
import { GridArea, GridPosition } from './gridTypes';

export const getGridCoordinates = (boxNumber: number): GridPosition => {
    const row = Math.floor((boxNumber - GRID_CONFIG.GRID_START_INDEX) / GRID_CONFIG.COLUMNS);
    const col = (boxNumber - GRID_CONFIG.GRID_START_INDEX) % GRID_CONFIG.COLUMNS;
    return { row, col };
};

export const getBoxNumber = (row: number, col: number): number => {
    return (row * GRID_CONFIG.COLUMNS) + col + GRID_CONFIG.GRID_START_INDEX;
};

export const getMergedArea = (boxes: number[]): GridArea => {
    if (boxes.length === 0) return GRID_DEFAULTS.EMPTY_AREA;

    if (boxes.length === 1) {
        const { row, col } = getGridCoordinates(boxes[0]);
        return {
            rowStart: row + GRID_CONFIG.GRID_ADJUSTMENT,
            rowEnd: row + GRID_CONFIG.GRID_ADJUSTMENT + 1,
            colStart: col + GRID_CONFIG.GRID_ADJUSTMENT,
            colEnd: col + GRID_CONFIG.GRID_ADJUSTMENT + 1
        };
    }

    const coordinates = boxes.map(box => getGridCoordinates(box));
    const minRow = Math.min(...coordinates.map(c => c.row));
    const maxRow = Math.max(...coordinates.map(c => c.row));
    const minCol = Math.min(...coordinates.map(c => c.col));
    const maxCol = Math.max(...coordinates.map(c => c.col));

    return {
        rowStart: minRow + GRID_CONFIG.GRID_ADJUSTMENT,
        rowEnd: maxRow + GRID_CONFIG.GRID_ADJUSTMENT + 1,
        colStart: minCol + GRID_CONFIG.GRID_ADJUSTMENT,
        colEnd: maxCol + GRID_CONFIG.GRID_ADJUSTMENT + 1
    };
};

export const getRectangleBoxes = (boxes: number[]): number[] => {
    if (boxes.length === 0) return [];
    if (boxes.length === 1) return boxes;

    const coordinates = boxes.map(box => getGridCoordinates(box));
    const minRow = Math.min(...coordinates.map(c => c.row));
    const maxRow = Math.max(...coordinates.map(c => c.row));
    const minCol = Math.min(...coordinates.map(c => c.col));
    const maxCol = Math.max(...coordinates.map(c => c.col));

    const allBoxes: number[] = [];
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            allBoxes.push(getBoxNumber(row, col));
        }
    }

    return allBoxes.sort((a, b) => a - b);
};

export const validateMergeability = (boxes: number[]): boolean => {
    if (boxes.length === 0) return false;
    if (boxes.length === 1) return true;

    const rectangleBoxes = getRectangleBoxes(boxes);
    const boxSet = new Set(boxes);

    // Check if all boxes in the rectangle are selected
    return rectangleBoxes.every(box => boxSet.has(box));
};

export const isValidRectangle = validateMergeability;

// Utility function to check if a box is within grid bounds
export const isValidBox = (boxNumber: number): boolean => {
    const totalBoxes = GRID_CONFIG.ROWS * GRID_CONFIG.COLUMNS;
    return boxNumber >= GRID_CONFIG.GRID_START_INDEX && boxNumber <= totalBoxes;
};

// Utility function to get grid dimensions
export const getGridDimensions = () => ({
    rows: GRID_CONFIG.ROWS,
    columns: GRID_CONFIG.COLUMNS,
    totalBoxes: GRID_CONFIG.ROWS * GRID_CONFIG.COLUMNS
});

// Utility to convert GridArea to box numbers
export const getBoxesFromArea = (area: GridArea): number[] => {
    const boxes: number[] = [];
    for (let row = area.rowStart - 1; row < area.rowEnd - 1; row++) {
        for (let col = area.colStart - 1; col < area.colEnd - 1; col++) {
            boxes.push(getBoxNumber(row, col));
        }
    }
    return boxes;
};

// Add this to gridHelpers.ts
export const getGridArea = (boxNumber: number): GridArea => {
    const { row, col } = getGridCoordinates(boxNumber);
    return {
        rowStart: row + GRID_CONFIG.GRID_ADJUSTMENT,
        rowEnd: row + GRID_CONFIG.GRID_ADJUSTMENT + 1,
        colStart: col + GRID_CONFIG.GRID_ADJUSTMENT,
        colEnd: col + GRID_CONFIG.GRID_ADJUSTMENT + 1
    };
};


/* Added for Strict Mode
// gridHelpers.ts
export const enforceGridConstraints = (element: HTMLElement, area: GridArea) => {
    const width = (area.colEnd - area.colStart) * GRID_CONFIG.CELL_WIDTH;
    const height = (area.rowEnd - area.rowStart) * GRID_CONFIG.CELL_HEIGHT;

    element.style.maxWidth = `${width}px`;
    element.style.maxHeight = `${height}px`;
    element.style.overflow = 'hidden';
};

export const calculateGridCellDimensions = (area: GridArea): GridDimensions => {
    return {
        width: (area.colEnd - area.colStart) * GRID_CONFIG.CELL_WIDTH,
        height: (area.rowEnd - area.rowStart) * GRID_CONFIG.CELL_HEIGHT,
        maxWidth: (area.colEnd - area.colStart) * GRID_CONFIG.CELL_WIDTH,
        maxHeight: (area.rowEnd - area.rowStart) * GRID_CONFIG.CELL_HEIGHT,
    };
};*/
