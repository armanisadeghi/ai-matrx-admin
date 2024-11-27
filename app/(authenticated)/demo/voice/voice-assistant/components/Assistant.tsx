"use client";
import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { EnterIcon, LoadingIcon } from "./icons";
import { usePlayer } from "@/hooks/tts/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import * as ort from 'onnxruntime-web';

// Define the Message type
type Message = {
    role: "user" | "assistant";
    content: string;
    latency?: number;
};

export default function Home() {
    // Form state for managing input
    const [input, setInput] = useState<string>("");  // Using useState to manage form input
    const [messages, setMessages] = useState<Message[]>([]);  // Track messages in state
    const [isPending, setIsPending] = useState<boolean>(false);  // Manage loading state
    const inputRef = useRef<HTMLInputElement>(null);  // Reference to input element for focus
    const player = usePlayer();  // Custom hook to handle audio player

    const vad = useMicVAD({
        startOnLoad: true,
        onSpeechEnd: (audio) => {
            player.stop();
            const wav = utils.encodeWAV(audio);
            const blob = new Blob([wav], { type: "audio/wav" });
            submit(blob);
            const isFirefox = navigator.userAgent.includes("Firefox");
            if (isFirefox) vad.pause();
        },
        workletURL: "/vad.worklet.bundle.min.js",
        modelURL: "/silero_vad.onnx",
        positiveSpeechThreshold: 0.6,
        minSpeechFrames: 4,
        ortConfig(ort) {
            const isSafari = /^((?!chrome|android).)*safari/i.test(
                navigator.userAgent
            );

            ort.env.wasm = {
                wasmPaths: {
                    "ort-wasm-simd-threaded.wasm":
                        "/ort-wasm-simd-threaded.wasm",
                    "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
                    "ort-wasm.wasm": "/ort-wasm.wasm",
                    "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
                },
                numThreads: isSafari ? 1 : 4,
            };
        },
    });

    // Handle key press events
    useEffect(() => {
        function keyDown(e: KeyboardEvent) {
            if (e.key === "Enter") return inputRef.current?.focus();
            if (e.key === "Escape") return setInput("");
        }

        window.addEventListener("keydown", keyDown);
        return () => window.removeEventListener("keydown", keyDown);
    }, []);

    // Function to handle form submission
    async function submit(data: string | Blob) {
        setIsPending(true);  // Start the loading indicator

        const formData = new FormData();
        messages.forEach((message) => {
            formData.append("message", JSON.stringify(message));
        });

        try {
            const response = await fetch("/api", {
                method: "POST",
                body: formData,
            });

            const transcript = decodeURIComponent(
                response.headers.get("X-Transcript") || ""
            );
            const text = decodeURIComponent(
                response.headers.get("X-Response") || ""
            );

            if (!response.ok || !transcript || !text || !response.body) {
                throw new Error(
                    response.status === 429
                        ? "Too many requests. Please try again later."
                        : "An error occurred."
                );
            }

            const latency = Date.now() - new Date().getTime();
            player.play(response.body, () => {
                const isFirefox = navigator.userAgent.includes("Firefox");
                if (isFirefox) vad.start();
            });

            setMessages((prev) => [
                ...prev,
                { role: "user", content: transcript },
                { role: "assistant", content: text, latency },
            ]);
            setInput(transcript);
        } catch (error: any) {
            toast.error(error.message || "An error occurred.");
        } finally {
            setIsPending(false);  // Stop loading indicator
        }
    }

    // Form submit handler
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submit(input);
    };

    return (
        <>
            <div className="pb-4 min-h-28" />

            <form
                className="rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 flex items-center w-full max-w-3xl border border-transparent hover:border-neutral-300 focus-within:border-neutral-400 hover:focus-within:border-neutral-400 dark:hover:border-neutral-700 dark:focus-within:border-neutral-600 dark:hover:focus-within:border-neutral-600"
                onSubmit={handleFormSubmit}
            >
                <input
                    type="text"
                    className="bg-transparent focus:outline-none p-4 w-full placeholder:text-neutral-600 dark:placeholder:text-neutral-400"
                    required
                    placeholder="Ask me anything"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    ref={inputRef}
                />

                <button
                    type="submit"
                    className="p-4 text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                    disabled={isPending}
                    aria-label="Submit"
                >
                    {isPending ? <LoadingIcon /> : <EnterIcon />}
                </button>
            </form>

            <div className="text-neutral-400 dark:text-neutral-600 pt-4 text-center max-w-xl text-balance min-h-28 space-y-4">
                {messages.length > 0 && (
                    <p>
                        {messages[messages.length - 1].content}
                        <span className="text-xs font-mono text-neutral-300 dark:text-neutral-700">
                            {" "}
                            ({messages[messages.length - 1].latency}ms)
                        </span>
                    </p>
                )}

                {messages.length === 0 && (
                    <>
                        {vad.loading ? (
                            <p>Loading speech detection...</p>
                        ) : vad.errored ? (
                            <p>Failed to load speech detection.</p>
                        ) : (
                            <p>Start talking to chat.</p>
                        )}
                    </>
                )}
            </div>

            <div
                className={clsx(
                    "absolute size-36 blur-3xl rounded-full bg-gradient-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out",
                    {
                        "opacity-0": vad.loading || vad.errored,
                        "opacity-30":
                            !vad.loading && !vad.errored && !vad.userSpeaking,
                        "opacity-100 scale-110": vad.userSpeaking,
                    }
                )}
            />
        </>
    );
}
