'use client';

import {HelpPanel, HelpPanelSimple } from "@/components/matrx/ArmaniForm/field-components/help-text/help-text";


// Simple usage
export function SimpleExample() {
    return (
        <HelpPanelSimple
            title="Quick Help"
            summary="Basic information about this feature"
            variant="primary"
        >
            <div className="space-y-2">
                <p>Here's some helpful information...</p>
            </div>
        </HelpPanelSimple>
    );
}

// Advanced usage with sections
export function AdvancedExample() {
    const sections = [
        <div key="basics">
            <h4 className="font-medium">Getting Started</h4>
            <p>Basic introduction to features...</p>
        </div>,
        <div key="advanced">
            <h4 className="font-medium">Advanced Features</h4>
            <p>More complex functionality...</p>
        </div>
    ];

    const buttonLabels = ["Basics", "Advanced"];

    return (
        <div className="relative">
            <HelpPanel
                title="Feature Guide"
                summary="Complete guide to using this feature"
                variant="default"
                position="inline"
                draggable={true}
                sections={sections}
                buttonLabels={buttonLabels}
            >
                <div className="space-y-4">
                    <p>Main content here...</p>
                </div>
            </HelpPanel>
        </div>
    );
}
