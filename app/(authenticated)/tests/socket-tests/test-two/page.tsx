'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useInitializeSocket } from '@/lib/redux/socket/useInitializeSocket';
import { SocketManager } from '@/lib/redux/socket/manager';

export default function SocketTester() {
    useInitializeSocket(); // Initialize the socket connection

    const [namespace, setNamespace] = useState('UserSession');
    const [event, setEvent] = useState('simple_recipe');
    const [payload, setPayload] = useState('');
    const [log, setLog] = useState<string[]>([]);
    const [streamedText, setStreamedText] = useState<string>(''); // Accumulate streamed text

    const responses = useSelector((state: any) => state.socket?.responses || {});

    console.log('Redux Responses State:', responses); // Debugging

    const handleSend = () => {
        try {
            const parsedPayload = JSON.parse(payload); // Parse the payload from the input
            const socketManager = SocketManager.getInstance();
            const socket = socketManager.getSocket();

            if (!socket) {
                console.error('Socket is not connected.');
                return;
            }

            const sid = socket.id;
            const dynamicEventName = `${sid}_${event}_${parsedPayload[0]?.index || '0'}`;

            console.log(`Emitting to ${namespace} -> ${event} with payload:`, parsedPayload);

            // Emit the event
            socket.emit(event, parsedPayload);

            // Add the response listener
            socketManager.listenForResponse(event, parsedPayload[0]?.index || 0, (data) => {
                console.log(`Response received for ${dynamicEventName}:`, data);

                // Append the new text data to the accumulated streamed text
                setStreamedText((prevText) => prevText + (data.text || ''));
            });

            setLog((prevLog) => [
                ...prevLog,
                `Emitted to ${namespace} -> ${event}: ${JSON.stringify(parsedPayload, null, 2)}`,
                `Listening for response on event: ${dynamicEventName}`,
            ]);
        } catch (error) {
            setLog((prevLog) => [...prevLog, `Error: Invalid JSON Payload`]);
            console.error('Invalid payload:', error);
        }
    };

    const handleClearLog = () => setLog([]);
    const handleClearResponses = () => setStreamedText('');

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-primary">Socket.IO Tester</h1>

            <div className="space-y-4">
                <div>
                    <label className="block font-medium text-primary">Namespace</label>
                    <input
                        type="text"
                        value={namespace}
                        onChange={(e) => setNamespace(e.target.value)}
                        className="w-full p-2 border border-border rounded bg-background text-primary"
                    />
                </div>

                <div>
                    <label className="block font-medium text-primary">Event</label>
                    <input
                        type="text"
                        value={event}
                        onChange={(e) => setEvent(e.target.value)}
                        className="w-full p-2 border border-border rounded bg-background text-primary"
                    />
                </div>

                <div>
                    <label className="block font-medium text-primary">Payload (JSON)</label>
                    <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        rows={10}
                        className="w-full p-2 border border-border rounded bg-background text-primary"
                    />
                </div>

                <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary-hover"
                >
                    Emit Event
                </button>

                <button
                    onClick={handleClearLog}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary-hover mt-2"
                >
                    Clear Log
                </button>

                <button
                    onClick={handleClearResponses}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary-hover mt-2"
                >
                    Clear Response
                </button>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-primary">Log</h2>
                <div className="mt-4 p-4 border border-border rounded bg-muted">
                    {log.length === 0 ? (
                        <p className="text-muted-foreground">No logs yet.</p>
                    ) : (
                         <ul className="space-y-2">
                             {log.map((entry, index) => (
                                 <li key={index} className="text-sm text-primary">
                                     {entry}
                                 </li>
                             ))}
                         </ul>
                     )}
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-primary">Streamed Response</h2>
                <div className="mt-4 p-4 border border-border rounded bg-muted text-primary whitespace-pre-wrap">
                    {streamedText === '' ? (
                        <p className="text-muted-foreground">No response yet.</p>
                    ) : (
                         <p>{streamedText}</p>
                     )}
                </div>
            </div>
        </div>
    );
}
