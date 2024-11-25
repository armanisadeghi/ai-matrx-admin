import { Dialog } from "@/components/ui";
import {PresentationComponent} from "@/components/matrx/ArmaniForm/action-system/presentation/types";

import { useHelpContent } from './useHelpContent';
import { BaseHelpPanel } from './base-components'

interface HelpPanelProps {
    source: string;
    className?: string;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ source, className }) => {
    const content = useHelpContent(source);

    // If no content is found, don't render anything
    if (!content) return null;

    return (
        <BaseHelpPanel
            title={content.title}
            summary={content.summary}
            variant={content.variant}
            position={content.position}
            sections={content.sections}
            buttonLabels={content.buttonLabels}
            draggable={content.draggable}
            className={className}
        >
            {content.mainContent}
        </BaseHelpPanel>
    );
};


