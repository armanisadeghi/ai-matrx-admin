// Function to list all voices
import cartesia from "@/lib/cartesia/client";

export const listVoices = async () => {
    try {
        const voices = await cartesia.voices.list();
        return voices;
    } catch (error) {
        console.error("Error listing voices:", error);
        throw error;
    }
};

// Function to get a specific aiAudio by ID
export const getVoice = async (voiceId: string) => {
    try {
        const voice = await cartesia.voices.get(voiceId);
        return voice;
    } catch (error) {
        console.error(`Error getting voice with ID ${voiceId}:`, error);
        throw error;
    }
};

// Function to clone a aiAudio from a file (takes a File or Blob object as input)
export const cloneVoiceFromFile = async (file: File | Blob) => {
    try {
        const clonedVoiceEmbedding = await cartesia.voices.clone({
            mode: "clip",
            clip: file,
        });
        return clonedVoiceEmbedding;
    } catch (error) {
        console.error("Error cloning aiAudio from file:", error);
        throw error;
    }
};

// Function to mix voices together
export const mixVoices = async (voices: { id: string; weight: number }[]) => {
    try {
        const mixedVoiceEmbedding = await cartesia.voices.mix({ voices });
        return mixedVoiceEmbedding;
    } catch (error) {
        console.error("Error mixing voices:", error);
        throw error;
    }
};

// // Function to localize a aiAudio
// export const localizeVoice = async (
//     embedding: number[],
//     originalSpeakerGender: "male" | "female",
//     language: string
// ) => {
//     try {
//         const localizedVoiceEmbedding = await cartesia.voices.localize({
//             embedding,
//             original_speaker_gender: originalSpeakerGender,
//             language,
//         });
//         return localizedVoiceEmbedding;
//     } catch (error) {
//         console.error("Error localizing aiAudio:", error);
//         throw error;
//     }
// };

// Function to create a new aiAudio
export const createVoice = async (name: string, description: string, embedding: number[]) => {
    try {
        const newVoice = await cartesia.voices.create({
            name,
            description,
            embedding,
        });
        return newVoice;
    } catch (error) {
        console.error("Error creating aiAudio:", error);
        throw error;
    }
};








/* CRUD on Voices
const cartesia = new Cartesia({
    apiKey: "your-api-key",
});

// List all voices.
const voices = await cartesia.voices.list();
console.log(voices);

// Get a aiAudio.
const aiAudio = await cartesia.voices.get("<aiAudio-id>");
console.log(aiAudio);

// Clone a aiAudio from a file.
const clonedVoiceEmbedding = await cartesia.voices.clone({
    mode: "clip",
    clip: myFile, // Pass a File object or a Blob.
});

// Mix voices together.
const mixedVoiceEmbedding = await cartesia.voices.mix({
    voices: [{ id: "<aiAudio-id-1>", weight: 0.6 }, { id: "<aiAudio-id-2>", weight: 0.4 }],
});

// Localize a aiAudio.
const localizedVoiceEmbedding = await cartesia.voices.localize({
    embedding: Array(192).fill(1.0),
    original_speaker_gender: "female",
    language: "es",
});

// Create a aiAudio.
const newVoice = await cartesia.voices.create({
    name: "Tim",
    description: "A deep, resonant aiAudio.",
    embedding: Array(192).fill(1.0),
});
console.log(newVoice);
*/


/* TTS over WebSocket
import Cartesia from "@cartesia/cartesia-js";

const cartesia = new Cartesia({
	apiKey: "your-api-key",
});

// Initialize the WebSocket. Make sure the output format you specify is supported.
const websocket = cartesia.tts.websocket({
	container: "raw",
	encoding: "pcm_f32le",
	sampleRate: 44100
});

try {
	await websocket.connect();
} catch (error) {
	console.error(`Failed to connect to Cartesia: ${error}`);
}

// Create a stream.
const response = await websocket.send({
	model_id: "sonic-english",
	aiAudio: {
		mode: "id",
		id: "a0e99841-438c-4a64-b679-ae501e7d6091",
	},
	transcript: "Hello, world!"
	// The WebSocket sets output_format on your behalf.
});

// Access the raw messages from the WebSocket.
response.on("message", (message) => {
	// Raw message.
	console.log("Received message:", message);
});

// You can also access messages using a for-await-of loop.
for await (const message of response.events('message')) {
	// Raw message.
	console.log("Received message:", message);
}
*/

/* Timestamps
const response = await websocket.send({
	model_id: "sonic-english",
	aiAudio: {
		mode: "id",
		id: "a0e99841-438c-4a64-b679-ae501e7d6091",
	},
	transcript: "Hello, world!",
	add_timestamps: true,
});


response.on("timestamps", (timestamps) => {
	console.log("Received timestamps for words:", timestamps.words);
	console.log("Words start at:", timestamps.start);
	console.log("Words end at:", timestamps.end);
});

// You can also access timestamps using a for-await-of loop.
for (await const timestamps of response.events('timestamps')) {
	console.log("Received timestamps for words:", timestamps.words);
	console.log("Words start at:", timestamps.start);
	console.log("Words end at:", timestamps.end);
}
 */

/* Speed and emotion controls [Alpha]
const response = await websocket.send({
	model_id: "sonic-english",
	aiAudio: {
		mode: "id",
		id: "a0e99841-438c-4a64-b679-ae501e7d6091",
		__experimental_controls: {
			speed: "fastest",
			emotion: ["sadness", "surprise:high"],
		},
	},
	transcript: "Hello, world!",
});
 */

/* Playing audio in the browser
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

/* React
import { useTTS } from '@cartesia/cartesia-js/react';

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
			aiAudio: {
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

 */


















