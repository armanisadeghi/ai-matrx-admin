'use client';

import { memo, useRef, useEffect, useState, useMemo } from 'react';

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

// Memoize color arrays to prevent recreating on each render
const HIGHLIGHT_COLORS = [
    'text-white',      // No changes
    'text-yellow-500', // First change
    'text-orange-500', // Second change
    'text-red-500',    // Third change
    'text-red-600'     // Fourth and subsequent changes
] as const;

const getHighlightColor = (count: number): string => {
    return HIGHLIGHT_COLORS[Math.min(count, HIGHLIGHT_COLORS.length - 1)];
};

const MeasurementItem = memo(({
                                  name,
                                  data,
                                  changeCounter
                              }: {
    name: string;
    data: MeasurementData;
    changeCounter: number;
}) => (
    <div className="rounded px-2 py-1">
        <div className="font-semibold text-primary mb-1">
            {formatKey(name)}
        </div>
        <div className="pl-2 space-y-1">
            <div>
                <span className="text-muted-foreground">top: </span>
                <span className={getHighlightColor(changeCounter)}>
                    {Math.round(data?.top)}px
                </span>
            </div>
            <div>
                <span className="text-muted-foreground">height: </span>
                <span className={getHighlightColor(changeCounter)}>
                    {Math.round(data?.availableHeight)}px
                </span>
            </div>
        </div>
    </div>
));

MeasurementItem.displayName = 'MeasurementItem';

const MeasurementMonitor = memo(({ measurements }: { measurements: Record<string, MeasurementData> }) => {
    const prevValues = useRef<Record<string, MeasurementData>>({});
    const [changeCounters, setChangeCounters] = useState<Record<string, number>>({});

    // Store interval ID in ref to prevent it from causing re-renders
    const stepDownInterval = useRef<NodeJS.Timeout | null>(null);

    // Memoize measurement entries to prevent unnecessary recalculations
    const measurementEntries = useMemo(() => Object.entries(measurements), [measurements]);

    useEffect(() => {
        stepDownInterval.current = setInterval(() => {
            setChangeCounters(prevCounters => {
                const newCounters = { ...prevCounters };
                let hasChanges = false;

                Object.keys(newCounters).forEach(key => {
                    if (newCounters[key] > 0) {
                        newCounters[key] -= 1;
                        hasChanges = true;
                    }
                });

                // Only trigger re-render if there were actual changes
                return hasChanges ? newCounters : prevCounters;
            });
        }, 500);

        return () => {
            if (stepDownInterval.current) clearInterval(stepDownInterval.current);
        };
    }, []);

    useEffect(() => {
        let updatedCounters: Record<string, number> | null = null;

        measurementEntries.forEach(([key, data]) => {
            const prev = prevValues.current[key];

            if (prev) {
                const hasChanged =
                    prev.top !== data.top ||
                    prev.availableHeight !== data.availableHeight;

                if (hasChanged) {
                    if (!updatedCounters) updatedCounters = {};
                    updatedCounters[key] = Math.min((changeCounters[key] || 0) + 1, HIGHLIGHT_COLORS.length - 1);
                }
            }

            prevValues.current[key] = { ...data };
        });

        // Only update state if there were changes
        if (updatedCounters) {
            setChangeCounters(prevCounters => ({
                ...prevCounters,
                ...updatedCounters
            }));
        }
    }, [measurementEntries, changeCounters]);

    return (
        <div className="fixed bottom-4 right-4 max-w-[300px] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="text-xs font-mono space-y-2">
                {measurementEntries.map(([key, data]) => (
                    <MeasurementItem
                        key={key}
                        name={key}
                        data={data}
                        changeCounter={changeCounters[key] || 0}
                    />
                ))}
            </div>
        </div>
    );
});

MeasurementMonitor.displayName = 'MeasurementMonitor';

export default MeasurementMonitor;
