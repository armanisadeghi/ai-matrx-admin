'use client';

import { useEffect, useRef } from "react";

interface Position {
    height: number;
    width: number;
    left: number;
    top: number;
}

export const useMeasurePosition = (update: (pos: Position) => void) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            update({
                height: ref.current.offsetHeight,
                width: ref.current.offsetWidth,
                left: ref.current.offsetLeft,
                top: ref.current.offsetTop,
            });
        }
    });

    return ref;
};