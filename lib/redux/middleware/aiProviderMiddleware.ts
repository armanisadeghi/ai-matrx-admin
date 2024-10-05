// File: lib/redux/middleware/aiProviderMiddleware.ts

import { Middleware } from '@reduxjs/toolkit';
import providerManager from '@/lib/ai/providerManager';
import { AIProvider } from "@/lib/ai/aiChat.types";
import { addMessage } from '@/lib/redux/slices/aiChatSlice';

// export const aiProviderMiddleware: Middleware = store => next => action => {
//     if (action.type === addMessage.type && action.payload.role === 'user') {
//         const state = store.getState();
//         const preferredProvider = state.userPreferences.assistant.preferredProvider || AIProvider.Default;
//         const provider = providerManager.getProvider(preferredProvider);
//
//         // Assuming you have a way to get the current chat from the state
//         const currentChatId = state.aiChat.activeChatId;
//         const message = action.payload.content[0].text; // Assuming the first content part is text
//
//         provider.sendMessage(message)
//             .then(response => {
//                 store.dispatch(addMessage({
//                     chatId: currentChatId,
//                     role: 'assistant',
//                     content: [{ type: 'text', text: response }],
//                     isVisibleToUser: true
//                 }));
//             })
//             .catch(error => {
//                 console.error('Error from AI provider:', error);
//                 // Dispatch an error action if needed
//             });
//     }
//     return next(action);
// };
