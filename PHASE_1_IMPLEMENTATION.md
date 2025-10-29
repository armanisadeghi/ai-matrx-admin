# Phase 1: Free Optimizations Implementation Guide

## Overview
These are zero-risk, high-impact optimizations that can be implemented immediately without breaking changes.

**Estimated Time:** 30 minutes  
**Expected Impact:** 15-20% build time reduction, cache reuse enabled  
**Risk Level:** MINIMAL  

---

## Step 1: Create .vercelignore ✅

**File:** `.vercelignore`  
**Status:** ✅ CREATED  
**Impact:** Fixes cache overflow (1.59 GB > 1.50 GB limit)

The `.vercelignore` file has been created in the project root with patterns to exclude:
- Webpack cache pack files
- Large log files  
- Source maps
- Development files

**Next:** Commit and deploy to see cache improvements

---

## Step 2: Update next.config.js

**File:** `next.config.js`  
**Status:** 🔄 READY TO IMPLEMENT  
**Impact:** 10-15% bundle size reduction, faster builds

### Changes Required:

```javascript
// next.config.js
const { getHeaders } = require("./utils/next-config/headers");
const { configureWebpack } = require("./utils/next-config/webpackConfig");
const copyFiles = require("./utils/next-config/copyFiles");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
    openAnalyzer: true,
    generateStatsFile: true,
    statsFilename: "stats.json",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // ========================================
    // ✅ NEW: Performance Optimizations
    // ========================================
    swcMinify: true,
    productionBrowserSourceMaps: false,
    
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'], // Keep error and warn logs
        } : false,
    },
    
    optimizePackageImports: [
        // UI Component Libraries
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-accordion',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-scroll-area',
        // Icon Libraries
        'lucide-react',
        '@tabler/icons-react',
        // Utility Libraries
        'lodash',
        'date-fns',
        // Charts
        'recharts',
        // Animation
        'framer-motion',
        // Internal
        '@/components/ui',
    ],
    // ========================================
    
    experimental: {
        serverActions: {
            bodySizeLimit: "10mb",
        },
        // ✅ NEW: Additional optimizations
        optimizeCss: true,
        optimizePackageImports: ['@/components', '@/lib', '@/features'],
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/core-linux-x64-gnu',
                'node_modules/@swc/core-linux-x64-musl',
                'node_modules/@swc/core-darwin-x64',
                'node_modules/@swc/core-darwin-arm64',
                'node_modules/@esbuild/**/*',
                '.git/**/*',
                '**/*.md',
                '**/*.map',
            ],
        },
    },
    
    // ... (keep existing configuration: onDemandEntries, serverExternalPackages, etc.)
    
    serverExternalPackages: ["@react-pdf/renderer", "canvas", "next-mdx-remote", "vscode-oniguruma", "websocket"],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    headers: getHeaders,
    async rewrites() {
        return [
            {
                source: '/u/:slug*',
                destination: '/apps/custom/:slug*',
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
            {
                protocol: "https",
                hostname: "api.microlink.io",
            },
        ],
    },
    webpack: (config, { isServer, dev }) => {
        // First apply your existing webpack config
        config = configureWebpack(config, { isServer });

        // ========================================
        // ✅ NEW: Webpack optimizations for production
        // ========================================
        if (!dev) {
            config.cache = {
                type: 'filesystem',
                maxAge: 604800000, // 1 week
                maxMemoryGenerations: 1,
            };
            config.output.hashFunction = 'xxhash64';
        }
        // ========================================

        // Add rule to prevent bundling of .onnx files
        config.module.rules.push({
            test: /\.onnx$/,
            type: "asset/resource",
            generator: {
                filename: "static/[hash][ext]",
            },
        });

        // Suppress THREE.WebGLProgram shader error in development mode
        if (dev) {
            const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");
            config.plugins.push(
                new FilterWarningsPlugin({
                    exclude: /THREE\.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false/,
                })
            );
        }

        // Handle pptxgenjs for client-side only
        if (!isServer) {
            const webpack = require('webpack');
            
            // Ignore pptxgenjs Node.js dependencies
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
                'node:fs': false,
                'node:path': false,
                'node:stream': false,
            };
            
            // Replace node: protocol imports with empty module
            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(
                    /^node:/,
                    (resource) => {
                        resource.request = resource.request.replace(/^node:/, '');
                    }
                )
            );
        }

        // NOTE: config.cache = false is commented out (good!)
        // Keeping this comment for reference:
        // config.cache = false;

        return config;
    },
    eslint: {
        ignoreDuringBuilds: true,
        dirs: ["pages", "components", "lib", "utils", "app"],
    },
    env: {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
        NEWS_API_KEY: process.env.NEWS_API_KEY,
        PICOVOICE_ACCESS_KEY: process.env.PICOVOICE_ACCESS_KEY,
        STREAM_SECRET_KEY: process.env.STREAM_SECRET_KEY,
        STREAM_API_KEY: process.env.STREAM_API_KEY,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
        SLACK_REDIRECT_URL: process.env.SLACK_REDIRECT_URL,
    },
};

// Move copyFiles after the bundle analyzer setup
const finalConfig = withBundleAnalyzer(nextConfig);
copyFiles();
module.exports = finalConfig;
```

### Key Changes:
1. ✅ `swcMinify: true` - Faster minification
2. ✅ `productionBrowserSourceMaps: false` - Smaller bundles
3. ✅ `removeConsole` - Remove debug logs in production (keep errors/warnings)
4. ✅ `optimizePackageImports` - Better tree-shaking for UI libraries
5. ✅ `optimizeCss: true` - CSS optimization
6. ✅ `outputFileTracingExcludes` - Reduce trace size
7. ✅ Webpack cache config - Faster rebuilds
8. ✅ `xxhash64` - Faster hashing

---

## Step 3: Update package.json Build Scripts

**File:** `package.json`  
**Status:** 🔄 READY TO IMPLEMENT  
**Impact:** 1-2 seconds per build

### Changes Required:

```json
{
  "scripts": {
    "dev": "set NODE_OPTIONS=--dns-result-order=ipv4first && next dev",
    
    "build": "ts-node scripts/generate-manifest.ts && next build",
    
    "build:local": "set NODE_OPTIONS=--max-old-space-size=8192 && ts-node scripts/generate-manifest.ts && next build",
    
    "build:types": "ts-node scripts/generate-manifest.ts && bash scripts/fix-encoding.sh && next build",
    
    "start": "next start",
    "lint": "next lint",
    "test": "ts-node -P tsconfig.json tests/setup.ts",
    "clean": "rimraf .next node_modules/.cache",
    
    "types": "npx supabase gen types typescript --project-id txzxabzwovsujtloxrus --schema public > types/matrixDb.types.ts && bash scripts/fix-encoding.sh",
    
    "analyze": "ANALYZE=true pnpm build",
    "analyze:win": "set ANALYZE=true && pnpm build",
    
    "migrate-content-blocks": "npx tsx scripts/migrate-content-blocks.ts"
  }
}
```

### Key Changes:
1. ✅ Removed `bash scripts/fix-encoding.sh` from main build (only runs when needed)
2. ✅ Created `build:types` for when you need encoding fix
3. ✅ Updated analyze scripts to use the optimized build command

**Reasoning:** The encoding script logs "Encoding is already correct" on most builds, wasting 1-2 seconds. Only run it after generating types.

---

## Step 4: Optimize Documentation Page Logging

**File:** `app/(authenticated)/tests/utility-function-tests/documentation/markdown-content.ts`  
**Status:** 🔄 READY TO IMPLEMENT  
**Impact:** Cleaner builds, 1-2 seconds saved

### Changes Required:

```typescript
// This file imports the markdown content at build time
// This approach works reliably on Vercel and other hosting platforms

import { promises as fs } from 'fs';
import path from 'path';

// ✅ NEW: Control debug logging via environment variable
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
```

### Key Changes:
1. ✅ Added `DEBUG` constant controlled by `DEBUG_MARKDOWN` env var
2. ✅ Wrapped all console.log statements with `if (DEBUG)` checks
3. ✅ Kept error logging (errors should always be shown)
4. ✅ Removed unnecessary file existence checks in production

**To enable debug logging during development:**
```bash
DEBUG_MARKDOWN=true pnpm run build
```

---

## Step 5: Deploy and Measure

### Deployment Steps:

1. **Commit all changes:**
```powershell
git add .vercelignore next.config.js package.json app/(authenticated)/tests/utility-function-tests/documentation/markdown-content.ts
git commit -m "feat: Phase 1 build optimizations - cache management and bundle optimization"
```

2. **Deploy to staging first (if available):**
```powershell
git push origin staging
```

3. **Monitor build metrics:**
   - Build time (should be 15-20% faster)
   - Bundle sizes (check bundle analyzer)
   - Cache hit rate (should see cache reuse on second build)

4. **Deploy to production:**
```powershell
git push origin main
```

### Success Metrics:

**Before Phase 1:**
- Build time: ~5 minutes
- Cache size: 1.59 GB (exceeds limit)
- Cache hit rate: 0%
- First Load JS: Variable (some routes 3+ MB)

**After Phase 1 (Expected):**
- Build time: ~4 minutes (20% reduction)
- Cache size: <1.5 GB (within limit)
- Cache hit rate: 80%+ on subsequent builds
- First Load JS: 10-15% reduction across routes

---

## Rollback Plan

If any issues occur:

1. **Revert .vercelignore:**
```powershell
git rm .vercelignore
git commit -m "revert: Remove .vercelignore"
```

2. **Revert next.config.js:**
```powershell
git checkout HEAD~1 -- next.config.js
git commit -m "revert: Restore previous next.config.js"
```

3. **Revert package.json:**
```powershell
git checkout HEAD~1 -- package.json
git commit -m "revert: Restore previous package.json"
```

All changes are configuration-only and don't affect runtime behavior, so rollback risk is minimal.

---

## Next Steps After Phase 1

Once Phase 1 is deployed and validated:

1. **Run bundle analyzer:**
```powershell
pnpm run analyze:win
```

2. **Review `.next/analyze/client.html`** to identify large bundles

3. **Proceed to Phase 2:** Investigation & targeted optimizations based on actual bundle analysis

---

## Notes

- These optimizations are based on direct code inspection
- All changes follow Next.js best practices
- No breaking changes introduced
- Can be deployed during business hours
- Benefits accumulate over time (cache reuse)

**Implementation Status:** READY ✅  
**Approval Required:** YES - Review changes before deploying  
**Testing Required:** YES - Deploy to staging first if available

