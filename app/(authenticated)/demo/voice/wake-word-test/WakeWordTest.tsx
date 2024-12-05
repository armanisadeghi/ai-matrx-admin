"use client";

import React, {useEffect, useState} from "react";
import {usePorcupine} from "@picovoice/porcupine-react";
import {toast} from "sonner";
import {cn} from "@/utils/cn";
import { motion } from "framer-motion";

export default function WakeWordTest() {
    const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(false);

    const {
        keywordDetection,
        isLoaded,
        isListening,
        error,
        init,
        start,
        stop,
        release,
    } = usePorcupine();

    useEffect(() => {
        console.log('Porcupine State:', {
            isLoaded,
            isListening,
            error,
            keywordDetection
        });
    }, [isLoaded, isListening, error, keywordDetection]);


    const porcupineKeyword = {
        publicPath: "/Hey-Matrix_en_wasm_v3_0_0.ppn",
        label: "hey_matrix"
    };

    const porcupineModel = {
        publicPath: "/porcupine_params.pv"
    };

    useEffect(() => {
        // Initialize Porcupine with your access key
        init(
            process.env.PICOVOICE_ACCESS_KEY!,
            porcupineKeyword,
            porcupineModel
        );

        // Cleanup on unmount
        return () => {
            release();
        };
    }, []);

    useEffect(() => {
        // Verify files are accessible
        fetch(porcupineKeyword.publicPath)
            .then(response => {
                console.log('Keyword file status:', response.status);
            })
            .catch(err => console.error('Failed to load keyword file:', err));

        fetch(porcupineModel.publicPath)
            .then(response => {
                console.log('Model file status:', response.status);
            })
            .catch(err => console.error('Failed to load model file:', err));
    }, []);

    useEffect(() => {
        if (isListening) {
            // Add audio level monitoring
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const audioContext = new AudioContext();
                    const analyser = audioContext.createAnalyser();
                    const microphone = audioContext.createMediaStreamSource(stream);
                    microphone.connect(analyser);
                    analyser.fftSize = 256;
                    const dataArray = new Uint8Array(analyser.frequencyBinCount);

                    const checkAudio = () => {
                        if (!isListening) return;
                        analyser.getByteFrequencyData(dataArray);
                        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                        console.log('Audio level:', average);
                        requestAnimationFrame(checkAudio);
                    };

                    checkAudio();
                })
                .catch(err => console.error('Audio monitoring error:', err));
        }
    }, [isListening]);

    useEffect(() => {
        if (keywordDetection !== null) {
            console.log('Wake word detected!', keywordDetection);
            toast.success(`Wake word detected: ${keywordDetection.label}`);

            // You could also trigger other actions here
            // For example, pause the wake word detection and start VAD

            // Optional: stop listening for wake word after detection
            stop().catch(console.error);
            setIsWaitingForWakeWord(false);
        }
    }, [keywordDetection, stop]);

    const toggleListening = async () => {
        try {
            if (isListening) {
                await stop();
                setIsWaitingForWakeWord(false);
            } else {
                await start();
                setIsWaitingForWakeWord(true);
            }
        } catch (err) {
            console.error('Error toggling wake word detection:', err);
            toast.error('Failed to toggle wake word detection');
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Wake Word Test</h2>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-3 h-3 rounded-full",
                        {
                            "bg-green-500": isLoaded && isListening,
                            "bg-red-500": !isLoaded || error,
                            "bg-yellow-500": isLoaded && !isListening,
                        }
                    )}/>
                    <span className="text-sm text-muted-foreground">
                        {!isLoaded ? "Loading..." :
                         error ? "Error" :
                         isListening ? "Listening" : "Ready"}
                    </span>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    {error.toString()}
                </div>
            )}

            <button
                onClick={toggleListening}
                disabled={!isLoaded || Boolean(error)}
                className={cn(
                    "px-4 py-2 rounded-lg",
                    isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground",
                    (!isLoaded || Boolean(error)) && "opacity-50 cursor-not-allowed"
                )}
            >
                {isListening ? "Stop Listening" : "Start Listening"}
            </button>

            {isWaitingForWakeWord && (
                <div className="text-center space-y-2">
                    <div className="text-muted-foreground">
                        Waiting for wake word "Hey Matrix"...
                    </div>
                    <motion.div
                        className="w-4 h-4 bg-primary rounded-full mx-auto"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>
            )}

            {keywordDetection && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/10 text-primary rounded-lg text-center"
                >
                    Wake word detected!
                </motion.div>
            )}
        </div>
    );
}
