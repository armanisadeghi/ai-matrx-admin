import React from 'react';
import {GridItemProps, GridArea} from './gridTypes';
import {getMergedArea} from './gridHelpers';

export const GridItem: React.FC<GridItemProps> = (
    {
        id,
        area,
        children,
        className = '',
        onClick,
        onMouseDown,
        onMouseEnter,
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
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            style={{
                gridArea: `${gridArea.rowStart} / ${gridArea.colStart} / ${gridArea.rowEnd} / ${gridArea.colEnd}`,
                ...style,
            }}
        >
            {children}
        </div>
    );
};

// Strict Version of item
export const GridItemStrict: React.FC<GridItemProps> = (
    {
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
            className={`relative min-w-0 min-h-0 overflow-hidden ${className}`}  // Added to make strict
            onClick={onClick}
            style={{
                gridArea: `${gridArea.rowStart} / ${gridArea.colStart} / ${gridArea.rowEnd} / ${gridArea.colEnd}`,
                position: 'relative',  // Added to make strict
                display: 'flex',  // Added to make strict
                flexDirection: 'column',  // Added to make strict
                ...style,
            }}
        >
            <div className="absolute inset-0 overflow-auto"> {/* Added to make strict */}
                {children}
            </div>
        </div>
    );
};
