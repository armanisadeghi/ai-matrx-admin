'use client';

import { memo, useRef, useEffect, useState } from 'react';

type MeasurementData = {
    top: number;
    availableHeight: number;
    viewportHeight: number;
};

const formatKey = (key: string): string => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .replace(/^./, str => str.toUpperCase());
};

const MeasurementMonitor = memo(({ measurements }: { measurements: Record<string, MeasurementData> }) => {
    const prevValues = useRef<Record<string, MeasurementData>>({});
    const [changeCounters, setChangeCounters] = useState<Record<string, number>>({});
    const stepDownInterval = useRef<NodeJS.Timeout | null>(null);

    const MAX_COLOR_INDEX = 4; // Number of steps in color progression

    useEffect(() => {
        // Start a step-down interval to gradually reduce counters
        stepDownInterval.current = setInterval(() => {
            setChangeCounters(prevCounters => {
                const newCounters = { ...prevCounters };
                Object.keys(newCounters).forEach(key => {
                    if (newCounters[key] > 0) {
                        newCounters[key] -= 1;
                    }
                });
                return newCounters;
            });
        }, 500); // Adjust step-down speed here (500ms)

        return () => {
            // Clean up interval on unmount
            if (stepDownInterval.current) clearInterval(stepDownInterval.current);
        };
    }, []);

    useEffect(() => {
        const updatedCounters: Record<string, number> = {};

        Object.entries(measurements).forEach(([key, data]) => {
            const prev = prevValues.current[key];

            // Compare with previous values
            if (prev) {
                const hasChanged =
                    prev.top !== data.top ||
                    prev.availableHeight !== data.availableHeight;

                if (hasChanged) {
                    // Increment change counter
                    updatedCounters[key] = (changeCounters[key] || 0) + 1;

                    // Cap counter at max index
                    updatedCounters[key] = Math.min(updatedCounters[key], MAX_COLOR_INDEX);
                }
            }

            // Update previous values
            prevValues.current[key] = { ...data };
        });

        // Update the changeCounters state
        if (Object.keys(updatedCounters).length > 0) {
            setChangeCounters(prevCounters => ({
                ...prevCounters,
                ...updatedCounters,
            }));
        }
    }, [measurements]);

    return (
        <div className="fixed bottom-4 right-4 max-w-[300px] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="text-xs font-mono space-y-2">
                {Object.entries(measurements).map(([key, data]) => {
                    const getHighlightColor = () => {
                        const count = changeCounters[key] || 0;
                        const colors = [
                            'text-white',      // No changes
                            'text-yellow-500', // First change
                            'text-orange-500', // Second change
                            'text-red-500',    // Third change
                            'text-red-600'     // Fourth and subsequent changes
                        ];
                        return colors[Math.min(count, colors.length - 1)];
                    };

                    return (
                        <div key={key} className="rounded px-2 py-1">
                            <div className="font-semibold text-primary mb-1">
                                {formatKey(key)}
                            </div>
                            <div className="pl-2 space-y-1">
                                <div>
                                    <span className="text-muted-foreground">top: </span>
                                    <span className={getHighlightColor()}>
                                        {Math.round(data?.top)}px
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">height: </span>
                                    <span className={getHighlightColor()}>
                                        {Math.round(data?.availableHeight)}px
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

MeasurementMonitor.displayName = 'MeasurementMonitor';

export default MeasurementMonitor;
