'use client';

import RichTextBlock from '@/components/mardown-display/text-block/RichTextBlock';
import MarkdownBlock from '@/components/mardown-display/text-block/TextEditor';
import React, { useState } from 'react';


const TextEditorExample = () => {
  const [markdownContent, setMarkdownContent] = useState(`# Example Markdown Document

This is an example of a markdown document that can be edited with the new editor component.

## Features

- Edit and preview markdown
- Expand to full screen
- View word and character count
- Copy and download content

### Code Example

\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

You can collapse this document when it gets too long, and expand it when you need to see everything.
`);

  const [richTextContent, setRichTextContent] = useState(`This is an example of rich text editing.

You can format text using the toolbar above when in edit mode.

This component is perfect for plain text editing with some basic formatting options.

It supports the same expand/collapse functionality as the code editor.
`);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Text Editor Components</h1>
      
      <h2 className="text-xl font-semibold mb-2">Markdown Editor</h2>
      <MarkdownBlock 
        content={markdownContent} 
        onContentChange={setMarkdownContent}
      />
      
      <h2 className="text-xl font-semibold mb-2 mt-8">Rich Text Editor</h2>
      <RichTextBlock 
        content={richTextContent}
        onContentChange={setRichTextContent}
      />
    </div>
  );
};

export default TextEditorExample;