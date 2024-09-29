"use client";

import React, { useCallback } from 'react';
import 'remirror/styles/all.css';
import {
  Remirror,
  useRemirror,
  EditorComponent,
  useCommands,
  useHelpers,
  useKeymap
} from '@remirror/react';
import {
  BoldExtension,
  ItalicExtension,
  UnderlineExtension,
  MarkdownExtension,
  CodeBlockExtension,
  HistoryExtension,
  TableExtension
} from 'remirror/extensions';

const extensions = () => [
  new BoldExtension({}),
  new ItalicExtension({}),
  new UnderlineExtension({}),
  new MarkdownExtension({}),
  new CodeBlockExtension({}),
  new HistoryExtension({}),
  new TableExtension({})
];

const Menu: React.FC = () => {
  const { toggleBold, toggleItalic, toggleUnderline, focus } = useCommands();

  return (
    <div className="menu">
      <button onClick={() => toggleBold() && focus()}>Bold</button>
      <button onClick={() => toggleItalic() && focus()}>Italic</button>
      <button onClick={() => toggleUnderline() && focus()}>Underline</button>
    </div>
  );
};

const RemirrorEditor: React.FC = () => {
  const { manager, state } = useRemirror({
    extensions,
    content: 'Hello **Remirror**!',
    stringHandler: 'markdown',
  });

  const helpers = useHelpers();

  const handleSaveShortcut = useCallback(() => {
    const markdown = helpers.getMarkdown();
    console.log('Saving markdown:', markdown);
    return true;
  }, [helpers]);

  useKeymap('Mod-s', handleSaveShortcut);

  return (
    <div className="remirror-theme">
      <Remirror manager={manager} initialContent={state}>
        <Menu />
        <EditorComponent />
      </Remirror>
    </div>
  );
};

export default RemirrorEditor;