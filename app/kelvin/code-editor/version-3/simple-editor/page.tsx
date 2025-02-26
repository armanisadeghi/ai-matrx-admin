"use client";

import { Code, FileInput, Flex, Grid, Select, useMantineColorScheme } from "@mantine/core";
import { IconFileCode2, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

import { CODE_SNIPPETS, PROGRAMMING_LANGUAGE_OPTIONS } from "@/constants";
import AmeButton from "@/ui/buttons/AmeButton";
import AmePaper from "@/ui/surfaces/AmePaper";
import AmeTitle from "@/ui/typography/AmeTitle";
import AmeText from "@/ui/typography/AmeText";

export default function SimpleCodeEditorPage() {
    const { colorScheme } = useMantineColorScheme();
    const editorRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [sourceCode, setSourceCode] = useState<any>(CODE_SNIPPETS["javascript"]);
    const [contextFile, setContextFile] = useState<any>();
    const [programLanguage, setProgramLanguage] = useState(PROGRAMMING_LANGUAGE_OPTIONS[0].language);
    const [contextTheme, setContextTheme] = useState<any>("vs-light");
    const [codeOutput, setCodeOutput] = useState<any>();
    const [files, setFiles] = useState<File[]>([]);
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");

    const options: any = {
        selectOnLineNumbers: true,
    };

    const programLanguageVersion: string = useMemo(() => {
        return (
            PROGRAMMING_LANGUAGE_OPTIONS.find((item) => item.language === programLanguage.toLowerCase()).version ??
            "1.0"
        );
    }, [programLanguage]);

    const handleCodeChange = (value: string | undefined) => {
        if (value) {
            setSourceCode(value);
        }
    };

    const handleLanguageChange = (value: string) => {
        const newLanguage = PROGRAMMING_LANGUAGE_OPTIONS.find((item) => item.language === value).language;
        setProgramLanguage(newLanguage);
        setSourceCode(CODE_SNIPPETS[newLanguage]);
    };

    const handleThemeChange = (value: string) => {
        setContextTheme(value);
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        editor.focus();
    };

    const handleFileChange = (file: File) => {
        setContextFile(file);
    };

    const runCode = () => {
        try {
            // You can capture the output by redirecting the console
            const consoleOutput = [];
            const console = {
                log: (output) => consoleOutput.push(output),
            };

            // Evaluate the code
            eval(sourceCode);

            alert(`Execution result: ${consoleOutput.join("\n")}`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const runCodeInJDoodle = async () => {
        setLoading(true);

        const body = {
            clientId: process.env.NEXT_PUBLIC_JDOODLE_CLIENT_ID,
            clientSecret: process.env.NEXT_PUBLIC_JDOODLE_CLIENT_SECRET,
            script: sourceCode,
            language: programLanguage,
            versionIndex: "0",
        };

        const response = await fetch("/api/jdoodle/execute", {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-type": "application/json",
            },
        });

        const data = await response.json();
        setCodeOutput(data?.output?.split("\n"));
        setLoading(false);
    };

    const runCodeInPiston = async () => {
        setLoading(true);

        const body = {
            language: programLanguage,
            version: programLanguageVersion,
            files: [
                {
                    content: sourceCode,
                },
            ],
        };

        const response = await fetch("/api/piston/execute", {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-type": "application/json",
            },
        });

        const data = await response.json();
        setCodeOutput(data?.run?.output?.split("\n"));
        setLoading(false);
    };

    useEffect(() => {
        if (contextFile) {
            var reader = new FileReader();
            reader.onload = async (e) => {
                setSourceCode(e.target.result);
            };
            reader.readAsText(contextFile);
            let newLanguage = "javascript";
            const extension = contextFile.name.split(".").pop();
            if (["css", "html", "python", "dart"].includes(extension)) {
                newLanguage = extension;
            }
            setProgramLanguage(PROGRAMMING_LANGUAGE_OPTIONS.find((item) => item.language === newLanguage)?.language);
        }
    }, [contextFile]);

    useEffect(() => {
        if (colorScheme) {
            if (colorScheme === "dark") {
                setContextTheme("vs-dark");
            } else {
                setContextTheme("vs-light");
            }
        }
    }, [colorScheme]);

    return (
        <>
            <Grid>
                <Grid.Col span={{ base: 12, md: 6, lg: 9 }}>
                    <AmePaper withBorder p="sm" mb="md">
                        <Flex align="center" justify="space-between" mb="sm">
                            <AmeTitle order={6} mb="sm">
                                Editor
                            </AmeTitle>
                            <Flex align="center" gap="xs">
                                <Select
                                    label=""
                                    aria-label="Change editor theme"
                                    data={["hc-black", "vs-dark", "vs-light"]}
                                    onChange={handleThemeChange}
                                    value={contextTheme}
                                    required={false}
                                />
                                <Select
                                    label=""
                                    aria-label="Change language"
                                    data={PROGRAMMING_LANGUAGE_OPTIONS.map((item) => ({
                                        label: `${item.language} (${item.version})`,
                                        value: item.language,
                                    }))}
                                    onChange={handleLanguageChange}
                                    value={programLanguage}
                                    required={false}
                                />
                            </Flex>
                        </Flex>
                        <AmePaper withBorder p={2}>
                            <Editor
                                width="auto"
                                height="400px"
                                theme={contextTheme}
                                value={sourceCode}
                                options={options}
                                onChange={handleCodeChange}
                                onMount={handleEditorDidMount}
                            />
                        </AmePaper>
                        <Flex align="center" justify="space-between" mt="sm">
                            <FileInput
                                aria-label="Upload code snippet"
                                leftSection={<IconFileCode2 size={16} />}
                                placeholder="Upload code as a file"
                                onChange={handleFileChange}
                                w={300}
                            />
                            <Flex gap="sm">
                                <AmeButton
                                    leftSection={<IconPlayerPlay size={16} />}
                                    loading={loading}
                                    onClick={runCode}
                                    title="Run code"
                                >
                                    Run code in eval
                                </AmeButton>
                                <AmeButton
                                    leftSection={<IconPlayerPlay size={16} />}
                                    loading={loading}
                                    onClick={runCodeInJDoodle}
                                    title="Run code"
                                >
                                    Run code in jdoodle
                                </AmeButton>
                                <AmeButton
                                    leftSection={<IconPlayerPlay size={16} />}
                                    loading={loading}
                                    onClick={runCodeInPiston}
                                    title="Run code"
                                >
                                    Run code in piston
                                </AmeButton>
                            </Flex>
                        </Flex>
                    </AmePaper>
                    <AmePaper withBorder p="sm">
                        <AmeTitle order={6} mb="sm">
                            Output
                        </AmeTitle>
                        {!codeOutput && <Code>{">"} Run your code to see something awesome 😊😊😊</Code>}
                        {codeOutput?.map((item) => {
                            return item ? <Code key={item}>{item}</Code> : "";
                        })}
                    </AmePaper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                    <AmePaper withBorder p="sm">
                        <AmeTitle order={6} mb="md">
                            Version history
                        </AmeTitle>

                        <AmeText>No history yet.</AmeText>
                    </AmePaper>
                </Grid.Col>
            </Grid>
        </>
    );
}
