import { useCallback, useState } from "react";
import { Button, Textarea } from "@/app/dashboard/code-editor/components";
import { IconSend } from "@tabler/icons-react";
import { createChatStart, sendAiMessage } from "@/app/dashboard/code-editor/supabase/aiChat";
import { useRecoilValue } from "recoil";
import { activeUserAtom } from "@/state/userAtoms";

export const AskAi = () => {
    const [aiResponse, setAiResponse] = useState<string[]>([]);
    const [aiResponseLoading, setAiResponseLoading] = useState(false);
    const [userInput, setUserInput] = useState("");
    const userId = useRecoilValue(activeUserAtom).matrixId;

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

                const newChat = await createChatStart(text, userId);

                console.log({ newChat });

                const response: { data: string } = await sendAiMessage({
                    chatId: newChat.chatId,
                    messagesEntry: newChat?.messages,
                });

                console.log({ response });

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
                    leftSection={<IconSend size={18} />}
                    onClick={handleSubmitMessage}
                    loading={aiResponseLoading}
                >
                    Send
                </Button>
            </div>
            {aiResponse.length > 0 && aiResponse.map((a) => <p key={a}>{a}</p>)}
        </div>
    );
};
