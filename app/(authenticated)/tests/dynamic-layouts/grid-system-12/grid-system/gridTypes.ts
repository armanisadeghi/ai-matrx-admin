// gridTypes.ts
export type GridPosition = {
    row: number;
    col: number;
};

export type GridArea = {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
};

export type GridItemProps = {
    id?: string;
    area: number[] | GridArea;
    children?: React.ReactNode;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
};

export type GridContainerProps = {
    children: React.ReactNode;
    className?: string;
    gap?: number;
    style?: React.CSSProperties;
};

export type BoxNumber = number;

export interface GridLayout {
    [key: string]: BoxNumber[];
}

export interface Container {
    id: string;
    name: string;
    boxes: number[];
    colorIndex: number;
    merged: boolean;
    mergedArea?: GridArea;
}

export interface GridSettings {
    gap: number;
}

export interface ValidationStatus {
    [key: string]: boolean;
}

// Added for Strict Grid Concept.
export interface GridDimensions {
    readonly width: number;
    readonly height: number;
    readonly maxWidth: number;
    readonly maxHeight: number;
}

/* Added for Strict Mode

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
    area: number[] | GridArea;
    enforceConstraints?: boolean; // Optional flag to allow some flexibility when needed
    dimensions?: GridDimensions;
}*/
