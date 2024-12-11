'use client';
import React, {useState, useRef, useCallback} from 'react';

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();
    const recordingsRef = useRef<Record<string, Blob>>({});
    const mediaRecordersRef = useRef<Record<string, MediaRecorder>>({});
    const audioChunksRef = useRef<Record<string, Blob[]>>({});

    const startRecording = useCallback(async (key: string) => {
        if (!navigator.mediaDevices?.getUserMedia) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
            }
            audioChunksRef.current[key] = [];
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            source.connect(analyserRef.current!);
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                             ? 'audio/webm;codecs=opus'
                             : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current[key].push(e.data);
                }
            };
            mediaRecordersRef.current[key] = recorder;
            recorder.start();
            const updateAudio = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(average);
                animationFrameRef.current = requestAnimationFrame(updateAudio);
            };
            updateAudio();
            setIsRecording(true);
        } catch {
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(async (key: string) => {
        const recorder = mediaRecordersRef.current[key];
        if (recorder && recorder.state === 'recording') {
            return new Promise<Blob | undefined>((resolve) => {
                recorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current[key], {type: 'audio/webm'});
                    recordingsRef.current[key] = audioBlob;
                    delete mediaRecordersRef.current[key];
                    cancelAnimationFrame(animationFrameRef.current!);
                    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                        await audioContextRef.current.close().catch(() => {});
                    }
                    audioContextRef.current = null;
                    analyserRef.current = null;
                    setAudioLevel(0);
                    setIsRecording(false);
                    resolve(audioBlob);
                };
                recorder.stop();
                const tracks = recorder.stream.getTracks();
                tracks.forEach(track => track.stop());
            });
        }
        return undefined;
    }, []);

    return {
        isRecording,
        audioLevel,
        startRecording,
        stopRecording,
        recordings: recordingsRef.current
    };
}
