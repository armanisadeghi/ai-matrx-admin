// app/(authenticated)/demo/aiAudio/data/voiceImages.ts

interface VoiceImageMap {
    [key: string]: string;
}

export const voiceImages: VoiceImageMap = {
    "97e7d7a9-dfaa-4758-a936-f5f844ac34cc": "https://unsplash.com/photos/greyscale-photography-of-man-et69fnKTZ-s",
    // "voice_id_2": "https://example.com/image2.jpg",
};

export const defaultVoiceImage = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80";

export const extraImages = [
    "https://unsplash.com/photos/a-person-wearing-headphones-0eUjGng7JsM",
    "https://unsplash.com/photos/a-man-wearing-headphones-standing-in-front-of-a-microphone-FEY523cn6Rk",

];
