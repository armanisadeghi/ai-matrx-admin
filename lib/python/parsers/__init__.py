"""Per-block parser functions for the server-side markdown processing pipeline."""

from lib.python.parsers.broker_parser import parse_broker
from lib.python.parsers.comparison_parser import parse_comparison
from lib.python.parsers.decision_tree_parser import parse_decision_tree
from lib.python.parsers.diagram_parser import parse_diagram
from lib.python.parsers.diff_parser import detect_diff_style, looks_like_diff
from lib.python.parsers.flashcard_parser import parse_flashcards
from lib.python.parsers.progress_parser import parse_progress
from lib.python.parsers.questionnaire_parser import parse_questionnaire
from lib.python.parsers.quiz_parser import parse_quiz
from lib.python.parsers.recipe_parser import parse_recipe
from lib.python.parsers.research_parser import parse_research
from lib.python.parsers.resources_parser import parse_resources
from lib.python.parsers.table_parser import parse_table
from lib.python.parsers.task_parser import parse_tasks
from lib.python.parsers.timeline_parser import parse_timeline
from lib.python.parsers.transcript_parser import parse_transcript
from lib.python.parsers.troubleshooting_parser import parse_troubleshooting

__all__ = [
    "parse_broker",
    "parse_comparison",
    "parse_decision_tree",
    "parse_diagram",
    "parse_flashcards",
    "parse_progress",
    "parse_questionnaire",
    "parse_quiz",
    "parse_recipe",
    "parse_research",
    "parse_resources",
    "parse_table",
    "parse_tasks",
    "parse_timeline",
    "parse_transcript",
    "parse_troubleshooting",
    "looks_like_diff",
    "detect_diff_style",
]
