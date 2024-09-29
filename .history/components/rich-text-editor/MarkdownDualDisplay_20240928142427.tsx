"use client";

import React, { useState } from 'react';
import { Remirror, useRemirror } from '@remirror/react';
import { MarkdownExtension } from 'remirror/extensions';
import { useHelpers } from '@remirror/react';

const MarkdownDualDisplay: React.FC = () => {
  const [markdown, setMarkdown] = useState('# Hello Markdown\n\nThis is a **dual** display.');
  const { manager, state } = useRemirror({
    extensions: () => [new MarkdownExtension()],
    content: markdown,
    stringHandler: 'markdown',
  });

  const helpers = useHelpers();

  const handleChange = () => {
    const newMarkdown = helpers.getMarkdown();
    setMarkdown(newMarkdown);
  };

  return (
    <div className="flex">
      <div className="w-1/2 p-4">
        <h2 className="text-xl font-bold mb-2">Markdown Editor</h2>
        <Remirror
          manager={manager}
          initialContent={state}
          onChange={handleChange}
          autoFocus
          autoRender="end"
        />
      </div>
      <div className="w-1/2 p-4">
        <h2 className="text-xl font-bold mb-2">Preview</h2>
        <div dangerouslySetInnerHTML={{ __html: helpers.getHTML() }} />
      </div>
    </div>
  );
};

export default MarkdownDualDisplay;