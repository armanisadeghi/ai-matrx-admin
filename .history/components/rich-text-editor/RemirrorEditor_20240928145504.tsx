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
import { motion } from 'framer-motion';
import { Bold, Italic, Underline, Save } from 'lucide-react';

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
    <motion.div 
      className="flex space-x-2 mb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 bg-blue-500 text-white rounded-md"
        onClick={() => { toggleBold(); focus(); }}
      >
        <Bold size={16} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 bg-blue-500 text-white rounded-md"
        onClick={() => { toggleItalic(); focus(); }}
      >
        <Italic size={16} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 bg-blue-500 text-white rounded-md"
        onClick={() => { toggleUnderline(); focus(); }}
      >
        <Underline size={16} />
      </motion.button>
    </motion.div>
  );
};

const RemirrorEditor: React.FC = () => {
  const { manager, state } = useRemirror({
    extensions,
    content: 'Start typing here...',
    stringHandler: 'markdown',
  });

  return (
    <div className="w-full h-full min-h-[300px] p-4 bg-white shadow-lg rounded-lg">
      <Remirror manager={manager} initialContent={state}>
        <Menu />
        <div className="w-full h-full border rounded-md">
          <EditorComponent />
        </div>
        <SaveShortcut />
      </Remirror>
    </div>
  );
};

const SaveShortcut: React.FC = () => {
  const helpers = useHelpers();

  const handleSaveShortcut = useCallback(() => {
    const markdown = helpers.getMarkdown();
    console.log('Saving markdown:', markdown);
    return true;
  }, [helpers]);

  useKeymap('Mod-s', handleSaveShortcut);

  return (
    <motion.div
      className="mt-2 text-sm text-gray-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <Save size={14} className="inline mr-1" />
      Press Ctrl+S (Cmd+S on Mac) to save
    </motion.div>
  );
};

export default RemirrorEditor;