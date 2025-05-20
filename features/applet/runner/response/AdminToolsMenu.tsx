"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import FullscreenMarkdownEditor from "@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor";
import FullscreenSocketAccordion from "@/components/socket/response/FullscreenSocketAccordion";
import FullscreenBrokerState from "./FullscreenBrokerState";

interface AdminToolsMenuProps {
  taskId: string;
  initialMarkdown: string;
}

const AdminToolsMenu = ({ taskId, initialMarkdown }: AdminToolsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const adminTools = [
    {
      id: "markdownEditor",
      label: "Admin View",
      component: (
        <FullscreenMarkdownEditor
          initialMarkdown={initialMarkdown}
          triggerLabel="Admin View"
          triggerClassName={`w-full justify-start text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm ${initialMarkdown.length <= 1 ? 'opacity-50 pointer-events-none' : ''}`}
          showSampleSelector={false}
          showConfigSelector={true}
          onOpen={closeMenu}
        />
      ),
    },
    {
      id: "socketAccordion",
      label: "Server Admin",
      component: (
        <FullscreenSocketAccordion
          taskId={taskId}
          triggerLabel="Server Admin"
          triggerClassName="w-full justify-start text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
          onOpen={closeMenu}
        />
      ),
    },
    {
      id: "brokerState",
      label: "Broker State",
      component: (
        <FullscreenBrokerState
          triggerLabel="Broker State"
          triggerClassName="w-full justify-start text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
          onOpen={closeMenu}
        />
      ),
    },
  ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 p-2 shadow-sm"
        onClick={toggleMenu}
        aria-label="Admin Tools"
        title="Admin Tools"
      >
        <Settings className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={closeMenu}
          />
          <div className="absolute right-0 mt-2 z-[9999] w-48 bg-white dark:bg-zinc-900 rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
            <div className="py-1 border border-zinc-300 dark:border-zinc-700 rounded-md">
              <div className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                Admin Tools
              </div>
              {adminTools.map((tool) => (
                <div key={tool.id} className="w-full">
                  {tool.component}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminToolsMenu; 