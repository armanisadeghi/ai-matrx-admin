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
