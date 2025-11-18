import React from 'react';
import { 
  FileCode,
  Coffee, 
  Hash,
  Globe,
  File,
  Code2,
  Terminal,
  FileText,
  Braces,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SiKotlin, SiSwift, SiDocker, SiGraphql, SiRuby, SiGo, SiRust, SiR } from "react-icons/si";
import { SiJavascript } from "react-icons/si";
import { SiTypescript } from "react-icons/si";
import { PiFileSqlBold } from "react-icons/pi";
import { TwoColorPythonIcon } from '@/components/DirectoryTree/custom-icons';

// Default icon size that's a bit larger than before
const DEFAULT_ICON_SIZE = 18;
const MOBILE_ICON_SIZE = 14;

export const languageMap = {
  code: {
    name: 'Code',
    icon: (props) => <Code2 {...props} />,
    color: 'text-blue-500',
    size: DEFAULT_ICON_SIZE
  },
  javascript: {
    name: 'JavaScript',
    icon: (props) => <SiJavascript {...props} />,
    color: 'text-yellow-500',
    size: DEFAULT_ICON_SIZE
  },
  typescript: {
    name: 'TypeScript',
    icon: (props) => <SiTypescript {...props} />,
    color: 'text-blue-500',
    size: DEFAULT_ICON_SIZE
  },
  jsx: {
    name: 'JavaScript',
    icon: (props) => <SiJavascript {...props} />,
    color: 'text-yellow-500',
    size: DEFAULT_ICON_SIZE
  },
  tsx: {
    name: 'TypeScript',
    icon: (props) => <SiTypescript {...props} />,
    color: 'text-blue-500',
    size: DEFAULT_ICON_SIZE
  },
  python: {
    name: 'Python',
    icon: (props) => <TwoColorPythonIcon />, // Python icon already has perfect size
    color: 'text-green-500',
    size: null // null means use the icon's default size
  },
  java: {
    name: 'Java',
    icon: (props) => <Coffee {...props} />,
    color: 'text-red-500',
    size: DEFAULT_ICON_SIZE
  },
  csharp: {
    name: 'C#',
    icon: (props) => <Hash {...props} />,
    color: 'text-purple-500',
    size: DEFAULT_ICON_SIZE
  },
  cpp: {
    name: 'C++',
    icon: (props) => <Code2 {...props} />,
    color: 'text-blue-600',
    size: DEFAULT_ICON_SIZE
  },
  sql: {
    name: 'SQL',
    icon: (props) => <PiFileSqlBold {...props} />,
    color: 'text-orange-500',
    size: DEFAULT_ICON_SIZE
  },
  html: {
    name: 'HTML',
    icon: (props) => <Globe {...props} />,
    color: 'text-orange-600',
    size: DEFAULT_ICON_SIZE
  },
  css: {
    name: 'CSS',
    icon: (props) => <FileCode {...props} />,
    color: 'text-blue-400',
    size: DEFAULT_ICON_SIZE
  },
  php: {
    name: 'PHP',
    icon: (props) => <File {...props} />,
    color: 'text-indigo-500',
    size: DEFAULT_ICON_SIZE
  },
  bash: {
    name: 'Bash',
    icon: (props) => <Terminal {...props} />,
    color: 'text-green-600',
    size: DEFAULT_ICON_SIZE
  },
  shell: {
    name: 'Shell',
    icon: (props) => <Terminal {...props} />,
    color: 'text-gray-500',
    size: DEFAULT_ICON_SIZE
  },
  powershell: {
    name: 'PowerShell',
    icon: (props) => <Terminal {...props} />,
    color: 'text-blue-700',
    size: DEFAULT_ICON_SIZE
  },
  ruby: {
    name: 'Ruby',
    icon: (props) => <SiRuby {...props} />,
    color: 'text-red-600',
    size: DEFAULT_ICON_SIZE
  },
  go: {
    name: 'Go',
    icon: (props) => <SiGo {...props} />,
    color: 'text-cyan-500',
    size: DEFAULT_ICON_SIZE
  },
  rust: {
    name: 'Rust',
    icon: (props) => <SiRust {...props} />,
    color: 'text-orange-700',
    size: DEFAULT_ICON_SIZE
  },
  json: {
    name: 'JSON',
    icon: (props) => <Braces {...props} />,
    color: 'text-yellow-600',
    size: DEFAULT_ICON_SIZE
  },
  yaml: {
    name: 'YAML',
    icon: (props) => <FileText {...props} />,
    color: 'text-purple-400',
    size: DEFAULT_ICON_SIZE
  },
  xml: {
    name: 'XML',
    icon: (props) => <FileCode {...props} />,
    color: 'text-blue-300',
    size: DEFAULT_ICON_SIZE
  },
  markdown: {
    name: 'Markdown',
    icon: (props) => <FileText {...props} />,
    color: 'text-gray-600',
    size: DEFAULT_ICON_SIZE
  },
  r: {
    name: 'R',
    icon: (props) => <SiR {...props} />,
    color: 'text-blue-800',
    size: DEFAULT_ICON_SIZE
  },
  swift: {
    name: 'Swift',
    icon: (props) => <SiSwift {...props} />,
    color: 'text-orange-500',
    size: DEFAULT_ICON_SIZE
  },
  kotlin: {
    name: 'Kotlin',
    icon: (props) => <SiKotlin {...props} />,
    color: 'text-purple-600',
    size: DEFAULT_ICON_SIZE
  },
  docker: {
    name: 'Dockerfile',
    icon: (props) => <SiDocker {...props} />,
    color: 'text-blue-500',
    size: DEFAULT_ICON_SIZE
  },
  graphql: {
    name: 'GraphQL',
    icon: (props) => <SiGraphql {...props} />,
    color: 'text-pink-600',
    size: DEFAULT_ICON_SIZE
  }
};

interface LanguageDisplayProps {
  language?: string;
  className?: string;
  iconSize?: number;
  isMobile?: boolean;
}

const LanguageDisplay: React.FC<LanguageDisplayProps> = ({ 
  language = 'code', 
  className,
  iconSize,
  isMobile
}) => {
  const normalizedLang = language.toLowerCase();
  const langInfo = languageMap[normalizedLang] || languageMap['code'];

  const Icon = langInfo.icon;
  
  // Use the provided iconSize, or the language-specific size, or the default size
  const size = isMobile ? MOBILE_ICON_SIZE : iconSize || langInfo.size || DEFAULT_ICON_SIZE;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Only pass size prop if it's not null (for custom icons like Python) */}
      {langInfo.size === null ? (
        <Icon className={cn(langInfo.color)} />
      ) : (
        <Icon size={size} className={cn(langInfo.color)} />
      )}
      <span className="text-sm text-neutral-800 dark:text-neutral-200 font-mono">
        {langInfo.name}
      </span>
    </div>
  );
};

export default LanguageDisplay;