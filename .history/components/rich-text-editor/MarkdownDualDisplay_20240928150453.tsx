"use client";

import React, { useState, useCallback } from 'react';
import { Remirror, useRemirror, EditorComponent, useHelpers } from '@remirror/react';
import { MarkdownExtension } from 'remirror/extensions';
import { motion } from 'framer-motion';

const MarkdownDualDisplay: React.FC = () => {
  const [markdown, setMarkdown] = useState('Start typing here...');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const { manager, state, onChange } = useRemirror({
    extensions: () => [new MarkdownExtension({})],
    content: markdown,
    stringHandler: 'markdown',
  });

  const handleChange = useCallback(() => {
    const newMarkdown = manager.store.helpers.getMarkdown();
    setMarkdown(newMarkdown);
  }, [manager.store.helpers]);

  const handleResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startRatio = splitRatio;

    const doDrag = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const newRatio = startRatio + (e.clientX - startX) / containerWidth;
      setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }, [splitRatio]);

  return (
    <motion.div 
      className="flex flex-col sm:flex-row w-full h-[calc(100vh-4rem)] bg-background shadow-lg rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full sm:w-1/2 h-1/2 sm:h-full" style={{ flex: splitRatio }}>
        <Remirror
          manager={manager}
          initialContent={state}
          onChange={handleChange}
          autoFocus
        >
          <div className="w-full h-full border-r border-border focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
            <EditorComponent />
          </div>
        </Remirror>
      </div>
      <div 
        className="w-2 h-2 sm:h-full bg-muted cursor-col-resize sm:cursor-ew-resize" 
        onMouseDown={handleResize}
      />
      <Preview markdown={markdown} style={{ flex: 1 - splitRatio }} />
    </motion.div>
  );
};

const Preview: React.FC<{ markdown: string, style?: React.CSSProperties }> = ({ markdown, style }) => {
  const helpers = useHelpers();
  const html = helpers.getHTML(markdown);

  return (
    <motion.div 
      className="w-full sm:w-1/2 h-1/2 sm:h-full overflow-auto p-4 bg-card text-card-foreground"
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </motion.div>
  );
};

export default MarkdownDualDisplay;