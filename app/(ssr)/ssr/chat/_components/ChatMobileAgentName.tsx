'use client';

// ChatMobileAgentName — Minimal client island for the mobile header center slot.
//
// Migrated to pure Redux: reads agent name from activeChatSlice.

import { ChevronDown } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { activeChatActions, selectActiveChatAgent } from '@/lib/redux/slices/activeChatSlice';

export default function ChatMobileAgentName() {
    const dispatch = useAppDispatch();
    const selectedAgent = useAppSelector(selectActiveChatAgent);

    return (
        <button
            onClick={() => dispatch(activeChatActions.openAgentPicker())}
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
