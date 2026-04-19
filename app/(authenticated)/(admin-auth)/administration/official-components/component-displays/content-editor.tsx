"use client";

import React, { useState } from "react";
import { ComponentEntry } from "../parts/component-list";
import { ComponentDisplayWrapper } from "../component-usage";
import {
  ContentEditor,
  ContentEditorStack,
  ContentEditorTabs,
  ContentEditorList,
  ContentEditorTabsWithList,
  type ContentEditorTab,
  type ContentEditorDocument,
  type HeaderAction,
} from "@/components/official/content-editor";
import { Download, FileText, BookOpen, Sparkles, Flag } from "lucide-react";
import HtmlPreviewModal from "@/features/html-pages/components/HtmlPreviewModal";

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function ContentEditorDisplay({
  component,
}: ComponentDisplayProps) {
  if (!component) return null;

  // Demo state
  const [content, setContent] = useState(
    "# Welcome\n\nThis is a **powerful** content editor!",
  );
  const [stackContents, setStackContents] = useState([
    "# Section 1\n\nFirst section content...",
    "# Section 2\n\nSecond section content...",
    "# Section 3\n\nThird section content...",
  ]);
  const [htmlModal, setHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [htmlTitle, setHtmlTitle] = useState("");

  // Tabs-only demo state
  const [tabs, setTabs] = useState<ContentEditorTab[]>([
    {
      id: "t1",
      title: "Introduction",
      value: "# Introduction\n\nWelcome to the tabs demo.",
    },
    { id: "t2", title: "Body", value: "# Body\n\nThe middle section." },
    { id: "t3", title: "Conclusion", value: "# Conclusion\n\nWrap it up." },
  ]);

  // Standalone list demo state
  const listDemoItems = [
    {
      id: "doc-intro",
      title: "Introduction",
      description: "Opening section",
      icon: BookOpen,
    },
    {
      id: "doc-body",
      title: "Main Content",
      description: "The meat of the document",
      icon: FileText,
    },
    {
      id: "doc-extra",
      title: "Appendix",
      description: "Reference material",
      icon: Sparkles,
    },
    {
      id: "doc-end",
      title: "Conclusion",
      description: "Closing thoughts",
      icon: Flag,
    },
  ];
  const [listActiveId, setListActiveId] = useState<string>("doc-intro");
  const [listOpenIds, setListOpenIds] = useState<string[]>([
    "doc-intro",
    "doc-body",
  ]);

  // Combined List + Tabs demo state
  const [documents, setDocuments] = useState<ContentEditorDocument[]>([
    {
      id: "d1",
      title: "Welcome",
      description: "Landing page",
      icon: BookOpen,
      value: "# Welcome\n\nStart here.",
    },
    {
      id: "d2",
      title: "Getting Started",
      description: "Quick setup",
      icon: Sparkles,
      value: "# Getting Started\n\nInstall and run.",
    },
    {
      id: "d3",
      title: "API Reference",
      description: "Full API docs",
      icon: FileText,
      value: "# API Reference\n\nAll endpoints.",
    },
    {
      id: "d4",
      title: "Troubleshooting",
      description: "Common issues",
      icon: Flag,
      value: "# Troubleshooting\n\nWhen things go wrong.",
    },
    {
      id: "d5",
      title: "Changelog",
      description: "Release notes",
      icon: FileText,
      value: "# Changelog\n\nv1.0 — first release.",
    },
  ]);
  const [combinedOpenIds, setCombinedOpenIds] = useState<string[]>([
    "d1",
    "d2",
  ]);
  const [combinedActiveId, setCombinedActiveId] = useState<string | undefined>(
    "d1",
  );

  // Single Editor Example
  const singleEditorCode = `import { ContentEditor } from '@/components/content-editor';

const [content, setContent] = useState('# Your content here');

<ContentEditor
  value={content}
  onChange={setContent}
  availableModes={['plain', 'wysiwyg', 'markdown', 'preview']}  // All modes available
  initialMode="plain"                    // Starting mode
  autoSave={false}                       // Enable auto-save
  autoSaveDelay={1000}                   // Delay in ms
  onSave={(content) => {                 // Save callback
    console.log('Saving:', content);
  }}
  collapsible={false}                    // Make collapsible
  defaultCollapsed={false}               // Start collapsed
  title="Content Editor"                 // Header title
  headerActions={[]}                     // Custom header actions
  showCopyButton={true}                  // Show copy dropdown (default: true)
  showContentManager={true}              // Show content manager (default: true)
  onShowHtmlPreview={(html, title) => {  // HTML preview handler
    console.log('HTML:', html);
  }}
  placeholder="Start typing..."         // Placeholder text
  showModeSelector={true}                // Show mode selector
  className=""                           // Additional classes
/>`;

  // Stack Example
  const stackCode = `import { ContentEditorStack } from '@/components/content-editor';

const [contents, setContents] = useState([
  '# Section 1\\n\\nContent...',
  '# Section 2\\n\\nMore content...'
]);

<ContentEditorStack
  contents={contents}                    // Array of content strings
  onContentsChange={setContents}         // Callback when any content changes
  availableModes={['plain', 'preview']}  // Modes available to all editors
  initialMode="preview"                  // Starting mode for all
  autoSave={false}                       // Apply to all
  onSave={(content, index) => {          // Save callback with index
    console.log(\`Saving editor \${index}:\`, content);
  }}
  collapsible={true}                     // Make all collapsible
  defaultCollapsed={true}                // Collapse all but first
  generateTitle={(index) =>              // Generate titles from index
    ['Intro', 'Body', 'Conclusion'][index]
  }
  headerActions={[]}                     // Same actions for all
  showCopyButton={true}                  // Show on all
  showContentManager={true}              // Show on all
  onShowHtmlPreview={handlePreview}      // HTML preview handler
  placeholder="Type here..."             // Placeholder for all
  showModeSelector={true}                // Show on all
  spacing="md"                           // 'sm' | 'md' | 'lg'
  className=""                           // Additional classes
/>`;

  // Custom Actions Example
  const customActionsCode = `import { Download } from 'lucide-react';
import type { HeaderAction } from '@/components/content-editor';

const customActions: HeaderAction[] = [
  {
    id: 'download',
    icon: Download,
    label: 'Download as markdown',
    onClick: (content) => {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'content.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
];

<ContentEditor
  value={content}
  onChange={setContent}
  headerActions={customActions}
/>`;

  const handleShowHtmlPreview = (html: string, title?: string) => {
    setHtmlContent(html);
    setHtmlTitle(title || "HTML Preview");
    setHtmlModal(true);
  };

  const customActions: HeaderAction[] = [
    {
      id: "download",
      icon: Download,
      label: "Download as markdown",
      onClick: (content) => {
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "content.md";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <>
      <ComponentDisplayWrapper component={component} code={singleEditorCode}>
        <div className="space-y-8">
          {/* Single Editor Demo */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
              Single Editor
            </h3>
            <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden">
              <ContentEditor
                value={content}
                onChange={setContent}
                // availableModes={['plain', 'wysiwyg', 'markdown', 'preview']}
                initialMode="plain"
                collapsible={false}
                title="Content Editor Demo"
                headerActions={customActions}
                showCopyButton={true}
                showContentManager={true}
                onShowHtmlPreview={handleShowHtmlPreview}
                placeholder="Start typing your content..."
                showModeSelector={true}
              />
            </div>
          </div>

          {/* Stack Demo */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
              ContentEditorStack - Multiple Editors
            </h3>
            <div className="space-y-3">
              <ContentEditorStack
                contents={stackContents}
                onContentsChange={setStackContents}
                availableModes={["plain", "preview"]}
                initialMode="preview"
                collapsible={true}
                defaultCollapsed={true}
                generateTitle={(index) => {
                  const titles = ["Introduction", "Main Content", "Conclusion"];
                  return titles[index] || `Section ${index + 1}`;
                }}
                showCopyButton={true}
                showContentManager={true}
                onShowHtmlPreview={handleShowHtmlPreview}
                placeholder="Edit this section..."
                showModeSelector={true}
                spacing="sm"
              />
            </div>
          </div>

          {/* Tabs Demo */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
              ContentEditorTabs — Browser-style tabs
            </h3>
            <ContentEditorTabs
              tabs={tabs}
              onTabsChange={setTabs}
              collapsible
              allowAddTab
              allowCloseTab
              onAddTab={() => ({
                id: crypto.randomUUID(),
                title: "Untitled",
                value: "",
              })}
              availableModes={["plain", "matrx-split", "preview"]}
              initialMode="matrx-split"
              showCopyButton
              showContentManager
              onShowHtmlPreview={handleShowHtmlPreview}
              placeholder="Write something..."
            />
          </div>

          {/* Standalone List Demo */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
              ContentEditorList — Standalone sidebar list
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Three item states:{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                active
              </span>
              ,{" "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                open
              </span>
              , and{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                closed
              </span>
              . Click a closed item to open it; click an open item to activate
              it.
            </p>
            <div className="flex gap-4 items-start">
              <div className="w-64">
                <ContentEditorList
                  items={listDemoItems}
                  activeId={listActiveId}
                  openIds={listOpenIds}
                  title="Sections"
                  onItemClick={(id) => {
                    if (!listOpenIds.includes(id)) {
                      setListOpenIds([...listOpenIds, id]);
                    }
                    setListActiveId(id);
                  }}
                />
              </div>
              <div className="flex-1 text-xs text-zinc-600 dark:text-zinc-400 space-y-2 bg-zinc-50 dark:bg-zinc-900/40 border border-border rounded-lg p-3">
                <div>
                  <span className="font-semibold">Active:</span> {listActiveId}
                </div>
                <div>
                  <span className="font-semibold">Open:</span>{" "}
                  {listOpenIds.join(", ") || "(none)"}
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setListOpenIds(["doc-intro"])}
                    className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-border rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Reset open
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setListOpenIds(listDemoItems.map((i) => i.id))
                    }
                    className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-border rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Open all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Combined List + Tabs Demo */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
              ContentEditorTabsWithList — Sidebar list + tabs
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Click an item in the sidebar to open it as a tab and activate it.
              Close a tab to take it back to the "closed" state in the list.
            </p>
            <ContentEditorTabsWithList
              documents={documents}
              onDocumentsChange={setDocuments}
              openIds={combinedOpenIds}
              onOpenIdsChange={setCombinedOpenIds}
              activeId={combinedActiveId}
              onActiveIdChange={setCombinedActiveId}
              listTitle="Documents"
              listWidth="w-56"
              collapsible
              allowCloseTab
              availableModes={["plain", "matrx-split", "preview"]}
              initialMode="matrx-split"
              showCopyButton
              showContentManager
              onShowHtmlPreview={handleShowHtmlPreview}
            />
          </div>

          {/* Code Examples Section */}
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                ContentEditorStack Usage
              </h3>
              <pre className="text-xs bg-zinc-900 dark:bg-black text-zinc-100 p-4 rounded-lg overflow-x-auto">
                <code>{stackCode}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                Custom Header Actions
              </h3>
              <pre className="text-xs bg-zinc-900 dark:bg-black text-zinc-100 p-4 rounded-lg overflow-x-auto">
                <code>{customActionsCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </ComponentDisplayWrapper>

      <HtmlPreviewModal
        isOpen={htmlModal}
        onClose={() => setHtmlModal(false)}
        htmlContent={htmlContent}
        title={htmlTitle}
      />
    </>
  );
}
