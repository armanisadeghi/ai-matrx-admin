'use client';

import {useState} from 'react';
import {useMonaco} from '@monaco-editor/react';
import Editor from '@monaco-editor/react';
import {useMeasure} from "@uidotdev/usehooks";
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {editor} from "monaco-editor";

import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

interface CodeEditorProps {
    defaultLanguage?: string;
    defaultValue?: string;
    onChange?: (value: string | undefined) => void;
    defaultEditorOption?: IStandaloneEditorConstructionOptions
}

const SUPPORTED_LANGUAGES = [
    {id: 'javascript', name: 'JavaScript'},
    {id: 'typescript', name: 'TypeScript'},
    {id: 'html', name: 'HTML'},
    {id: 'css', name: 'CSS'},
    {id: 'json', name: 'JSON'},
];

const THEMES = [
    {id: 'vs-dark', name: 'Dark'},
    {id: 'light', name: 'Light'},
];

const CodeEditor = ({
                        defaultLanguage = 'javascript',
                        defaultValue = '// Start coding here...',
                        onChange
                    }: CodeEditorProps) => {
    const [ref, {width, height}] = useMeasure();
    const monaco = useMonaco();
    const [language, setLanguage] = useState(defaultLanguage);
    const [theme, setTheme] = useState('vs-dark');
    const [output, setOutput] = useState<string>('');

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            <Card className="flex flex-col w-full h-full">
                <div className="flex items-center justify-between p-2 border-b">
                    <div className="flex gap-2">
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Language"/>
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
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Theme"/>
                            </SelectTrigger>
                            <SelectContent>
                                {THEMES.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="default">
                        Run Code
                    </Button>
                </div>

                <div className="flex-grow relative border">
                    <Editor
                        height={`60dvh`}
                        width={`${width}px`}
                        defaultLanguage={language}
                        language={language}
                        defaultValue={defaultValue}
                        theme={theme}
                        onChange={onChange}
                        options={{
                            minimap: {enabled: false},
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            autoIndent: "full",
                            contextmenu: true,
                            fontFamily: "monospace",
                            lineHeight: 24,
                            hideCursorInOverviewRuler: true,
                            matchBrackets: "always",
                            scrollbar: {
                                horizontalSliderSize: 4,
                                verticalSliderSize: 18,
                            },
                            selectOnLineNumbers: true,
                            roundedSelection: false,
                            readOnly: false,
                            cursorStyle: "line",
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default CodeEditor;