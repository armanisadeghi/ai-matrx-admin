'use client';
import React, { useState, useEffect } from 'react';
import { createHighlighter } from 'shiki';
import { useTheme } from 'next-themes';

const themes = {
  light: 'github-light',
  dark: 'github-dark',
};

const SyntaxHighlighter = ({ code, language = 'sql' }) => {
  const { theme: currentTheme } = useTheme();
  const [html, setHtml] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHighlighter = async () => {
      try {
        const highlighter = await createHighlighter({
          themes: Object.values(themes),
          langs: [language],
        });

        if (isMounted) {
          const highlighted = highlighter.codeToHtml(code, {
            lang: language,
            themes: {
              light: themes.light,
              dark: themes.dark,
            },
          });
          setHtml(highlighted);
        }
      } catch (error) {
        console.error('Error loading syntax highlighter:', error);
        if (isMounted) {
          setHtml(`<pre><code>${code}</code></pre>`);
        }
      }
    };

    loadHighlighter();

    return () => {
      isMounted = false;
    };
  }, [code, currentTheme, language]);

  return (
      <div
          className="shiki-wrapper text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
      />
  );
};

export default SyntaxHighlighter;
