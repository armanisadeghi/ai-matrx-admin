# Token Counter Utility

Ultra-lightweight token counting using `js-tiktoken` with o200k_base encoding (GPT-5, GPT-4o, and newer OpenAI models).

## Features

- ✅ **Minimal & Fast**: Only one encoding, one function
- ✅ **Local**: No API calls, no API keys needed
- ✅ **Accurate**: Uses exact OpenAI tokenizer (o200k_base)
- ✅ **Simple**: Just pass text, get tokens back
- ✅ **Lightweight**: Uses js-tiktoken/lite with minimal bundle size

## Installation

```bash
pnpm add js-tiktoken
```

## Usage

### Basic Token Counting

```typescript
import { countTokens } from '@/utils/token-counter';

const result = countTokens("Hello world");
console.log(result.tokens); // 2
console.log(result.characters); // 11
```

That's it! No models to specify, no configuration needed.

### Format for Display

```typescript
import { countTokens, formatTokenCount } from '@/utils/token-counter';

const result = countTokens(longText);
console.log(formatTokenCount(result.tokens)); // "1,234,567"
```

## Direct Usage (No API Needed!)

Since the utility works locally and synchronously, just import and use it directly:

```typescript
import { countTokens } from '@/utils/token-counter';

const result = countTokens(extractedText);
console.log(result.tokens); // Token count
console.log(result.characters); // Character count
```

No need for API routes, fetch calls, or async/await!

## What Encoding?

Uses **o200k_base** - the encoding for:
- GPT-5 (and future models)
- GPT-4o
- GPT-4 Turbo
- All modern OpenAI models

This is the exact same tokenizer that OpenAI's API uses, so you get 100% accurate counts.

## Bundle Size

Using `js-tiktoken/lite` with only the o200k_base encoding keeps the bundle size minimal. The full js-tiktoken library includes all encodings (gpt2, cl100k_base, etc.) which significantly increases bundle size.

## Why No API Route?

Since `js-tiktoken` runs **locally and synchronously**, there's no need for API routes or fetch calls. Just import and use the function directly in your components. This makes it:
- ⚡ **Faster** - No network roundtrip
- 🎯 **Simpler** - Fewer files, less complexity
- 🔒 **More reliable** - No HTTP errors to handle

## Notes

- **OpenAI only**: This utility is designed for OpenAI models only
- **No multi-provider support**: Doesn't support Anthropic or Google (they use different tokenizers)
- **Synchronous**: Returns results instantly since everything is local
- **Fallback**: Automatically falls back to simple estimation (text.length / 4) if tiktoken fails
- **Singleton**: Tokenizer instance is reused for performance
- **No API needed**: Import and use directly - no API routes required

## Example Integration

See `/app/(public)/demos/api-tests/pdf-extract/page.tsx` for a complete example showing:
- Token counting after PDF text extraction
- Loading states
- Display formatting
- Error handling
