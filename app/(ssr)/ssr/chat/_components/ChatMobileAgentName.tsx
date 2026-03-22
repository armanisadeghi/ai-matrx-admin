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

    // Don't render until agent config is resolved — avoids showing a raw UUID
    const isLoading = !selectedAgent?.configFetched && !selectedAgent?.name;
    const displayName = isLoading ? '' : (selectedAgent?.name || 'General Chat');

    return (
        <button
            onClick={() => dispatch(activeChatActions.openAgentPicker())}
            className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full matrx-shell-glass text-sm font-medium text-foreground/90 transition-colors select-none min-w-0 active:scale-95"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Change AI agent"
        >
            <span className="truncate max-w-[180px]">
                {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </button>
    );
}
