import { streamAIResponse } from './aiStreamHandler';
import { useAppDispatch } from '@/lib/redux/hooks';
import {useState} from "react";

const FlashcardComponent = ({ flashcardId }) => {
    const dispatch = useAppDispatch();
    const [streamedData, setStreamedData] = useState('');

    const handleStreamChunk = (chunk) => {
        setStreamedData(prevData => prevData + chunk);  // Update UI in real-time with streamed chunks
    };

    const getAIHelp = () => {
        dispatch(streamAIResponse(flashcardId, handleStreamChunk));
    };

    return (
        <div>
            <button onClick={getAIHelp}>Get AI Assistance</button>
            <div>Streamed Response: {streamedData}</div>
        </div>
    );
};
