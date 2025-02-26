import {useCallback, useState} from "react";
import {IconSend} from "@tabler/icons-react";
import {useRecoilValue} from "recoil";
import {Textarea} from "@/app/kelvin/code-editor/version-3/components";
import {Button} from "@components/ui";

export const AskAi = () => {
    const [aiResponse, setAiResponse] = useState<string[]>([]);
    const [aiResponseLoading, setAiResponseLoading] = useState(false);
    const [userInput, setUserInput] = useState("");

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setUserInput(event.target.value);
    }, []);

    const handleSubmitMessage = async () => {
        try {
            setAiResponseLoading(true);
            const text = userInput || "";

            if (text.trim().length === 0) return;

            if (text) {
                console.log(`User input:: ${text}`);

                const newChat = "Started new chat"

                console.log({newChat});

                const response: { data: string } = {data: "Response from new chat"}

                console.log({response});

                setAiResponse((prevState) => [...prevState, response.data]);
                setUserInput("");
            }

            setAiResponseLoading(false);
        } catch (e) {
            console.log(e);
            setAiResponseLoading(false);
        }
    };

    return (
        <div className="p-2 pb-4 grid grid-cols-2 gap-3">
            <div>
                <Textarea
                    label=""
                    placeholder="Enter a prompt to generate new code"
                    className="w-full mb-2"
                    value={userInput}
                    onChange={handleInputChange}
                    rows={2}
                />
                <Button
                    variant="primary"
                    onClick={handleSubmitMessage}
                >
                    <IconSend size={18}/>
                    Send
                </Button>
            </div>
            {aiResponse.length > 0 && aiResponse.map((a) => <p key={a}>{a}</p>)}
        </div>
    );
};
