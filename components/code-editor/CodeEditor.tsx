"use client";

import { useEffect, useMemo, useState } from "react";
import { useMonaco } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { useMeasure } from "@uidotdev/usehooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMonacoTheme } from "./useMonacoTheme";
import PreviewPanel from "./PreviewPanel";
import Terminal from "./Terminal";
import {
  isFrontendLanguage,
  PROGRAMMING_LANGUAGE_OPTIONS,
} from "@/constants/programming-languages";
import { Play } from "lucide-react";
import { CODE_SNIPPETS } from "@/constants/code-snippets";

interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number;
  signal: null | string;
  output: string;
}

interface PistonExecuteResponse {
  run: PistonRunResult;
  compile?: PistonRunResult;
  language: string;
  version: string;
}

interface CodeEditorProps {
  defaultLanguage?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
}

const SUPPORTED_LANGUAGES = PROGRAMMING_LANGUAGE_OPTIONS.map((lang) => ({
  id: lang.language,
  name: lang.language.charAt(0).toUpperCase() + lang.language.slice(1),
  version: lang.version,
  category: lang.category,
}));

const THEMES = [
  { id: "vs-dark", name: "Dark" },
  { id: "light", name: "Light" },
];

interface ExecutionOutput {
  stdout: string;
  stderr: string;
  fullOutput: string;
}

const CodeEditor = ({
  defaultLanguage = "javascript",
  defaultValue = "// Start coding here...",
  onChange,
}: CodeEditorProps) => {
  const [ref, { width, height }] = useMeasure();
  const monaco = useMonaco();
  const [language, setLanguage] = useState(defaultLanguage);
  const isDark = useMonacoTheme();
  const [output, setOutput] = useState<ExecutionOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextCode, setContextCode] = useState<any>(defaultValue);
  const [theme, setTheme] = useState("vs-dark");
  const [error, setError] = useState("");

  const isCurrentLanguageFrontend = isFrontendLanguage(language);
  const currentLanguageInfo = PROGRAMMING_LANGUAGE_OPTIONS.find(
    (lang) => lang.language === language
  );

  const contextVersion: string = useMemo(() => {
    return (
      PROGRAMMING_LANGUAGE_OPTIONS.find(
        (item) => item.language === language.toLowerCase()
      ).version ?? "1.0"
    );
  }, [language]);

  const handleExecute = async () => {
    setLoading(true);

    try {
      const body = {
        language,
        version: currentLanguageInfo?.version || "",
        files: [{ name: "main", content: contextCode }],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      };

      const response = await fetch("/api/piston/execute", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-type": "application/json",
        },
      });

      const result: PistonExecuteResponse = await response.json();
      setOutput({
        stdout: result.run.stdout,
        stderr: result.run.stderr,
        fullOutput: result.run.output,
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    setContextCode(value || "");
    if (onChange) {
      onChange(value);
    }
  };

  const handleLanguageChange = (value) => {
    const newLanguage = value;
    setLanguage(newLanguage);
    const snippetKey = newLanguage === "csharp" ? "csharp.net" : newLanguage;
    const snippet = CODE_SNIPPETS[snippetKey as keyof typeof CODE_SNIPPETS];

    setContextCode(snippet || "");

    if (onChange) {
      onChange(snippet);
    }
  };

  console.log({ output });

  return (
    <div ref={ref} className="flex flex-col w-full h-full">
      <Card className="flex flex-col w-full h-full bg-neutral-100 dark:bg-neutral-700">
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex gap-2">
            <Select
              value={language}
              onValueChange={(value) => {
                handleLanguageChange(value);
              }}
            >
              <SelectTrigger className="w-[140px] h-[36px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[140px] h-[36px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="default" onClick={handleExecute}>
            <Play />
            Run Code
          </Button>
        </div>

        <div className="flex-grow relative">
          <div className="flex flex-col h-full">
            <Editor
              height={`${height - 300}px`}
              width={`${width}px`}
              defaultLanguage={language}
              language={language}
              defaultValue={contextCode}
              value={contextCode}
              theme={theme}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />

            <div className="transition-all duration-300 shrink">
              {isCurrentLanguageFrontend ? (
                <PreviewPanel code={contextCode} language={language} />
              ) : (
                <Terminal output={output} loading={loading} error={error} />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CodeEditor;
