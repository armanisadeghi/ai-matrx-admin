'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptBuiltinsManager } from '@/features/prompt-builtins/admin/PromptBuiltinsManager';
import { ShortcutsTableManager } from '@/features/prompt-builtins/admin/ShortcutsTableManager';
import { PromptBuiltinsTableManager } from '@/features/prompt-builtins/admin/PromptBuiltinsTableManager';
import { Folder, Zap, FileText } from 'lucide-react';

export default function PromptBuiltinsPage() {
  const [activeTab, setActiveTab] = useState('main');

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 bg-card">
          <TabsList className="h-12">
            <TabsTrigger value="main" className="gap-2">
              <Folder className="w-4 h-4" />
              Categories & Shortcuts
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2">
              <Zap className="w-4 h-4" />
              Shortcuts Table
            </TabsTrigger>
            <TabsTrigger value="builtins" className="gap-2">
              <FileText className="w-4 h-4" />
              Prompt Builtins
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="main" className="flex-1 m-0 overflow-hidden">
          <PromptBuiltinsManager />
        </TabsContent>

        <TabsContent value="shortcuts" className="flex-1 m-0 overflow-hidden">
          <ShortcutsTableManager />
        </TabsContent>

        <TabsContent value="builtins" className="flex-1 m-0 overflow-hidden">
          <PromptBuiltinsTableManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
