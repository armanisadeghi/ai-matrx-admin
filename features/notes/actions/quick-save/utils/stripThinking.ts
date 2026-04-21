export function stripThinking(input: string): string {
  if (!input) return "";
  return input
    .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning[^>]*>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasThinkingTags(input: string): boolean {
  if (!input) return false;
  return /<(thinking|reasoning)[^>]*>[\s\S]*?<\/\1>/i.test(input);
}
