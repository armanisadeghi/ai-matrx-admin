'use client';

import { PanelLeftTapButton } from '@/components/icons/tap-buttons';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarAgentHeaderProps {
    onCollapse?: () => void;
}

// ============================================================================
// SIDEBAR AGENT HEADER
// Desktop header strip toggle: [PanelLeft]
// Agent selector lives in the main header (ChatHeaderControls).
// Search + new chat live inside the panel body (SidebarSearchGroup).
// ============================================================================

export function SidebarAgentHeader({ onCollapse }: SidebarAgentHeaderProps) {
    return (
        <div className="flex items-center flex-shrink-0">
            <PanelLeftTapButton
                onClick={onCollapse}
                ariaLabel="Toggle sidebar"
                className="text-muted-foreground"
            />
        </div>
    );
}

export default SidebarAgentHeader;
