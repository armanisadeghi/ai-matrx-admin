import React from 'react';
import { 
  FileCode,
  Coffee, 
  Hash,
  Globe,
  File,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SiPython } from "react-icons/si";
import { SiJavascript } from "react-icons/si";
import { SiTypescript } from "react-icons/si";
import { PiFileSqlBold } from "react-icons/pi";

export const languageMap = {
  javascript: {
    name: 'JavaScript',
    icon: (props) => <SiJavascript {...props} />,
    color: 'text-yellow-500'
  },
  typescript: {
    name: 'TypeScript',
    icon: (props) => <SiTypescript {...props} />,
    color: 'text-blue-500'
  },
  python: {
    name: 'Python',
    icon: (props) => <SiPython {...props} />,
    color: 'text-green-500'
  },
  java: {
    name: 'Java',
    icon: (props) => <Coffee {...props} />,
    color: 'text-red-500'
  },
  csharp: {
    name: 'C#',
    icon: (props) => <Hash {...props} />,
    color: 'text-purple-500'
  },
  cpp: {
    name: 'C++',
    icon: (props) => <Code2 {...props} />,
    color: 'text-blue-600'
  },
  sql: {
    name: 'SQL',
    icon: (props) => <PiFileSqlBold {...props} />,
    color: 'text-orange-500'
  },
  html: {
    name: 'HTML',
    icon: (props) => <Globe {...props} />,
    color: 'text-orange-600'
  },
  css: {
    name: 'CSS',
    icon: (props) => <FileCode {...props} />,
    color: 'text-blue-400'
  },
  php: {
    name: 'PHP',
    icon: (props) => <File {...props} />,
    color: 'text-indigo-500'
  },
  // Add more languages as needed
};

interface LanguageDisplayProps {
  language: string;
  className?: string;
}

const LanguageDisplay: React.FC<LanguageDisplayProps> = ({ language, className }) => {
  // Normalize the language string to match our keys
  const normalizedLang = language.toLowerCase();
  const langInfo = languageMap[normalizedLang];

  if (!langInfo) {
    // If language is not in our map, return the original text
    return (
      <span className={cn("text-sm text-neutral-500 dark:text-neutral-400 font-mono", className)}>
        {language}
      </span>
    );
  }

  const Icon = langInfo.icon;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon size={14} className={cn(langInfo.color)} />
      <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
        {langInfo.name}
      </span>
    </div>
  );
};

export default LanguageDisplay;