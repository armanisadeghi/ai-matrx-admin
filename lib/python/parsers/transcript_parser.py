"""Transcript parser — port of transcript-parser.ts."""

from __future__ import annotations

import re

from lib.python.models.transcript import TranscriptBlockData, TranscriptSegment

_TIMECODE_RE = re.compile(r'^\[(\d+):(\d+)(?::(\d+))?\]')
_SPEAKER_RE = re.compile(r'^([^:]+):\s*')
_BOLD_SPEAKER_RE = re.compile(r'^(\*\*[^*]+\*\*)')


def parse_transcript(content: str) -> TranscriptBlockData:
    """Parse timecoded transcript content."""
    lines = content.split("\n")
    segments: list[TranscriptSegment] = []
    current_timecode: str | None = None
    current_seconds: float = 0
    current_speaker: str | None = None
    buffer = ""

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("**Audio Transcription**"):
            continue

        tc_match = _TIMECODE_RE.match(stripped)
        if tc_match:
            # Save previous segment
            if buffer.strip() and current_timecode is not None:
                segments.append(TranscriptSegment(
                    id=f"segment-{len(segments)}",
                    timecode=current_timecode,
                    seconds=current_seconds,
                    text=buffer.strip(),
                    speaker=current_speaker,
                ))
                buffer = ""

            # Parse timecode
            if tc_match.group(3):
                hours = int(tc_match.group(1))
                minutes = int(tc_match.group(2))
                seconds = int(tc_match.group(3))
            else:
                hours = 0
                minutes = int(tc_match.group(1))
                seconds = int(tc_match.group(2))

            total_seconds = hours * 3600 + minutes * 60 + seconds

            if hours > 0:
                tc_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                tc_str = f"{minutes:02d}:{seconds:02d}"

            current_timecode = tc_str
            current_seconds = float(total_seconds)
            current_speaker = None

            rest = stripped[tc_match.end():].strip()
            if rest:
                speaker_m = _SPEAKER_RE.match(rest)
                bold_m = _BOLD_SPEAKER_RE.match(rest)
                if speaker_m:
                    current_speaker = speaker_m.group(1).strip()
                    buffer += rest[speaker_m.end():] + " "
                elif bold_m:
                    current_speaker = bold_m.group(1).replace("*", "").strip()
                    buffer += rest[bold_m.end():] + " "
                else:
                    buffer += rest + " "
        else:
            buffer += stripped + " "

    # Last segment
    if buffer.strip() and current_timecode is not None:
        segments.append(TranscriptSegment(
            id=f"segment-{len(segments)}",
            timecode=current_timecode,
            seconds=current_seconds,
            text=buffer.strip(),
            speaker=current_speaker,
        ))

    return TranscriptBlockData(segments=segments)
