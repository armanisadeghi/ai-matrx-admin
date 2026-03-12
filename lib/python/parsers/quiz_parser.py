"""Quiz parser — port of quiz-parser.ts."""

from __future__ import annotations

import hashlib
import json

from lib.python.models.quiz import QuizBlockData, QuizQuestion


def parse_quiz(content: str) -> QuizBlockData | None:
    """Parse quiz JSON string into structured data."""
    try:
        data = json.loads(content.strip())
    except json.JSONDecodeError:
        return None

    if not _is_valid_quiz(data):
        return None

    questions = sorted(data["multiple_choice"], key=lambda q: q.get("id", 0))
    content_hash = _generate_quiz_hash(questions)

    return QuizBlockData(
        title=data["quiz_title"],
        category=data.get("category"),
        questions=[
            QuizQuestion(
                id=q["id"],
                question=q["question"],
                options=q["options"],
                correct_answer=q["correctAnswer"],
                explanation=q["explanation"],
            )
            for q in questions
        ],
        content_hash=content_hash,
    )


def _is_valid_quiz(data: dict) -> bool:
    if not isinstance(data, dict):
        return False
    if not data.get("quiz_title") or not isinstance(data.get("quiz_title"), str):
        return False
    mc = data.get("multiple_choice")
    if not isinstance(mc, list) or len(mc) == 0:
        return False
    return all(
        isinstance(q.get("id"), (int, float))
        and isinstance(q.get("question"), str)
        and isinstance(q.get("options"), list)
        and len(q["options"]) > 0
        and isinstance(q.get("correctAnswer"), (int, float))
        and isinstance(q.get("explanation"), str)
        for q in mc
    )


def _generate_quiz_hash(questions: list[dict]) -> str:
    sorted_qs = sorted(questions, key=lambda q: q.get("id", 0))
    normalized = json.dumps(
        [
            {
                "question": q["question"].strip().lower(),
                "options": sorted(o.strip().lower() for o in q["options"]),
                "correctAnswer": q["correctAnswer"],
            }
            for q in sorted_qs
        ],
        sort_keys=True,
    )
    return hashlib.sha256(normalized.encode()).hexdigest()
