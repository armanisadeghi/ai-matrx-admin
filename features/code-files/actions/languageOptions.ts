// features/code-files/actions/languageOptions.ts
//
// Canonical language list for the Quick Save picker. Keep this list aligned
// with the languages Monaco understands so UI picks map 1:1 to the editor
// language prop used by MultiFileCodeEditor.

export interface LanguageOption {
  value: string;
  label: string;
  /** Common file extensions (no leading dot). */
  exts: string[];
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "plaintext", label: "Plain Text", exts: ["txt"] },
  { value: "typescript", label: "TypeScript", exts: ["ts", "tsx"] },
  {
    value: "javascript",
    label: "JavaScript",
    exts: ["js", "jsx", "mjs", "cjs"],
  },
  { value: "python", label: "Python", exts: ["py"] },
  { value: "json", label: "JSON", exts: ["json"] },
  { value: "html", label: "HTML", exts: ["html", "htm"] },
  { value: "css", label: "CSS", exts: ["css"] },
  { value: "scss", label: "SCSS", exts: ["scss"] },
  { value: "markdown", label: "Markdown", exts: ["md", "mdx"] },
  { value: "yaml", label: "YAML", exts: ["yml", "yaml"] },
  { value: "xml", label: "XML", exts: ["xml"] },
  { value: "sql", label: "SQL", exts: ["sql"] },
  { value: "shell", label: "Shell", exts: ["sh", "bash", "zsh"] },
  { value: "go", label: "Go", exts: ["go"] },
  { value: "rust", label: "Rust", exts: ["rs"] },
  { value: "java", label: "Java", exts: ["java"] },
  { value: "csharp", label: "C#", exts: ["cs"] },
  { value: "cpp", label: "C++", exts: ["cpp", "cc", "cxx", "h", "hpp"] },
  { value: "c", label: "C", exts: ["c"] },
  { value: "php", label: "PHP", exts: ["php"] },
  { value: "ruby", label: "Ruby", exts: ["rb"] },
  { value: "swift", label: "Swift", exts: ["swift"] },
  { value: "kotlin", label: "Kotlin", exts: ["kt", "kts"] },
  { value: "dart", label: "Dart", exts: ["dart"] },
  { value: "dockerfile", label: "Dockerfile", exts: ["dockerfile"] },
  { value: "toml", label: "TOML", exts: ["toml"] },
  { value: "ini", label: "INI", exts: ["ini"] },
];

const EXT_TO_LANG = new Map<string, string>();
for (const opt of LANGUAGE_OPTIONS) {
  for (const ext of opt.exts) EXT_TO_LANG.set(ext, opt.value);
}

export function extensionForLanguage(language: string): string {
  const opt = LANGUAGE_OPTIONS.find((o) => o.value === language);
  return opt?.exts[0] ?? "txt";
}

export function languageFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "plaintext";
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_TO_LANG.get(ext) ?? "plaintext";
}
