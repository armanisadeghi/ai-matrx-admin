"use client";

import React from 'react';
import 'remirror/styles/all.css';
import { Remirror, useRemirror, EditorComponent } from '@remirror/react';
import { 
  BoldExtension, 
  ItalicExtension, 
  UnderlineExtension, 
  MarkdownExtension 
} from 'remirror/extensions';

const RemirrorEditor: React.FC = () => {
  const { manager, state } = useRemirror({
    extensions: () => [
      new BoldExtension(),
      new ItalicExtension(),
      new UnderlineExtension(),
      new MarkdownExtension({
        // Add any necessary configuration options for MarkdownExtension
      }),
    ],
    content: 'Hello Remirror!',
    selection: 'end',
  });

  return (
    <div className="remirror-theme">
      <Remirror manager={manager} initialContent={state}>
        <EditorComponent />
      </Remirror>
    </div>
  );
};

export default RemirrorEditor;