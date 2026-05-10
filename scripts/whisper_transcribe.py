#!/usr/bin/env python3
"""
Local Whisper transcription script.
Usage: python whisper_transcribe.py <audio_path> <output_json_path>

Requires: pip install openai-whisper
Falls back gracefully if whisper is not installed.
"""
import sys
import json
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: whisper_transcribe.py <audio_path> <output_json_path>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(audio_path):
        print(f"Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        import whisper
    except ImportError:
        print("whisper not installed. Run: pip install openai-whisper", file=sys.stderr)
        sys.exit(1)

    try:
        print(f"Loading Whisper model (base)...")
        model = whisper.load_model("base")

        print(f"Transcribing: {audio_path}")
        result = model.transcribe(audio_path, verbose=False, language="en")

        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "text": seg["text"].strip(),
                "start": seg["start"],
                "end": seg["end"],
            })

        output = {
            "text": result.get("text", ""),
            "segments": segments,
            "language": result.get("language", "en"),
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"Done: {len(segments)} segments written to {output_path}")

    except Exception as e:
        print(f"Whisper error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
