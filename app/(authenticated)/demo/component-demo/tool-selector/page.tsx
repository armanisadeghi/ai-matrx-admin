'use client';

import React from 'react';
import { 
  Search, 
  Code, 
  FileSearch, 
  Image, 
  Cloud, 
  Newspaper,
  Calendar, 
  ListTodo, 
  Mail, 
  MessageSquare,
  Calculator,
  Globe2,
  Database,
  Bot,
  Settings,
  Music,
  Video,
  Book
} from 'lucide-react';
import SelectWithIconDisplay from '@/components/matrx/SelectWithIconDisplay';


const DemoPage = () => {
  // Example items for AI tools
  const aiTools = [
    { icon: Search, label: 'Web Search', value: 'web-search' },
    { icon: Code, label: 'Code Execution', value: 'code-exec' },
    { icon: FileSearch, label: 'File Search', value: 'file-search' },
    { icon: Image, label: 'Image Generation', value: 'image-gen' },
    { icon: Cloud, label: 'Weather', value: 'weather' },
    { icon: Newspaper, label: 'News', value: 'news' },
    { icon: Calendar, label: 'Calendar', value: 'calendar' },
    { icon: ListTodo, label: 'Tasks', value: 'tasks' },
    { icon: Mail, label: 'Email', value: 'email' },
    { icon: MessageSquare, label: 'Chat', value: 'chat' },
    { icon: Calculator, label: 'Calculator', value: 'calculator' },
    { icon: Globe2, label: 'Translation', value: 'translation' },
    { icon: Database, label: 'Knowledge Base', value: 'knowledge-base' },
    { icon: Bot, label: 'AI Assistant', value: 'ai-assistant' },
    { icon: FileSearch, label: 'Document Analysis', value: 'doc-analysis' }
  ];

  // Example items for media tools
  const mediaTools = [
    { icon: Music, label: 'Audio Player', value: 'audio' },
    { icon: Video, label: 'Video Editor', value: 'video' },
    { icon: Image, label: 'Photo Editor', value: 'photo' },
    { icon: Book, label: 'E-Reader', value: 'reader' },
    { icon: Settings, label: 'Media Settings', value: 'settings' }
  ];

  const handleAIToolsChange = (selected) => {
    console.log('Selected AI tools:', selected);
  };

  const handleMediaToolsChange = (selected) => {
    console.log('Selected media tools:', selected);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-medium mb-4">AI Tools Selector</h2>
        <SelectWithIconDisplay
          items={aiTools}
          onChange={handleAIToolsChange}
          placeholder="Select AI tools..."
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Media Tools Selector</h2>
        <SelectWithIconDisplay
          items={mediaTools}
          onChange={handleMediaToolsChange}
          placeholder="Select media tools..."
          maxHeight="max-h-48"
        />
      </div>

      <div className="fixed bottom-4 right-4 p-4 bg-elevation1 rounded-md border border-elevation3 text-sm">
        Check the console to see the onChange events
      </div>
    </div>
  );
};

export default DemoPage;