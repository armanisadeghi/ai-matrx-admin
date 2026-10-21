// components/ControlPanel.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ControlPanelProps {
    onReset: () => void;
    onBack: () => void;
    onNext: () => void;
    started: boolean;
    /** Inside a block that has its own frame: no card of its own, and no link out of the surface. */
    embedded?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onReset, onBack, onNext, started, embedded = false }) => {
    const row = (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {!embedded && (
                            <Button asChild variant="outline">
                                <Link href="/education/subjects/quick-math">All Lessons</Link>
                            </Button>
                        )}
                        {/* Review 4 F18: Reset and Back do nothing before the walk starts, so they show only once it has. */}
                        {started && <Button variant="outline" onClick={onReset}>Reset</Button>}
                    </div>
                    <div className="flex items-center gap-2">
                        {started && <Button variant="outline" onClick={onBack}>Back</Button>}
                        <Button variant="primary" onClick={onNext}>{!started ? 'Start Interactive' : 'Next'}</Button>
                    </div>
                </div>
    );
    if (embedded) return <div className="mt-3 border-t border-border pt-2">{row}</div>;
    return (
        <Card className="mt-4">
            <CardContent className="p-2">{row}</CardContent>
        </Card>
    );
};

export default ControlPanel;
