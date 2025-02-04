"use client";

import {useRef} from "react";
import {ReactTerminal} from "react-terminal";

type AmeTerminalProps = { height?: string; name?: string; terminalOutput?: string };

export const Terminal = (props: AmeTerminalProps) => {
    const terminalRef = useRef(null);
    const {terminalOutput, name} = props;

    return (
        <>
            <div className="container" ref={terminalRef}>
                <ReactTerminal
                    prompt={">>> " + terminalOutput}
                    enableInput={false}
                    showControlBar
                    showControlButtons={false}
                    themes={{
                        "my-custom-theme": {
                            themeBGColor: "#d9d9d9",
                            themeToolbarColor: "#a6a6a6",
                            themeColor: "#a6a6a6",
                            themePromptColor: "#262626",
                        },
                    }}
                    theme="my-custom-theme"
                />
            </div>
        </>
    );
};
