"use client";

import React, { useState, useCallback } from 'react';
import { Remirror, useRemirror, EditorComponent, useHelpers } from '@remirror/react';
import { MarkdownExtension } from 'remirror/extensions';

const MarkdownDualDisplay: React.FC = () => {
  const [markdown, setMarkdown] = useState('# Hello Markdown\n\nThis is a **dual** display.');
  const { manager, state, onChange } = useRemirror({
    extensions: () => [new MarkdownExtension({})],
    content: markdown,
    stringHandler: 'markdown',
  });

  const handleChange = useCallback(() => {
    const newMarkdown = manager.store.helpers.getMarkdown();
    setMarkdown(newMarkdown);
  }, [manager.store.helpers]);

  return (
    <div className="flex">
      <div className="w-1/2 p-4">
        <h2 className="text-xl font-bold mb-2">Markdown Editor</h2>
        <Remirror
          manager={manager}
          initialContent={state}
          onChange={handleChange}
          autoFocus
        >
          <EditorComponent />
          <Preview />
        </Remirror>
      </div>
    </div>
  );
};

const Preview: React.FC = () => {
  const helpers = useHelpers();
  const html = helpers.getHTML();

  return (
    <div className="w-1/2 p-4">
      <h2 className="text-xl font-bold mb-2">Preview</h2>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default MarkdownDualDisplay;