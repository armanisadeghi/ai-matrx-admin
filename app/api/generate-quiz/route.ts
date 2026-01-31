import { questionSchema, questionsSchema } from "@/constants/questionSchema";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    const { files } = await req.json();
    const firstFile = files[0].data;

    const result = streamObject({
        model: google("gemini-1.5-pro-latest"),
        messages: [
            {
                role: "system",
                content:
                    "You are a teacher. Your job is to take a document, and create a multiple choice test (with 4 questions) based on the content of the document. Each option should be roughly equal in length.",
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Create a multiple choice test based on this document.",
                    },
                    {
                        type: "file",
                        data: firstFile,
                        // @ts-ignore - mimeType not in type definition but required by API
                        mimeType: "application/pdf",
                    },
                ],
            },
        ],
        schema: questionSchema,
        output: "array",
        onFinish: ({ object }) => {
            const res = questionsSchema.safeParse(object);
            if (res.error) {
                throw new Error(res.error.issues.map((e) => e.message).join("\n"));
            }
        },
    });

    return result.toTextStreamResponse();
}
