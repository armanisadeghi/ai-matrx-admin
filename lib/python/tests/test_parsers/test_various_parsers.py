"""Tests for various per-block parsers."""

from lib.python.parsers.transcript_parser import parse_transcript
from lib.python.parsers.task_parser import parse_tasks
from lib.python.parsers.quiz_parser import parse_quiz
from lib.python.parsers.recipe_parser import parse_recipe
from lib.python.parsers.timeline_parser import parse_timeline
from lib.python.parsers.table_parser import parse_table
from lib.python.parsers.diff_parser import looks_like_diff, detect_diff_style
from lib.python.parsers.broker_parser import parse_broker


class TestTranscriptParser:
    def test_basic_transcript(self):
        content = "[00:01] Hello everyone\n[00:05] Welcome to the show"
        result = parse_transcript(content)
        assert len(result.segments) == 2
        assert result.segments[0].timecode == "00:01"
        assert result.segments[0].seconds == 1.0
        assert result.segments[0].text == "Hello everyone"

    def test_speaker_detection(self):
        content = "[00:01] Speaker A: Hello\n[00:05] Speaker B: Hi"
        result = parse_transcript(content)
        assert result.segments[0].speaker == "Speaker A"

    def test_empty(self):
        result = parse_transcript("")
        assert len(result.segments) == 0


class TestTaskParser:
    def test_basic_tasks(self):
        content = "## My Section\n- [x] Task 1\n- [ ] Task 2"
        result = parse_tasks(content)
        assert len(result.items) > 0

    def test_section_and_tasks(self):
        content = "## Section A\n- [x] Done\n- [ ] Todo\n## Section B\n- [ ] Another"
        result = parse_tasks(content)
        sections = [i for i in result.items if i.type == "section"]
        assert len(sections) == 2

    def test_empty(self):
        result = parse_tasks("")
        assert len(result.items) == 0


class TestQuizParser:
    def test_valid_quiz(self):
        import json
        quiz_json = json.dumps({
            "quiz_title": "Test Quiz",
            "multiple_choice": [{
                "id": 1,
                "question": "What is 1+1?",
                "options": ["1", "2", "3"],
                "correctAnswer": 1,
                "explanation": "Basic math"
            }]
        })
        result = parse_quiz(quiz_json)
        assert result is not None
        assert result.title == "Test Quiz"
        assert len(result.questions) == 1
        assert result.content_hash  # should have a hash

    def test_invalid_json(self):
        result = parse_quiz("not json")
        assert result is None

    def test_missing_fields(self):
        result = parse_quiz('{"foo": "bar"}')
        assert result is None


class TestRecipeParser:
    def test_basic_recipe(self):
        content = """### Pasta Carbonara
#### Yields: 4 servings
#### Total Time: 30 minutes
#### Ingredients:
- 400g spaghetti
- 200g pancetta
#### Instructions:
1. Cook pasta
2. Fry pancetta"""
        result = parse_recipe(content)
        assert result is not None
        assert result.title == "Pasta Carbonara"
        assert len(result.ingredients) == 2
        assert len(result.instructions) == 2

    def test_empty_returns_defaults(self):
        # Parser returns default RecipeBlockData for empty input (doesn't return None)
        result = parse_recipe("")
        assert result is not None
        assert len(result.ingredients) == 0
        assert len(result.instructions) == 0


class TestTimelineParser:
    def test_basic_timeline(self):
        # Timeline parser uses **bold** for periods and "- " for events
        content = """### History of Computing

**1940s**
- **1945** - ENIAC completed (completed)
- **1946** - EDVAC designed (completed)

**1950s**
- **1951** - UNIVAC I (completed)"""
        result = parse_timeline(content)
        assert result is not None
        assert result.title == "History of Computing"
        assert len(result.periods) == 2
        assert result.periods[0].period == "1940s"
        assert len(result.periods[0].events) == 2

    def test_empty_returns_default(self):
        # Parser returns default TimelineBlockData for empty input
        result = parse_timeline("")
        assert result is not None
        assert result.title == "Timeline"
        assert len(result.periods) == 0


class TestTableParser:
    def test_basic_table(self):
        content = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
        result = parse_table(content)
        assert result is not None
        assert result.headers == ["A", "B"]
        assert len(result.rows) == 2
        assert result.rows[0] == ["1", "2"]

    def test_single_column(self):
        content = "| Name |\n|------|\n| Alice |"
        result = parse_table(content)
        assert result is not None
        assert result.headers == ["Name"]

    def test_invalid_table(self):
        result = parse_table("Not a table")
        assert result is None

    def test_too_few_lines(self):
        result = parse_table("| A |")
        assert result is None


class TestDiffParser:
    def test_search_replace_detection(self):
        content = "<<<<<<< SEARCH\nold code\n=======\nnew code\n>>>>>>> REPLACE"
        assert looks_like_diff(content) is True
        assert detect_diff_style(content) == "search_replace"

    def test_unified_diff_detection(self):
        content = "--- a/file.py\n+++ b/file.py\n@@ -1,3 +1,3 @@"
        assert looks_like_diff(content) is True
        assert detect_diff_style(content) == "unified"

    def test_no_diff(self):
        assert looks_like_diff("regular code") is False


class TestBrokerParser:
    def test_parse_broker(self):
        content = "<MATRX_KEY>abc123<MATRX_KEY_END><NAME>TestBroker<NAME_END><STATUS>active<STATUS_END>"
        result = parse_broker(content)
        assert result.matrx_record_id == "abc123"
        assert result.name == "TestBroker"
        assert result.status == "active"
        assert result.raw_content == content
