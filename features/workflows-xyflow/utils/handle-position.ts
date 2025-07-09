import { Position } from "@xyflow/react";

export const getCompactHandlePosition = (
    index: number,
    total: number,
    isInput: boolean,
    inputCount: number,
    outputCount: number
) => {
    const radius = 32;
    let angle: number;
    
    if (total === 1) {
        angle = isInput ? Math.PI : 0;
    } else if (total === 2) {
        angle = isInput ? Math.PI : 0;
    } else {
        if (isInput) {
            if (inputCount === 1) {
                angle = Math.PI;
            } else {
                const inputAngleStep = Math.PI / (inputCount + 1);
                angle = Math.PI / 2 + (index + 1) * inputAngleStep;
            }
        } else {
            if (outputCount === 1) {
                angle = 0;
            } else {
                const outputAngleStep = Math.PI / (outputCount + 1);
                const outputIndex = index - inputCount;
                angle = -Math.PI / 2 + (outputIndex + 1) * outputAngleStep;
            }
        }
    }
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return { x, y, angle };
};

export const getHandlePositionType = (angle: number): Position => {
    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    if (normalizedAngle >= 7 * Math.PI / 4 || normalizedAngle < Math.PI / 4) {
        return Position.Right;
    } else if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) {
        return Position.Bottom;
    } else if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) {
        return Position.Left;
    } else {
        return Position.Top;
    }
};