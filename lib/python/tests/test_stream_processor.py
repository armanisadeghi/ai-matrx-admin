"""Tests for stream_processor.py — the StreamBlockProcessor and batch helpers."""

import json

from lib.python.models.base import BlockStatus
from lib.python.stream_processor import (
    StreamBlockProcessor,
    process_complete_content,
    process_complete_to_blocks,
)


class TestStreamBlockProcessor:
    def test_plain_text(self):
        proc = StreamBlockProcessor()
        events = proc.process_token("Hello world")
        final = proc.finalize()
        all_events = events + final
        assert len(all_events) > 0
        text_events = [e for e in all_events if e.type == "text"]
        assert len(text_events) > 0
        assert any("Hello world" in (e.content or "") for e in text_events)

    def test_code_block(self):
        md = "Text before\n```python\nx = 1\n```\nText after"
        proc = StreamBlockProcessor()
        events = proc.process_token(md)
        final = proc.finalize()
        all_events = events + final
        code_events = [e for e in all_events if e.type == "code"]
        assert len(code_events) > 0

    def test_incremental_tokens(self):
        proc = StreamBlockProcessor()
        tokens = ["He", "llo", " wo", "rld"]
        all_events = []
        for token in tokens:
            all_events.extend(proc.process_token(token))
        all_events.extend(proc.finalize())
        # Should have at least one text block
        text_events = [e for e in all_events if e.type == "text"]
        assert len(text_events) > 0

    def test_block_ids_stable(self):
        proc = StreamBlockProcessor()
        events1 = proc.process_token("Hello\n")
        events2 = proc.process_token("More text\n")
        # First text block should have a stable ID across updates
        if events1 and events2:
            text_ids_1 = {e.block_id for e in events1 if e.type == "text"}
            text_ids_2 = {e.block_id for e in events2 if e.type == "text"}
            # At least one ID should be shared (same block updated)
            assert text_ids_1 & text_ids_2

    def test_finalize_marks_complete(self):
        proc = StreamBlockProcessor()
        proc.process_token("Some text")
        final = proc.finalize()
        for event in final:
            assert event.status == BlockStatus.COMPLETE

    def test_finalize_idempotent(self):
        proc = StreamBlockProcessor()
        proc.process_token("Text")
        final1 = proc.finalize()
        final2 = proc.finalize()
        assert len(final2) == 0  # Second call returns nothing

    def test_xml_block_with_parser(self):
        md = "<flashcards>\nFront: Q1\nBack: A1\n</flashcards>"
        proc = StreamBlockProcessor()
        events = proc.process_token(md)
        final = proc.finalize()
        all_events = events + final
        flashcard_events = [e for e in all_events if e.type == "flashcards"]
        assert len(flashcard_events) > 0
        # Should have parsed data
        complete = [e for e in flashcard_events if e.status == BlockStatus.COMPLETE]
        assert len(complete) > 0
        assert complete[-1].data is not None

    def test_multiple_block_types(self):
        md = """Some intro text.

```python
x = 1
```

| A | B |
|---|---|
| 1 | 2 |

Closing text."""
        proc = StreamBlockProcessor()
        events = proc.process_token(md)
        final = proc.finalize()
        all_events = events + final
        types = {e.type for e in all_events}
        assert "text" in types
        assert "code" in types
        assert "table" in types

    def test_reasoning_consolidation(self):
        md = "<reasoning>\nThought 1\n</reasoning>\n<reasoning>\nThought 2\n</reasoning>"
        proc = StreamBlockProcessor()
        events = proc.process_token(md)
        final = proc.finalize()
        all_events = events + final
        consolidated = [e for e in all_events if e.type == "consolidated_reasoning"]
        assert len(consolidated) == 1
        assert consolidated[0].data is not None
        assert len(consolidated[0].data["reasoning_texts"]) == 2

    def test_to_stream_event_format(self):
        proc = StreamBlockProcessor()
        events = proc.process_token("Hello")
        final = proc.finalize()
        all_events = events + final
        for event in all_events:
            stream_event = event.to_stream_event()
            assert stream_event["event"] == "content_block"
            assert "data" in stream_event
            assert "block_id" in stream_event["data"]
            assert "type" in stream_event["data"]
            assert "status" in stream_event["data"]


class TestProcessComplete:
    def test_process_complete_content(self):
        events = process_complete_content("# Hello\n\nSome **bold** text.")
        assert len(events) > 0
        # The last event for each block_id should be complete
        final_events: dict[str, any] = {}
        for e in events:
            final_events[e.block_id] = e
        assert all(e.status == BlockStatus.COMPLETE for e in final_events.values())

    def test_process_complete_to_blocks(self):
        blocks = process_complete_to_blocks("Hello world\n```python\nx=1\n```")
        assert len(blocks) >= 2
        assert all("block_id" in b for b in blocks)
        assert all("type" in b for b in blocks)
        # Should be sorted by block_index
        indices = [b["block_index"] for b in blocks]
        assert indices == sorted(indices)
