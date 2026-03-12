"""Tests for flashcard_parser.py."""

from lib.python.parsers.flashcard_parser import parse_flashcards


class TestParseFlashcards:
    def test_basic_cards_streaming(self):
        # Without closing tag, the last card is partial (streaming behavior)
        content = """Front: What is Python?
Back: A programming language

---

Front: What is 2+2?
Back: 4"""
        result = parse_flashcards(content)
        assert len(result.cards) == 1
        assert result.cards[0].front == "What is Python?"
        assert result.cards[0].back == "A programming language"
        assert result.partial_card is not None
        assert result.partial_card.front == "What is 2+2?"

    def test_basic_cards_complete(self):
        content = """Front: What is Python?
Back: A programming language

---

Front: What is 2+2?
Back: 4
</flashcards>"""
        result = parse_flashcards(content)
        assert len(result.cards) == 2
        assert result.is_complete is True

    def test_question_answer_format(self):
        # Without closing tag, single card treated as partial
        content = """Question: What is AI?
Answer: Artificial Intelligence"""
        result = parse_flashcards(content)
        assert result.partial_card is not None
        assert result.partial_card.front == "What is AI?"
        assert result.partial_card.back == "Artificial Intelligence"

    def test_incomplete_card(self):
        content = """Front: Complete card
Back: Has answer

---

Front: Incomplete card"""
        result = parse_flashcards(content)
        assert len(result.cards) == 1
        assert result.partial_card is not None
        assert result.partial_card.front == "Incomplete card"

    def test_is_complete_flag(self):
        content = """Front: Q
Back: A
</flashcards>"""
        result = parse_flashcards(content)
        assert result.is_complete is True

    def test_empty_content(self):
        result = parse_flashcards("")
        assert len(result.cards) == 0
