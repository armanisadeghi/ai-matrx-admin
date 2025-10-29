// This file imports the markdown content at build time
// This approach works reliably on Vercel and other hosting platforms

import { promises as fs } from 'fs';
import path from 'path';

const DEBUG = process.env.DEBUG_MARKDOWN === 'true';

// Cache the content to avoid re-reading on every request
let cachedContent: {
  readme: string;
  systemAnalysis: string;
  quickStart: string;
  roadmap: string;
} | null = null;

export async function getMarkdownContent() {
  // Return cached content if available
  if (cachedContent) {
    if (DEBUG) console.log('✅ Returning cached markdown content');
    return cachedContent;
  }

  if (DEBUG) {
    console.log('🔍 Debug Info:');
    console.log('  - process.cwd():', process.cwd());
    console.log('  - __dirname equivalent:', path.resolve('.'));
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
  }

  // Use path.resolve('.') instead of process.cwd() because process.cwd() 
  // returns '/' in this Next.js environment, while path.resolve('.') correctly
  // returns the actual project directory
  const docsPath = path.join(
    path.resolve('.'),
    'app',
    '(authenticated)',
    'tests',
    'utility-function-tests',
    'documentation'
  );

  if (DEBUG) console.log('  - Constructed docsPath:', docsPath);

  // Check each file individually (only in debug mode)
  if (DEBUG) {
    const files = ['README.md', 'SYSTEM_ANALYSIS.md', 'QUICK_START_GUIDE.md', 'DEVELOPMENT_ROADMAP.md'];
    
    console.log('\n🔍 Checking file existence:');
    for (const file of files) {
      const fullPath = path.join(docsPath, file);
      try {
        await fs.access(fullPath);
        console.log(`  ✅ ${file} exists at: ${fullPath}`);
      } catch {
        console.log(`  ❌ ${file} NOT FOUND at: ${fullPath}`);
      }
    }
    console.log('\n📖 Attempting to read all markdown files...');
  }

  try {
    
    const [readme, systemAnalysis, quickStart, roadmap] = await Promise.all([
      fs.readFile(path.join(docsPath, 'README.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'SYSTEM_ANALYSIS.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'QUICK_START_GUIDE.md'), 'utf8'),
      fs.readFile(path.join(docsPath, 'DEVELOPMENT_ROADMAP.md'), 'utf8'),
    ]);

    if (DEBUG) console.log('✅ Successfully read all markdown files');

    cachedContent = {
      readme,
      systemAnalysis,
      quickStart,
      roadmap,
    };

    return cachedContent;
  } catch (error) {
    console.error('\n❌ Error reading markdown files:', error);
    console.error('📁 Attempted path:', docsPath);
    throw new Error(`Failed to read markdown files from: ${docsPath}`);
  }
}

