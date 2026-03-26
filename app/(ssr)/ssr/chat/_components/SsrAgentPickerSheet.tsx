'use client';

// Wraps the shared AgentPickerSheet with a local AgentsProvider
// so it works in the SSR chat route where the deprecated layout-level
// AgentsProvider has been removed.

import { AgentPickerSheet } from '@/features/public-chat/components/AgentPickerSheet';
import { AgentsProvider } from '@/features/public-chat/context/DEPRECATED-AgentsContext';

type AgentPickerSheetProps = React.ComponentProps<typeof AgentPickerSheet>;

export function SsrAgentPickerSheet(props: AgentPickerSheetProps) {
    return (
        <AgentsProvider>
            <AgentPickerSheet {...props} />
        </AgentsProvider>
    );
}
