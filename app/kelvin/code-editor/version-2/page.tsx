"use client"

import {IconPlayerPlay} from "@tabler/icons-react";
import {useEffect, useMemo, useRef, useState} from "react";
import {Button} from "@/components/ui";
import {
    CODE_SNIPPETS,
    PROGRAMMING_LANGUAGE_OPTIONS
} from "@/app/kelvin/code-editor/version-2/constants/programming-languages";
import CodeEditor from "@/app/(authenticated)/tests/monoco-editor/components/CodeEditor";

export default function Page() {
    const editorRef = useRef(null);
    const [contextCode, setContextCode] = useState<any>("");
    const [contextFile, setContextFile] = useState<any>();
    const [contextLanguage, setContextLanguage] = useState("javascript");
    const [contextTheme, setContextTheme] = useState<any>("vs-light");
    const [codeOutput, setCodeOutput] = useState<any>();
    const [loading, setLoading] = useState(false);
    const [programLanguage, setProgramLanguage] = useState(PROGRAMMING_LANGUAGE_OPTIONS[0].language);
    const [sourceCode, setSourceCode] = useState<any>(CODE_SNIPPETS["javascript"]);

    const contextVersion: string = useMemo(() => {
        return (
            PROGRAMMING_LANGUAGE_OPTIONS.find((item) => item.language === contextLanguage.toLowerCase()).version ??
            "1.0"
        );
    }, [contextLanguage]);

    const handleLanguageChange = (value: string) => {
        const newLanguage = PROGRAMMING_LANGUAGE_OPTIONS.find((item) => item.language === value).language;
        setProgramLanguage(newLanguage);
        setSourceCode(CODE_SNIPPETS[newLanguage]);
    };

    const runCode = () => {
        try {
            // You can capture the output by redirecting the console
            const consoleOutput = [];
            const console = {
                log: (output) => consoleOutput.push(output),
            };

            // Evaluate the code
            eval(contextCode);

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
            script: contextCode,
            language: contextLanguage,
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
            language: contextLanguage,
            version: contextVersion,
            files: [
                {
                    content: contextCode,
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
                setContextCode(e.target.result);
            };
            reader.readAsText(contextFile);
            let newLanguage = "javascript";
            const extension = contextFile.name.split(".").pop();
            if (["css", "html", "python", "dart"].includes(extension)) {
                newLanguage = extension;
            }
            setContextLanguage(newLanguage);
        }
    }, [contextFile]);

    if (typeof window !== "undefined") {
        console.log("error rendering monaco editor");
    }

    console.log({codeOutput});

    return (
        <>
            <div className="flex justify-between">
                <p>file upload</p>
                <select
                    aria-label="Change language"
                    data={PROGRAMMING_LANGUAGE_OPTIONS.map((item) => ({
                        label: `${item.language} (${item.version})`,
                        value: item.language,
                    }))}
                    onChange={handleLanguageChange}
                    value={programLanguage}>
                    <option value="">hc-black</option>
                    <option value="">vs-dark</option>
                    <option value="">vs-light</option>
                </select>
            </div>
            <div>
                <CodeEditor
                    // width="100%"
                    // height="400"
                    // theme={contextTheme}
                    // options={options}
                    // defaultLanguage={contextLanguage}
                    // defaultValue={contextCode}
                    // onMount={(editor) => (editorRef.current = editor)}
                    // onChange={(value) => setContextCode(value)}
                />
            </div>
            <div className="flex">
                <Button
                    onClick={runCode}
                    title="Run code"
                    variant="default"
                >
                    <IconPlayerPlay size={16}/>
                    Run code in eval
                </Button>
                <Button
                    onClick={runCodeInJDoodle}
                    title="Run code"
                    variant="default"
                >
                    Run code in jdoodle
                </Button>
                <Button
                    onClick={runCodeInPiston}
                    title="Run code"
                    variant="default"
                >
                    Run code in piston
                </Button>
            </div>
            {codeOutput &&
                codeOutput.map((item) => {
                    return <p key={item}>{item}</p>;
                })}
        </>
    );
}
