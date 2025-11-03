import { splitContentIntoBlocks } from "../content-splitter";
import { splitContentIntoBlocksV2 } from "../content-splitter-v2";
import { ContentBlock } from "../content-splitter";

/**
 * Test utility to compare outputs of old and new content splitters
 * This helps ensure the refactored version produces identical results
 */

function normalizeBlock(block: ContentBlock): ContentBlock {
    // Normalize blocks for comparison (remove unstable fields)
    const normalized = { ...block };
    
    // Remove metadata fields that might differ slightly
    if (normalized.metadata) {
        delete normalized.metadata?.cacheKey;
    }
    
    return normalized;
}

function compareBlocks(oldBlocks: ContentBlock[], newBlocks: ContentBlock[]): {
    identical: boolean;
    differences: string[];
} {
    const differences: string[] = [];
    
    if (oldBlocks.length !== newBlocks.length) {
        differences.push(`Block count mismatch: old=${oldBlocks.length}, new=${newBlocks.length}`);
    }
    
    const maxLength = Math.max(oldBlocks.length, newBlocks.length);
    
    for (let i = 0; i < maxLength; i++) {
        const oldBlock = oldBlocks[i];
        const newBlock = newBlocks[i];
        
        if (!oldBlock) {
            differences.push(`Block ${i}: Missing in old version`);
            continue;
        }
        
        if (!newBlock) {
            differences.push(`Block ${i}: Missing in new version`);
            continue;
        }
        
        if (oldBlock.type !== newBlock.type) {
            differences.push(`Block ${i}: Type mismatch - old="${oldBlock.type}", new="${newBlock.type}"`);
        }
        
        if (oldBlock.content !== newBlock.content) {
            const oldPreview = oldBlock.content.substring(0, 50);
            const newPreview = newBlock.content.substring(0, 50);
            differences.push(`Block ${i}: Content mismatch - old="${oldPreview}...", new="${newPreview}..."`);
        }
        
        if (oldBlock.language !== newBlock.language) {
            differences.push(`Block ${i}: Language mismatch - old="${oldBlock.language}", new="${newBlock.language}"`);
        }
    }
    
    return {
        identical: differences.length === 0,
        differences
    };
}

/**
 * Test both splitters with the same content and report differences
 */
export function testSplitterComparison(content: string, label: string = "Test"): boolean {
    console.log(`\n=== Testing: ${label} ===`);
    
    try {
        const oldBlocks = splitContentIntoBlocks(content);
        const newBlocks = splitContentIntoBlocksV2(content);
        
        const comparison = compareBlocks(oldBlocks, newBlocks);
        
        if (comparison.identical) {
            console.log("✅ PASS: Outputs are identical");
            return true;
        } else {
            console.log("❌ FAIL: Outputs differ");
            comparison.differences.forEach(diff => console.log(`  - ${diff}`));
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

// Sample test cases
export const TEST_CASES = {
    simpleText: "This is just plain text.",
    
    codeBlock: "```javascript\nconst x = 10;\nconsole.log(x);\n```",
    
    table: `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`,
    
    thinkingBlock: `<thinking>
Let me think about this...
I need to consider multiple factors.
</thinking>`,
    
    quiz: '```json\n{\n  "quiz_title": "Test Quiz",\n  "multiple_choice": [\n    {\n      "question": "What is 2+2?",\n      "options": ["3", "4", "5"],\n      "correct": 1\n    }\n  ]\n}\n```',
    
    mixed: `Here is some text.

\`\`\`javascript
const code = true;
\`\`\`

| A | B |
|---|---|
| 1 | 2 |

<thinking>
Some thoughts here
</thinking>

More text at the end.`,
    
    streamingTable: `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   |`,

    presentation: '```json\n{\n  "presentation": {\n    "slides": [\n      {"title": "Slide 1", "content": "Content here"}\n    ]\n  }\n}\n```',
};

/**
 * Run all test cases
 */
export function runAllTests(): { passed: number; failed: number; total: number } {
    let passed = 0;
    let failed = 0;
    
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║  Content Splitter V1 vs V2 Comparison     ║");
    console.log("╚════════════════════════════════════════════╝");
    
    for (const [label, content] of Object.entries(TEST_CASES)) {
        const result = testSplitterComparison(content, label);
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }
    
    const total = passed + failed;
    
    console.log("\n╔════════════════════════════════════════════╗");
    console.log(`║  Results: ${passed}/${total} passed, ${failed}/${total} failed${"".padEnd(14 - total.toString().length - passed.toString().length - failed.toString().length)}║`);
    console.log("╚════════════════════════════════════════════╝\n");
    
    return { passed, failed, total };
}

// Export for manual testing
export { splitContentIntoBlocks, splitContentIntoBlocksV2, compareBlocks };

