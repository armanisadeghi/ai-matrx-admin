// import React, { createContext, useContext, useState, ReactNode } from "react";
// import { useChatSocket, UseChatSocketResult } from "@/lib/redux/socket/task-managers/hooks/useChatSocket";


// const AiChatContext = createContext<{
//   chatSocket: UseChatSocketResult | null;
//   setConversationId: (id: string) => void;
// }>({
//   chatSocket: null,
//   setConversationId: () => {},
// });

// export const AiChatProvider = ({ children }: { children: ReactNode }) => {
//   const [conversationId, setConversationId] = useState<string>("new-conversation");

// console.log("----- AiChatProvider -----");

//   const chatSocket = useChatSocket({ conversationId });
  
//   return (
//     <AiChatContext.Provider value={{ chatSocket, setConversationId }}>
//       {children}
//     </AiChatContext.Provider>
//   );
// };

// export const useAiChat = () => useContext(AiChatContext);