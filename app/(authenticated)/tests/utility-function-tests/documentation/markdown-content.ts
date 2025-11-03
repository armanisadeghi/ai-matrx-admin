// This file reads markdown content at build/runtime
// The markdown files are now properly included via .vercelignore exception and outputFileTracingIncludes

import { promises as fs } from 'fs';
import path from 'path';

// Cache the content to avoid re-reading on every request
let markdownCache: {
  readme: string;
  systemAnalysis: string;
  quickStart: string;
  roadmap: string;
} | null = null;

export async function getMarkdownContent() {
  // Return cached content if available
  if (markdownCache) {
    return markdownCache;
  }

  const docsPath = path.join(
    process.cwd(),
    'app',
    '(authenticated)',
    'tests',
    'utility-function-tests',
    'documentation'
  );

  try {
    const [readme, systemAnalysis, quickStart, roadmap] = await Promise.all([
      fs.readFile(path.join(docsPath, 'README.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'SYSTEM_ANALYSIS.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'QUICK_START_GUIDE.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'DEVELOPMENT_ROADMAP.md'), 'utf8'),
    ]);

    markdownCache = {
      readme,
      systemAnalysis,
      quickStart,
      roadmap,
    };

    return markdownCache;
  } catch (error) {
    console.error('Error reading markdown files:', error);
    console.error('Attempted path:', docsPath);
    
    // Return placeholder content if files can't be read
    return {
      readme: '# Documentation\n\nDocumentation files are not available in this environment.',
      systemAnalysis: '# System Analysis\n\nSystem analysis is not available in this environment.',
      quickStart: '# Quick Start\n\nQuick start guide is not available in this environment.',
      roadmap: '# Development Roadmap\n\nRoadmap is not available in this environment.',
    };
  }
}

