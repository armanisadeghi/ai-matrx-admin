import React from 'react';

const BrokerLoadingState = () => {
    return (
        <div className="w-full p-4 space-y-3">
            {/* Main loading bars with varying widths */}
            <div className="space-y-2">
                <div className="h-2 bg-muted/40 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-muted/40 rounded animate-pulse w-1/2" />
            </div>
            
            {/* Subtle secondary loading elements */}
            <div className="space-y-1.5">
                <div className="h-1.5 bg-muted/30 rounded animate-pulse w-2/3" />
                <div className="h-1.5 bg-muted/30 rounded animate-pulse w-5/6" />
            </div>
        </div>
    );
};

export default BrokerLoadingState;