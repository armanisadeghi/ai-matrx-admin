"use client";

import React, { useCallback, useState } from 'react';
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
  TableExtension,
  HeadingExtension,
  BulletListExtension,
  OrderedListExtension,
  LinkExtension,
  ImageExtension,
  BlockquoteExtension,
  HorizontalRuleExtension
} from 'remirror/extensions';
import { motion } from 'framer-motion';
import { 
  Bold, Italic, Underline, Code, Link, Image, List, 
  ListOrdered, Quote, Heading1, Heading2, Heading3, 
  Table, Undo, Redo, MinusSquare
} from 'lucide-react';

const extensions = () => [
  new BoldExtension({}),
  new ItalicExtension({}),
  new UnderlineExtension({}),
  new MarkdownExtension({}),
  new CodeBlockExtension({}),
  new HistoryExtension({}),
  new TableExtension({}),
  new HeadingExtension({}),
  new BulletListExtension({}),
  new OrderedListExtension({}),
  new LinkExtension({}),
  new ImageExtension({}),
  new BlockquoteExtension({}),
  new HorizontalRuleExtension({})
];

const Menu: React.FC = () => {
  const commands = useCommands();

  const buttons = [
    { icon: Bold, action: commands.toggleBold },
    { icon: Italic, action: commands.toggleItalic },
    { icon: Underline, action: commands.toggleUnderline },
    { icon: Code, action: commands.toggleCode },
    { icon: Link, action: () => commands.createLink({ href: '' }) },
    { icon: Image, action: () => commands.insertImage({ src: '' }) },
    { icon: List, action: commands.toggleBulletList },
    { icon: ListOrdered, action: commands.toggleOrderedList },
    { icon: Quote, action: commands.toggleBlockquote },
    { icon: Heading1, action: () => commands.toggleHeading({ level: 1 }) },
    { icon: Heading2, action: () => commands.toggleHeading({ level: 2 }) },
    { icon: Heading3, action: () => commands.toggleHeading({ level: 3 }) },
    { icon: Table, action: () => commands.createTable({ rowsCount: 3, columnsCount: 3 }) },
    { icon: Undo, action: commands.undo },
    { icon: Redo, action: commands.redo },
    { icon: MinusSquare, action: commands.insertHorizontalRule }
  ];

  return (
    <motion.div 
      className="flex flex-wrap gap-2 mb-2 p-2 bg-background rounded-md shadow-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {buttons.map((button, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 transition-colors"
          onClick={() => { button.action(); commands.focus(); }}
        >
          <button.icon size={16} />
        </motion.button>
      ))}
    </motion.div>
  );
};

const RemirrorEditor: React.FC = () => {
  const [height, setHeight] = useState(300);
  const { manager, state } = useRemirror({
    extensions,
    content: 'Start typing here...',
    stringHandler: 'markdown',
  });

  const handleResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startHeight = height;

    const doDrag = (e: MouseEvent) => {
      setHeight(startHeight + e.clientY - startY);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }, [height]);

  return (
    <div className="w-full bg-background shadow-lg rounded-lg overflow-hidden">
      <Remirror manager={manager} initialContent={state}>
        <Menu />
        <div 
          className="w-full border border-border rounded-md focus-within:ring-2 focus-within:ring-primary/50 transition-shadow"
          style={{ height: `${height}px`, minHeight: '200px', maxHeight: '80vh' }}
        >
          <EditorComponent />
        </div>
        <div 
          className="h-2 bg-muted cursor-ns-resize" 
          onMouseDown={handleResize}
        />
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
      className="mt-2 text-sm text-muted-foreground flex items-center justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      Press Ctrl+S (Cmd+S on Mac) to save
    </motion.div>
  );
};

export default RemirrorEditor;