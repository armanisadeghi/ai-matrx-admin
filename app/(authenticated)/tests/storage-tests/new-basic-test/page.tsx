'use client'
// Example usage in any component
import React from 'react';
import StorageTestUI from './StorageTestUI'

const ConversationPage: React.FC = () => {
  // Typically this would come from your router or state management
  const conversationId = "conversation-" + 'e8bfb391-3afa-4f8d-a61b-b81b51b078a1';
  
  return (
    <div>
      <h1>Conversation Page</h1>
      
      {/* The FileUploadTest component uses the existing FileSystemProvider context */}
      <StorageTestUI 
      />
      
      {/* Rest of your conversation UI */}
    </div>
  );
};

export default ConversationPage;