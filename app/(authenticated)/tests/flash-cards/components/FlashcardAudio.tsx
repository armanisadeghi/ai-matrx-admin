'use client';

import { useTTS } from '@cartesia/cartesia-js/react';
import {useState} from "react";

function TextToSpeech() {
    const tts = useTTS({
        apiKey: "your-api-key",
        sampleRate: 44100,
    })

    const [text, setText] = useState("");

    const handlePlay = async () => {
        // Begin buffering the audio.
        const response = await tts.buffer({
            model_id: "sonic-english",
            voice: {
                mode: "id",
                id: "a0e99841-438c-4a64-b679-ae501e7d6091",
            },
            transcript: text,
        });

        // Immediately play the audio. (You can also buffer in advance and play later.)
        await tts.play();
    }

    return (
        <div>
            <input type="text" value={text} onChange={(event) => setText(event.target.value)} />
            <button onClick={handlePlay}>Play</button>

            <div>
                {tts.playbackStatus} | {tts.bufferStatus} | {tts.isWaiting}
            </div>
        </div>
    );
}



/*


// If you're using the client in the browser, you can control audio playback using our WebPlayer:
import { WebPlayer } from "@cartesia/cartesia-js";

console.log("Playing stream...");

// Create a Player object.
const player = new WebPlayer();

// Play the audio. (`response` includes a custom Source object that the Player can play.)
// The call resolves when the audio finishes playing.
await player.play(response.source);

console.log("Done playing.");







 */
