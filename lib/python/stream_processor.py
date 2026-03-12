"""
StreamBlockProcessor — stateful processor between LLM token stream and NDJSON output.

Accumulates tokens, detects block boundaries, runs per-block parsers,
and emits ContentBlockEvent objects for streaming to the client.

Usage:
    processor = StreamBlockProcessor()
    for token in llm_stream:
        events = processor.process_token(token)
        for event in events:
            yield json.dumps(event.to_stream_event()) + "\n"
    # When stream ends:
    for event in processor.finalize():
        yield json.dumps(event.to_stream_event()) + "\n"
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable

from lib.python.block_detector import (
    MATRX_PATTERN,
    SPECIAL_CODE_LANGUAGES,
    DetectedBlock,
    detect_code_block,
    detect_image,
    detect_json_block_type,
    detect_table_row,
    detect_video,
    detect_xml_block_type,
    parse_matrx_metadata,
    remove_matrx_pattern,
    split_content_into_blocks,
    validate_json_block,
)
from lib.python.models.base import BlockStatus, BlockType, ContentBlock, ContentBlockEvent


# ---------------------------------------------------------------------------
# Parser dispatch — maps block type keys to parser functions
# ---------------------------------------------------------------------------

def _build_parser_map() -> dict[str, Callable[[str], Any]]:
    """Lazily build the parser dispatch map."""
    from lib.python.parsers.broker_parser import parse_broker
    from lib.python.parsers.comparison_parser import parse_comparison
    from lib.python.parsers.decision_tree_parser import parse_decision_tree
    from lib.python.parsers.diagram_parser import parse_diagram
    from lib.python.parsers.diff_parser import looks_like_diff, detect_diff_style
    from lib.python.parsers.flashcard_parser import parse_flashcards
    from lib.python.parsers.quiz_parser import parse_quiz
    from lib.python.parsers.recipe_parser import parse_recipe
    from lib.python.parsers.research_parser import parse_research
    from lib.python.parsers.resources_parser import parse_resources
    from lib.python.parsers.progress_parser import parse_progress
    from lib.python.parsers.table_parser import parse_table
    from lib.python.parsers.task_parser import parse_tasks
    from lib.python.parsers.timeline_parser import parse_timeline
    from lib.python.parsers.transcript_parser import parse_transcript
    from lib.python.parsers.troubleshooting_parser import parse_troubleshooting
    from lib.python.parsers.questionnaire_parser import parse_questionnaire

    return {
        "flashcards": lambda c: _model_to_dict(parse_flashcards(c)),
        "transcript": lambda c: _model_to_dict(parse_transcript(c)),
        "tasks": lambda c: _model_to_dict(parse_tasks(c)),
        "quiz": lambda c: _model_to_dict(parse_quiz(c)),
        "cooking_recipe": lambda c: _model_to_dict(parse_recipe(c)),
        "timeline": lambda c: _model_to_dict(parse_timeline(c)),
        "research": lambda c: _model_to_dict(parse_research(c)),
        "resources": lambda c: _model_to_dict(parse_resources(c)),
        "progress_tracker": lambda c: _model_to_dict(parse_progress(c)),
        "comparison_table": lambda c: _model_to_dict(parse_comparison(c)),
        "troubleshooting": lambda c: _model_to_dict(parse_troubleshooting(c)),
        "decision_tree": lambda c: _model_to_dict(parse_decision_tree(c)),
        "diagram": lambda c: _model_to_dict(parse_diagram(c)),
        "table": lambda c: _model_to_dict(parse_table(c)),
        "matrxBroker": lambda c: _model_to_dict(parse_broker(c)),
        "questionnaire": lambda c: _model_to_dict(parse_questionnaire(c)),
    }


def _model_to_dict(model: Any) -> dict[str, Any] | None:
    """Convert a Pydantic model to dict, or return None if model is None."""
    if model is None:
        return None
    return model.model_dump()


# Cache the parser map after first build
_parser_map: dict[str, Callable[[str], Any]] | None = None


def _get_parser_map() -> dict[str, Callable[[str], Any]]:
    global _parser_map
    if _parser_map is None:
        _parser_map = _build_parser_map()
    return _parser_map


# ---------------------------------------------------------------------------
# Block type classification helpers
# ---------------------------------------------------------------------------

# Blocks whose content is streamed incrementally (text-like: content field grows)
_INCREMENTAL_TYPES = frozenset({
    "text", "thinking", "reasoning", "info", "task", "database",
    "private", "plan", "event", "tool", "structured_info",
})

# Blocks that can emit partial parsed data during streaming
_PARTIAL_UPDATE_TYPES = frozenset({
    "flashcards", "cooking_recipe", "questionnaire",
    "table", "tasks", "transcript",
})

# Blocks that only emit data when complete (JSON-based)
_COMPLETE_ONLY_TYPES = frozenset({
    "quiz", "presentation", "decision_tree", "comparison_table",
    "diagram", "math_problem",
})

# Code-like blocks that use content + metadata
_CODE_TYPES = frozenset({"code"})


def _is_incremental(block_type: str) -> bool:
    return block_type in _INCREMENTAL_TYPES


def _is_partial_update(block_type: str) -> bool:
    return block_type in _PARTIAL_UPDATE_TYPES


def _is_complete_only(block_type: str) -> bool:
    return block_type in _COMPLETE_ONLY_TYPES


# ---------------------------------------------------------------------------
# StreamBlockProcessor
# ---------------------------------------------------------------------------

class StreamBlockProcessor:
    """
    Stateful processor that sits between LLM token stream and NDJSON output.

    Accumulates tokens, detects block boundaries using the block detector,
    parses structured blocks with per-block parsers, and emits ContentBlockEvent
    objects for each block lifecycle change.

    Design:
    - Tokens are accumulated into a buffer
    - Periodically (on newlines, block boundaries), the buffer is analyzed
    - Detected blocks are tracked in a list with stable IDs
    - Events are emitted for: new block, content update, block complete, error
    """

    def __init__(self) -> None:
        self._buffer: str = ""                   # Raw accumulated text from LLM
        self._blocks: list[ContentBlock] = []    # All blocks seen so far
        self._block_counter: int = 0             # For generating block IDs
        self._last_split_result: list[DetectedBlock] = []  # Previous split for diffing
        self._pending_events: list[ContentBlockEvent] = []
        self._finalized: bool = False

        # Reasoning consolidation state
        self._reasoning_blocks: list[int] = []   # Indices of reasoning/thinking blocks

    def process_token(self, token: str) -> list[ContentBlockEvent]:
        """
        Process a single token from the LLM stream.

        Returns a list of ContentBlockEvent objects to emit to the client.
        May return an empty list if the token doesn't trigger any events.
        """
        if self._finalized:
            return []

        self._buffer += token
        return self._detect_and_emit()

    def process_chunk(self, chunk: str) -> list[ContentBlockEvent]:
        """
        Process a larger chunk of text (multiple tokens).
        Convenience method — same as process_token but clearer intent.
        """
        return self.process_token(chunk)

    def finalize(self) -> list[ContentBlockEvent]:
        """
        Called when the LLM stream ends. Closes all open blocks,
        runs final parsing on structured blocks, and performs
        reasoning consolidation.

        Returns final events to emit.
        """
        if self._finalized:
            return []
        self._finalized = True

        events: list[ContentBlockEvent] = []

        # Re-split the full buffer to get the final block set
        final_blocks = split_content_into_blocks(self._buffer)
        events.extend(self._reconcile_blocks(final_blocks, is_final=True))

        # Mark all remaining streaming blocks as complete
        for block in self._blocks:
            if block.status == BlockStatus.STREAMING:
                block.status = BlockStatus.COMPLETE
                # Run final parser for structured blocks
                self._run_parser(block)
                events.append(block.to_event())

        # Reasoning consolidation
        consolidation_event = self._consolidate_reasoning()
        if consolidation_event:
            events.append(consolidation_event)

        return events

    def get_blocks(self) -> list[ContentBlock]:
        """Get all current blocks (for inspection/testing)."""
        return list(self._blocks)

    def get_buffer(self) -> str:
        """Get current buffer contents (for inspection/testing)."""
        return self._buffer

    # -------------------------------------------------------------------
    # Internal methods
    # -------------------------------------------------------------------

    def _next_block_id(self) -> str:
        """Generate the next stable block ID."""
        block_id = f"blk_{self._block_counter}"
        self._block_counter += 1
        return block_id

    def _detect_and_emit(self) -> list[ContentBlockEvent]:
        """
        Run block detection on the current buffer and emit events
        for new/changed blocks.
        """
        # Split the accumulated buffer
        current_blocks = split_content_into_blocks(self._buffer)
        return self._reconcile_blocks(current_blocks, is_final=False)

    def _reconcile_blocks(
        self, detected: list[DetectedBlock], *, is_final: bool
    ) -> list[ContentBlockEvent]:
        """
        Reconcile detected blocks with our tracked block list.
        Emit events for new blocks and updated blocks.

        Strategy:
        - Compare detected blocks with existing blocks by index position
        - New blocks at the end → create new ContentBlock
        - Existing blocks with changed content → emit update
        - On finalize, all blocks get status=complete
        """
        events: list[ContentBlockEvent] = []

        for idx, detected_block in enumerate(detected):
            if idx < len(self._blocks):
                # Existing block — check for updates
                existing = self._blocks[idx]
                updated = self._update_existing_block(existing, detected_block, is_final)
                if updated:
                    events.append(existing.to_event())
            else:
                # New block
                block = self._create_block(detected_block, idx, is_final)
                self._blocks.append(block)
                events.append(block.to_event())

                # Track reasoning blocks for consolidation
                if block.type in ("thinking", "reasoning"):
                    self._reasoning_blocks.append(idx)

        self._last_split_result = detected
        return events

    def _create_block(
        self, detected: DetectedBlock, index: int, is_final: bool
    ) -> ContentBlock:
        """Create a new ContentBlock from a DetectedBlock."""
        block_type = detected.type
        status = BlockStatus.COMPLETE if is_final else BlockStatus.STREAMING

        block = ContentBlock(
            block_id=self._next_block_id(),
            block_index=index,
            type=block_type,
            status=status,
            raw_content=detected.content,
            metadata=dict(detected.metadata) if detected.metadata else {},
        )

        # Set content vs data based on block type
        if _is_incremental(block_type):
            block.content = detected.content
        elif block_type == "code":
            self._apply_code_block(block, detected)
        elif block_type in ("image", "video"):
            self._apply_media_block(block, detected)
        elif block_type == "matrxBroker":
            self._run_parser(block)
        elif _is_partial_update(block_type):
            # For partial-update blocks, try parsing even during streaming
            self._run_parser(block)
            # Also keep content for fallback rendering
            block.content = detected.content
        elif _is_complete_only(block_type):
            if is_final or detected.metadata.get("isComplete"):
                self._run_parser(block)
            # Don't set content — client shows loading state
        else:
            # Unknown type — treat as text
            block.content = detected.content

        return block

    def _update_existing_block(
        self, existing: ContentBlock, detected: DetectedBlock, is_final: bool
    ) -> bool:
        """
        Update an existing block with new detected content.
        Returns True if the block was updated (and an event should be emitted).
        """
        if existing.status == BlockStatus.COMPLETE:
            return False

        # Check if content actually changed
        if existing.raw_content == detected.content and not is_final:
            return False

        existing.raw_content = detected.content
        existing.metadata.update(detected.metadata or {})

        if is_final:
            existing.status = BlockStatus.COMPLETE

        block_type = existing.type

        if _is_incremental(block_type):
            existing.content = detected.content
            return True
        elif block_type == "code":
            self._apply_code_block(existing, detected)
            return True
        elif block_type in ("image", "video"):
            self._apply_media_block(existing, detected)
            return True
        elif _is_partial_update(block_type):
            self._run_parser(existing)
            existing.content = detected.content
            return True
        elif _is_complete_only(block_type):
            if is_final or detected.metadata.get("isComplete"):
                self._run_parser(existing)
                return True
            # Content changed but block isn't complete yet — still emit for metadata
            return True
        else:
            existing.content = detected.content
            return True

    def _apply_code_block(self, block: ContentBlock, detected: DetectedBlock) -> None:
        """Apply code block specific data."""
        from lib.python.parsers.diff_parser import looks_like_diff, detect_diff_style

        language = detected.language or ""
        code = detected.content
        is_diff = looks_like_diff(code)

        block.content = code
        block.data = {
            "language": language,
            "code": code,
            "is_diff": is_diff,
        }
        if is_diff:
            block.data["diff_style"] = detect_diff_style(code)
        block.metadata["language"] = language

    def _apply_media_block(self, block: ContentBlock, detected: DetectedBlock) -> None:
        """Apply image/video block data."""
        block.data = {
            "src": detected.src,
            "alt": detected.alt,
        }

    def _run_parser(self, block: ContentBlock) -> None:
        """Run the appropriate parser for a block and set block.data."""
        parser_map = _get_parser_map()
        parser = parser_map.get(block.type)
        if parser is None:
            return

        try:
            result = parser(block.raw_content)
            if result is not None:
                block.data = result
        except Exception:
            # Parser failure — set error status but don't crash the stream
            block.metadata["parse_error"] = True

    def _consolidate_reasoning(self) -> ContentBlockEvent | None:
        """
        Consolidate multiple reasoning/thinking blocks into a single
        consolidated_reasoning block. Matches TypeScript behavior in
        EnhancedChatMarkdown.

        Returns a new consolidated_reasoning event if there are multiple
        reasoning blocks, otherwise None.
        """
        if len(self._reasoning_blocks) < 2:
            return None

        reasoning_texts: list[str] = []
        for idx in self._reasoning_blocks:
            if idx < len(self._blocks):
                block = self._blocks[idx]
                if block.content:
                    reasoning_texts.append(block.content)

        if not reasoning_texts:
            return None

        consolidated = ContentBlock(
            block_id=self._next_block_id(),
            block_index=len(self._blocks),
            type="consolidated_reasoning",
            status=BlockStatus.COMPLETE,
            data={"reasoning_texts": reasoning_texts},
        )
        self._blocks.append(consolidated)
        return consolidated.to_event()


# ---------------------------------------------------------------------------
# Convenience function for non-streaming (batch) processing
# ---------------------------------------------------------------------------

def process_complete_content(content: str) -> list[ContentBlockEvent]:
    """
    Process a complete markdown string (non-streaming) and return
    all content block events.

    Useful for:
    - Processing saved messages from the database
    - Testing
    - Non-streaming API responses
    """
    processor = StreamBlockProcessor()
    # Feed entire content at once
    events = processor.process_token(content)
    # Finalize
    events.extend(processor.finalize())
    return events


def process_complete_to_blocks(content: str) -> list[dict[str, Any]]:
    """
    Process complete markdown content and return a list of block dicts.

    Each dict has: block_id, block_index, type, status, content, data, metadata.
    Ready for JSON serialization.
    """
    events = process_complete_content(content)
    seen_ids: set[str] = set()
    result: list[dict[str, Any]] = []

    # Take the last event for each block_id (final state)
    event_map: dict[str, ContentBlockEvent] = {}
    for event in events:
        event_map[event.block_id] = event

    for event in event_map.values():
        result.append(event.model_dump(exclude_none=True))

    result.sort(key=lambda b: b.get("block_index", 0))
    return result
