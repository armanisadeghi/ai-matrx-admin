import React from 'react';
import { GridItemProps, GridArea } from './gridTypes';
import { getMergedArea } from './gridHelpers';

export const GridItem: React.FC<GridItemProps> = ({
    id,
    area,
    children,
    className = '',
    onClick,
    style = {},
}) => {
    const gridArea: GridArea = Array.isArray(area)
        ? getMergedArea(area)
        : area as GridArea;

    return (
        <div
            id={id}
            className={`${className}`}
            onClick={onClick}
            style={{
                gridArea: `${gridArea.rowStart} / ${gridArea.colStart} / ${gridArea.rowEnd} / ${gridArea.colEnd}`,
                ...style,
            }}
        >
            {children}
        </div>
    );
};
