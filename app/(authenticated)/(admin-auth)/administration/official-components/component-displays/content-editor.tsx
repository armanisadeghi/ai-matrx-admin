'use client';

import React, { useState } from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import { ContentEditor, ContentEditorStack, type HeaderAction } from '@/components/content-editor';
import { Download } from 'lucide-react';
import HtmlPreviewModal from '@/features/html-pages/components/HtmlPreviewModal';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function ContentEditorDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  // Demo state
  const [content, setContent] = useState('# Welcome\n\nThis is a **powerful** content editor!');
  const [stackContents, setStackContents] = useState([
    '# Section 1\n\nFirst section content...',
    '# Section 2\n\nSecond section content...',
    '# Section 3\n\nThird section content...'
  ]);
  const [htmlModal, setHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlTitle, setHtmlTitle] = useState('');

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
    setHtmlTitle(title || 'HTML Preview');
    setHtmlModal(true);
  };

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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  ];

  return (
    <>
      <ComponentDisplayWrapper
        component={component}
        code={singleEditorCode}
        description="A powerful, multi-mode content editor with built-in copy, export, and content management features. Supports plain text, WYSIWYG, markdown split view, and preview modes."
      >
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
                availableModes={['plain', 'wysiwyg', 'markdown', 'preview']}
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
                availableModes={['plain', 'preview']}
                initialMode="preview"
                collapsible={true}
                defaultCollapsed={true}
                generateTitle={(index) => {
                  const titles = ['Introduction', 'Main Content', 'Conclusion'];
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

