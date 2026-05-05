/**
 * Tests for the high-level scan-text façade.
 *
 * Run with: npx tsx utils/json/__tests__/scan-text.script.ts
 */

import { scanText, scanTextStreaming, TextScanner } from "../scan-text";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function section(name: string): void {
  console.log(`\n── ${name} ──`);
}

// =============================================================================
// scanText — one-shot
// =============================================================================

section("scanText — fenced JSON (image-studio describe payload)");

{
  const aiResponse =
    "```json\n" +
    "{\n" +
    '  "image_metadata": {\n' +
    '    "filename_base": "family-celebrating-birthday-at-home",\n' +
    '    "alt_text": "A group of four adults posing together indoors at a birthday celebration.",\n' +
    '    "caption": "Celebrating special moments with the ones who matter most.",\n' +
    '    "title": "Family Birthday Celebration Gathering",\n' +
    '    "description": "Four adults smiling together at an indoor birthday gathering.",\n' +
    '    "keywords": ["family celebration", "birthday gathering"],\n' +
    '    "dominant_colors": ["#E93222", "#F8F8F8"]\n' +
    "  }\n" +
    "}\n" +
    "```";

  const { text, data } = scanText(aiResponse);
  assert(text === aiResponse, "text returned untouched");
  assert(data.length === 1, "exactly one JSON value detected");
  assert(data[0].isComplete === true, "value is complete");
  assert(data[0].source === "fenced", "source is fenced");
  assert(data[0].type === "object", "type is object");
  const v = data[0].value as { image_metadata?: { filename_base?: string } };
  assert(
    v.image_metadata?.filename_base === "family-celebrating-birthday-at-home",
    "filename_base preserved",
  );
}

section("scanText — bare JSON (no fences)");

{
  const text = '{"name": "John", "age": 30}';
  const { data } = scanText(text);
  assert(data.length === 1, "bare JSON detected");
  assert(data[0].isComplete === true, "complete");
  assert((data[0].value as { name: string }).name === "John", "value correct");
}

section("scanText — JSON inside prose");

{
  const text = 'Here is the data: {"x": 1, "y": 2} and that\'s it.';
  const { text: returnedText, data } = scanText(text);
  assert(returnedText === text, "prose preserved");
  assert(data.length === 1, "embedded JSON detected");
  assert((data[0].value as { x: number }).x === 1, "value correct");
}

section("scanText — multiple JSON blocks");

{
  const text =
    'First: ```json\n{"a": 1}\n```\nSecond: ```json\n{"b": 2}\n```\nThird inline: {"c": 3}';
  const { data } = scanText(text);
  assert(data.length === 3, "all three JSONs detected");
  assert(
    data.every((d) => d.isComplete),
    "all complete",
  );
}

section("scanText — non-JSON text passes through untouched");

{
  const text = "This is just prose. No JSON here at all.";
  const { text: returnedText, data } = scanText(text);
  assert(returnedText === text, "text untouched");
  assert(data.length === 0, "no false positives");
}

section("scanText — non-string input");

{
  const { text, data } = scanText(undefined as unknown as string);
  assert(text === "", "undefined input yields empty string");
  assert(data.length === 0, "no data");
}

// =============================================================================
// scanTextStreaming — partial buffer
// =============================================================================

section("scanTextStreaming — auto-closes incomplete fenced JSON");

{
  const partial = '```json\n{"some_key":';
  const { data } = scanTextStreaming(partial);
  assert(data.length === 1, "partial detected");
  assert(data[0].isComplete === false, "marked incomplete");
  // The auto-closer should produce some valid JSON the consumer can render.
  assert(data[0].value !== undefined, "auto-closed value present");
}

section("scanTextStreaming — auto-closes bare JSON");

{
  const partial = '{"some_key":';
  const { data } = scanTextStreaming(partial);
  assert(data.length === 1, "partial bare JSON detected");
  assert(data[0].isComplete === false, "marked incomplete");
  assert(data[0].source === "bare-block", "source is bare-block");
}

section("scanTextStreaming — pattern with dangling key:value");

{
  // Realistic mid-stream snapshot — single object with a key but no value yet.
  const partial = '{"some_key":';
  const { data } = scanTextStreaming(partial);
  assert(data.length === 1, "dangling colon produces one auto-closed result");
  assert(data[0].isComplete === false, "marked incomplete");
  assert(
    typeof data[0].value === "object" && data[0].value !== null,
    "auto-closed value is a real object",
  );
  // The auto-closer fills the missing value with "" (or null) and seals the
  // brace. Either is fine — what matters is it parses.
  const obj = data[0].value as Record<string, unknown>;
  assert("some_key" in obj, "key preserved in auto-closed object");
}

section("scanTextStreaming — never crashes on malformed prose");

{
  // The contrived example from the original ask: nested unkeyed objects.
  // Strictly speaking this can't be auto-closed into valid JSON, so the
  // expected behavior is "return zero results, don't throw."
  const malformed = '[\n   {\n      {"some_key" :';
  const { text, data } = scanTextStreaming(malformed);
  assert(text === malformed, "text returned untouched even when invalid");
  assert(Array.isArray(data), "data is always an array (never throws)");
  // If anything was extractable it must be marked incomplete.
  assert(
    data.every((d) => d.isComplete === false),
    "any extracted entries marked incomplete",
  );
}

// =============================================================================
// TextScanner — chunked streaming
// =============================================================================

section("TextScanner — chunked stream of fenced JSON");

{
  const scanner = new TextScanner();

  const chunks = [
    "Here is the response:\n```json\n",
    '{\n  "image_metadata": {\n',
    '    "filename_base": "test",\n',
    '    "alt_text": "alt"\n',
    "  }\n",
    "}\n```\n",
  ];

  let lastResult: ReturnType<TextScanner["append"]> | null = null;
  for (const chunk of chunks) {
    lastResult = scanner.append(chunk);
  }

  assert(lastResult !== null, "scanner produced output");
  assert(lastResult!.data.length === 1, "single JSON detected");
  assert(lastResult!.data[0].isComplete === true, "complete after final chunk");

  const final = scanner.finalize();
  assert(
    final.data.length === 1 && final.data[0].isComplete === true,
    "finalize confirms result",
  );
  const v = final.data[0].value as {
    image_metadata?: { filename_base?: string };
  };
  assert(
    v.image_metadata?.filename_base === "test",
    "value preserved through chunks",
  );
}

section("TextScanner — chunked stream of bare JSON (no fences)");

{
  const scanner = new TextScanner();

  scanner.append('Some intro... {"id": 1, ');
  scanner.append('"name": "Alice", ');
  const mid = scanner.append('"age":');
  // While streaming, we should have a partial detection.
  assert(mid.data.length >= 1, "partial bare JSON visible mid-stream");
  assert(mid.data[0].isComplete === false, "still incomplete");

  const end = scanner.append("30}");
  assert(end.data.length === 1, "final chunk completes");
  assert(end.data[0].isComplete === true, "now complete");
  assert(
    (end.data[0].value as { name: string }).name === "Alice",
    "bare JSON parsed correctly",
  );
}

section("TextScanner — text returned untouched even when JSON found");

{
  const scanner = new TextScanner();
  scanner.append("Here is the JSON: ");
  const result = scanner.append('```json\n{"x":1}\n```');
  assert(
    result.text === 'Here is the JSON: ```json\n{"x":1}\n```',
    "full text accumulates verbatim",
  );
  assert(result.data.length === 1, "JSON detected");
}

section("TextScanner — reset clears everything");

{
  const scanner = new TextScanner();
  scanner.append('```json\n{"a":1}\n```');
  scanner.reset();
  assert(scanner.getText() === "", "text cleared");
  const after = scanner.append("hello");
  assert(after.text === "hello", "fresh state after reset");
  assert(after.data.length === 0, "no stale results");
}

section("TextScanner — empty / non-string append is a no-op");

{
  const scanner = new TextScanner();
  scanner.append("");
  scanner.append(undefined as unknown as string);
  scanner.append("real text");
  assert(scanner.getText() === "real text", "ignores empty/invalid chunks");
}

// =============================================================================
// Summary
// =============================================================================

console.log("\n" + "=".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50));

if (failed > 0) {
  process.exit(1);
}
