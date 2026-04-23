/**
 * Language icon + display system.
 *
 * Duplicated (and lightly retyped) from
 * features/code-editor/components/code-block/LanguageDisplay.tsx.
 */
import React from "react";
import {
  Braces,
  Code2,
  Coffee,
  File,
  FileCode,
  FileText,
  GitCompare,
  Globe,
  Hash,
  Terminal,
} from "lucide-react";
import {
  SiDocker,
  SiGo,
  SiGraphql,
  SiJavascript,
  SiKotlin,
  SiR,
  SiRuby,
  SiRust,
  SiSwift,
  SiTypescript,
} from "react-icons/si";
import { PiFileSqlBold } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { TwoColorPythonIcon } from "./custom-icons";

const DEFAULT_ICON_SIZE = 16;

type IconProps = { size?: number; className?: string };

interface LanguageInfo {
  name: string;
  icon: React.FC<IconProps>;
  color: string;
  /** null → icon has its own fixed size (e.g. custom SVGs). */
  size: number | null;
}

export const languageMap: Record<string, LanguageInfo> = {
  code: {
    name: "Code",
    icon: (p) => <Code2 {...p} />,
    color: "text-blue-500",
    size: DEFAULT_ICON_SIZE,
  },
  diff: {
    name: "Updates",
    icon: (p) => <GitCompare {...p} />,
    color: "text-emerald-500",
    size: DEFAULT_ICON_SIZE,
  },
  javascript: {
    name: "JavaScript",
    icon: (p) => <SiJavascript {...p} />,
    color: "text-yellow-500",
    size: DEFAULT_ICON_SIZE,
  },
  typescript: {
    name: "TypeScript",
    icon: (p) => <SiTypescript {...p} />,
    color: "text-blue-500",
    size: DEFAULT_ICON_SIZE,
  },
  jsx: {
    name: "JavaScript",
    icon: (p) => <SiJavascript {...p} />,
    color: "text-yellow-500",
    size: DEFAULT_ICON_SIZE,
  },
  tsx: {
    name: "TypeScript",
    icon: (p) => <SiTypescript {...p} />,
    color: "text-blue-500",
    size: DEFAULT_ICON_SIZE,
  },
  python: {
    name: "Python",
    icon: (p) => (
      <TwoColorPythonIcon
        size={p.size ?? DEFAULT_ICON_SIZE}
        className={p.className}
      />
    ),
    color: "text-green-500",
    size: null,
  },
  java: {
    name: "Java",
    icon: (p) => <Coffee {...p} />,
    color: "text-red-500",
    size: DEFAULT_ICON_SIZE,
  },
  csharp: {
    name: "C#",
    icon: (p) => <Hash {...p} />,
    color: "text-purple-500",
    size: DEFAULT_ICON_SIZE,
  },
  cpp: {
    name: "C++",
    icon: (p) => <Code2 {...p} />,
    color: "text-blue-600",
    size: DEFAULT_ICON_SIZE,
  },
  c: {
    name: "C",
    icon: (p) => <Code2 {...p} />,
    color: "text-blue-600",
    size: DEFAULT_ICON_SIZE,
  },
  sql: {
    name: "SQL",
    icon: (p) => <PiFileSqlBold {...p} />,
    color: "text-orange-500",
    size: DEFAULT_ICON_SIZE,
  },
  html: {
    name: "HTML",
    icon: (p) => <Globe {...p} />,
    color: "text-orange-600",
    size: DEFAULT_ICON_SIZE,
  },
  css: {
    name: "CSS",
    icon: (p) => <FileCode {...p} />,
    color: "text-blue-400",
    size: DEFAULT_ICON_SIZE,
  },
  scss: {
    name: "SCSS",
    icon: (p) => <FileCode {...p} />,
    color: "text-pink-500",
    size: DEFAULT_ICON_SIZE,
  },
  php: {
    name: "PHP",
    icon: (p) => <File {...p} />,
    color: "text-indigo-500",
    size: DEFAULT_ICON_SIZE,
  },
  bash: {
    name: "Bash",
    icon: (p) => <Terminal {...p} />,
    color: "text-green-600",
    size: DEFAULT_ICON_SIZE,
  },
  shell: {
    name: "Shell",
    icon: (p) => <Terminal {...p} />,
    color: "text-gray-500",
    size: DEFAULT_ICON_SIZE,
  },
  powershell: {
    name: "PowerShell",
    icon: (p) => <Terminal {...p} />,
    color: "text-blue-700",
    size: DEFAULT_ICON_SIZE,
  },
  ruby: {
    name: "Ruby",
    icon: (p) => <SiRuby {...p} />,
    color: "text-red-600",
    size: DEFAULT_ICON_SIZE,
  },
  go: {
    name: "Go",
    icon: (p) => <SiGo {...p} />,
    color: "text-cyan-500",
    size: DEFAULT_ICON_SIZE,
  },
  rust: {
    name: "Rust",
    icon: (p) => <SiRust {...p} />,
    color: "text-orange-700",
    size: DEFAULT_ICON_SIZE,
  },
  json: {
    name: "JSON",
    icon: (p) => <Braces {...p} />,
    color: "text-yellow-600",
    size: DEFAULT_ICON_SIZE,
  },
  yaml: {
    name: "YAML",
    icon: (p) => <FileText {...p} />,
    color: "text-purple-400",
    size: DEFAULT_ICON_SIZE,
  },
  xml: {
    name: "XML",
    icon: (p) => <FileCode {...p} />,
    color: "text-blue-300",
    size: DEFAULT_ICON_SIZE,
  },
  markdown: {
    name: "Markdown",
    icon: (p) => <FileText {...p} />,
    color: "text-gray-600",
    size: DEFAULT_ICON_SIZE,
  },
  r: {
    name: "R",
    icon: (p) => <SiR {...p} />,
    color: "text-blue-800",
    size: DEFAULT_ICON_SIZE,
  },
  swift: {
    name: "Swift",
    icon: (p) => <SiSwift {...p} />,
    color: "text-orange-500",
    size: DEFAULT_ICON_SIZE,
  },
  kotlin: {
    name: "Kotlin",
    icon: (p) => <SiKotlin {...p} />,
    color: "text-purple-600",
    size: DEFAULT_ICON_SIZE,
  },
  docker: {
    name: "Dockerfile",
    icon: (p) => <SiDocker {...p} />,
    color: "text-blue-500",
    size: DEFAULT_ICON_SIZE,
  },
  graphql: {
    name: "GraphQL",
    icon: (p) => <SiGraphql {...p} />,
    color: "text-pink-600",
    size: DEFAULT_ICON_SIZE,
  },
  plaintext: {
    name: "Plain Text",
    icon: (p) => <FileText {...p} />,
    color: "text-gray-500",
    size: DEFAULT_ICON_SIZE,
  },
};

/** Render the icon for a given language id. */
export function getLanguageIconNode(
  language: string,
  opts: { size?: number; className?: string } = {},
): React.ReactNode {
  const info = languageMap[language.toLowerCase()] ?? languageMap.code;
  const Icon = info.icon;
  const size = opts.size ?? info.size ?? DEFAULT_ICON_SIZE;
  return (
    <Icon
      size={info.size === null ? size : size}
      className={cn(info.color, opts.className)}
    />
  );
}

interface LanguageDisplayProps {
  language?: string;
  className?: string;
  iconSize?: number;
  showName?: boolean;
}

export const LanguageDisplay: React.FC<LanguageDisplayProps> = ({
  language = "code",
  className,
  iconSize,
  showName = true,
}) => {
  const info = languageMap[language.toLowerCase()] ?? languageMap.code;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {getLanguageIconNode(language, { size: iconSize })}
      {showName && (
        <span className="font-mono text-sm text-neutral-800 dark:text-neutral-200">
          {info.name}
        </span>
      )}
    </div>
  );
};

export default LanguageDisplay;
