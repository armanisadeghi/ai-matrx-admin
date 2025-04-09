import { TranscriptSegment } from "./AdvancedTranscriptViewer";

export const parseTranscriptContent = (transcriptContent: string): TranscriptSegment[] => {
    const lines = transcriptContent.split("\n");

    let segments: TranscriptSegment[] = [];
    let currentSegment: Partial<TranscriptSegment> = {};
    let buffer = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines or title lines
        if (line === "" || line.startsWith("**Audio Transcription**")) continue;

        // Check if line contains a timecode [MM:SS] or [HH:MM:SS]
        const timecodeMatch = line.match(/^\[(\d+):(\d+)(?::(\d+))?\]/);

        if (timecodeMatch) {
            // If we have accumulated text, save the previous segment
            if (buffer.trim() && currentSegment.timecode) {
                segments.push({
                    id: `segment-${segments.length}`,
                    timecode: currentSegment.timecode || "",
                    seconds: currentSegment.seconds || 0,
                    text: buffer.trim(),
                    speaker: currentSegment.speaker,
                });
                buffer = "";
            }

            // Parse the timecode - handle both MM:SS and HH:MM:SS formats
            let hours = 0;
            let minutes = 0;
            let seconds = 0;

            if (timecodeMatch[3]) {
                // HH:MM:SS format
                hours = parseInt(timecodeMatch[1], 10);
                minutes = parseInt(timecodeMatch[2], 10);
                seconds = parseInt(timecodeMatch[3], 10);
            } else {
                // MM:SS format
                minutes = parseInt(timecodeMatch[1], 10);
                seconds = parseInt(timecodeMatch[2], 10);
            }

            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            // Format timecode string based on presence of hours
            let timecodeStr = "";
            if (hours > 0) {
                timecodeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
                    .toString()
                    .padStart(2, "0")}`;
            } else {
                timecodeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            }

            // Start a new segment
            currentSegment = {
                timecode: timecodeStr,
                seconds: totalSeconds,
            };

            // Extract any speaker info or additional text on the same line
            const restOfLine = line.replace(timecodeMatch[0], "").trim();

            if (restOfLine) {
                // Check for speaker pattern like "Speaker A:" or similar
                const speakerMatch = restOfLine.match(/^([^:]+):\s*/);

                // Also check for bold format like **Speaker**
                const boldSpeakerMatch = restOfLine.match(/^(\*\*[^*]+\*\*)/);

                if (speakerMatch) {
                    currentSegment.speaker = speakerMatch[1].trim();
                    buffer += restOfLine.substring(speakerMatch[0].length) + " ";
                } else if (boldSpeakerMatch) {
                    currentSegment.speaker = boldSpeakerMatch[1].replace(/\*/g, "").trim();
                    buffer += restOfLine.replace(boldSpeakerMatch[0], "") + " ";
                } else {
                    buffer += restOfLine + " ";
                }
            }
        } else {
            // Continue with the current segment
            buffer += line + " ";
        }
    }

    // Don't forget the last segment
    if (buffer.trim() && currentSegment.timecode) {
        segments.push({
            id: `segment-${segments.length}`,
            timecode: currentSegment.timecode || "",
            seconds: currentSegment.seconds || 0,
            text: buffer.trim(),
            speaker: currentSegment.speaker,
        });
    }

    return segments;
};


