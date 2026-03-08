'use client';

// ChatMobileAgentName — Minimal client island for the mobile header center slot.
//
// Renders with the SAME size and shape as the server-rendered default
// ("General Chat ↓") so there is zero layout shift on hydration.
//
// Suspense fallback (static shape, no data):
//   General Chat ↓
//
// After hydration:
//   <live agent name> ↓  (opens the AgentPickerSheet on tap)
//
// This is the ONLY client code in the mobile header.

import { ChevronDown } from 'lucide-react';
import { useSsrAgent } from './SsrAgentContext';

export default function ChatMobileAgentName() {
    const { selectedAgent, openAgentPicker } = useSsrAgent();

    return (
        <button
            onClick={openAgentPicker}
            className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-sm font-medium text-foreground/90 hover:text-foreground active:text-foreground transition-colors select-none min-w-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Change AI agent"
        >
            <span className="truncate max-w-[180px]">
                {selectedAgent?.name || 'General Chat'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </button>
    );
}
