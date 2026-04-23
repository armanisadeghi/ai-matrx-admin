/**
 * Filename → language id → icon mapping.
 *
 * Centralizes the "what icon does this file get?" decision so the FileTree,
 * editor tabs, and any other consumer stay consistent.
 */
import React from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLanguageIconNode } from "./language-display";

/** Map file extension (without dot) → Monaco language id. */
const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  cs: "csharp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  c: "c",
  h: "c",
  sql: "sql",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ps1: "powershell",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  md: "markdown",
  mdx: "markdown",
  r: "r",
  graphql: "graphql",
  gql: "graphql",
};

/** Map exact filename → Monaco language id (wins over extension matching). */
const NAME_TO_LANGUAGE: Record<string, string> = {
  Dockerfile: "docker",
  ".dockerignore": "docker",
  Makefile: "shell",
  ".gitignore": "shell",
  ".env": "shell",
  ".env.local": "shell",
  ".env.production": "shell",
  ".env.development": "shell",
  "tsconfig.json": "json",
  "package.json": "json",
  "package-lock.json": "json",
  "pnpm-lock.yaml": "yaml",
};

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/** Returns the Monaco language id for a filename, or "plaintext". */
export function languageFromFilename(filename: string): string {
  if (NAME_TO_LANGUAGE[filename]) return NAME_TO_LANGUAGE[filename];
  const ext = extOf(filename);
  if (ext && EXT_TO_LANGUAGE[ext]) return EXT_TO_LANGUAGE[ext];
  return "plaintext";
}

interface FileIconProps {
  name: string;
  kind?: "file" | "directory";
  expanded?: boolean;
  size?: number;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  name,
  kind = "file",
  expanded,
  size = 14,
  className,
}) => {
  if (kind === "directory") {
    const Icon = expanded ? FolderOpen : Folder;
    return (
      <Icon
        size={size}
        className={cn("text-sky-500 dark:text-sky-400", className)}
      />
    );
  }

  const lang = languageFromFilename(name);
  if (lang === "plaintext") {
    return (
      <FileText
        size={size}
        className={cn("text-neutral-500 dark:text-neutral-400", className)}
      />
    );
  }
  return <>{getLanguageIconNode(lang, { size, className })}</>;
};
