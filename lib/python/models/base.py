"""Base models for the content block streaming protocol."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class BlockStatus(str, Enum):
    """Lifecycle status of a content block."""

    STREAMING = "streaming"
    COMPLETE = "complete"
    ERROR = "error"


class StreamingBehavior(str, Enum):
    """How a block type behaves during streaming."""

    INCREMENTAL = "incremental"        # Text-like: content grows token-by-token
    COMPLETE_ONLY = "complete_only"    # JSON-based: only renderable when fully parsed
    PARTIAL_UPDATES = "partial_updates"  # e.g., flashcards: parseable incrementally


class BlockType(str, Enum):
    """All supported content block types."""

    TEXT = "text"
    CODE = "code"
    TABLE = "table"
    THINKING = "thinking"
    REASONING = "reasoning"
    CONSOLIDATED_REASONING = "consolidated_reasoning"
    IMAGE = "image"
    VIDEO = "video"
    TASKS = "tasks"
    TRANSCRIPT = "transcript"
    STRUCTURED_INFO = "structured_info"
    MATRX_BROKER = "matrxBroker"
    QUESTIONNAIRE = "questionnaire"
    FLASHCARDS = "flashcards"
    QUIZ = "quiz"
    PRESENTATION = "presentation"
    COOKING_RECIPE = "cooking_recipe"
    TIMELINE = "timeline"
    PROGRESS_TRACKER = "progress_tracker"
    COMPARISON_TABLE = "comparison_table"
    TROUBLESHOOTING = "troubleshooting"
    RESOURCES = "resources"
    DECISION_TREE = "decision_tree"
    RESEARCH = "research"
    DIAGRAM = "diagram"
    MATH_PROBLEM = "math_problem"
    # XML pass-through types (rendered as markdown text)
    INFO = "info"
    TASK = "task"
    DATABASE = "database"
    PRIVATE = "private"
    PLAN = "plan"
    EVENT = "event"
    TOOL = "tool"


# ---------------------------------------------------------------------------
# Content block event — the NDJSON payload sent to the client
# ---------------------------------------------------------------------------

class ContentBlockEvent(BaseModel):
    """
    A single NDJSON event representing a content block or an update to one.

    Sent as: {"event": "content_block", "data": <this model>}
    """

    block_id: str = Field(description="Stable ID for this block within the message (e.g. 'blk_0')")
    block_index: int = Field(description="Ordering position among all blocks")
    type: str = Field(description="Block type key, e.g. 'text', 'flashcards', 'quiz'")
    status: BlockStatus = Field(description="Lifecycle status")
    content: str | None = Field(default=None, description="For text-like blocks: raw content string (append-friendly)")
    data: dict[str, Any] | None = Field(default=None, description="For structured blocks: parsed, render-ready data")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Optional metadata (language, isComplete, counts, etc.)")

    def to_stream_event(self) -> dict[str, Any]:
        """Serialize to the NDJSON stream event format."""
        return {
            "event": "content_block",
            "data": self.model_dump(exclude_none=True),
        }


# ---------------------------------------------------------------------------
# ContentBlock — internal representation used by the processor
# ---------------------------------------------------------------------------

class ContentBlock(BaseModel):
    """Internal block representation maintained by StreamBlockProcessor."""

    block_id: str
    block_index: int
    type: str
    status: BlockStatus = BlockStatus.STREAMING
    content: str = ""
    data: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_content: str = ""  # Accumulator for unparsed content (used by structured blocks)

    def to_event(self) -> ContentBlockEvent:
        """Convert to a streamable event."""
        return ContentBlockEvent(
            block_id=self.block_id,
            block_index=self.block_index,
            type=self.type,
            status=self.status,
            content=self.content if self.content else None,
            data=self.data,
            metadata=self.metadata,
        )
