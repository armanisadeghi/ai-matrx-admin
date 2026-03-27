/**
 * features/conversation/components/lazy — Dynamic import wrappers.
 *
 * Use these for route-level code splitting. Each component is loaded
 * only when it's actually rendered, keeping the initial bundle small.
 *
 * Usage:
 *   import { LazyUnifiedChatWrapper } from '@/features/conversation/components/lazy';
 *   <Suspense fallback={<ChatSkeleton />}>
 *     <LazyUnifiedChatWrapper agentId="..." />
 *   </Suspense>
 */

import { lazy } from 'react';

export const LazyUnifiedChatWrapper = lazy(() =>
    import('@/features/cx-conversation/UnifiedChatWrapper').then(m => ({ default: m.UnifiedChatWrapper }))
);

export const LazyConversationShell = lazy(() =>
    import('@/features/cx-conversation/ConversationShell').then(m => ({ default: m.ConversationShell }))
);

export const LazyConversationInput = lazy(() =>
    import('@/features/cx-conversation/ConversationInput').then(m => ({ default: m.ConversationInput }))
);

export const LazyMessageList = lazy(() =>
    import('@/features/cx-conversation/MessageList').then(m => ({ default: m.MessageList }))
);

export const LazyAssistantMessage = lazy(() =>
    import('@/features/cx-conversation/AssistantMessage').then(m => ({ default: m.AssistantMessage }))
);

export const LazyUserMessage = lazy(() =>
    import('@/features/cx-conversation/UserMessage').then(m => ({ default: m.UserMessage }))
);

export const LazyMessageOptionsMenu = lazy(() =>
    import('@/features/cx-conversation/MessageOptionsMenu')
);

export const LazyToolCallVisualization = lazy(() =>
    import('@/features/cx-conversation/ToolCallVisualization')
);
