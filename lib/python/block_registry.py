"""
Block registry — extensible registry of block type definitions.

Provides a central registry for all block types (built-in and DB-stored).
Each registered type includes detection rules, parser functions, streaming
behavior, and the Pydantic model for validation.

Usage:
    registry = BlockRegistry()
    # All built-in types are auto-registered

    # Look up a block type:
    defn = registry.get("flashcards")
    parsed = defn.parser(raw_content)

    # Register a custom type:
    registry.register(BlockTypeDefinition(
        type_key="my_custom",
        display_name="My Custom Block",
        detection=DetectionRule(xml_tags=["<my_custom>"]),
        streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
    ))
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

from lib.python.models.base import StreamingBehavior


# ---------------------------------------------------------------------------
# Detection rules
# ---------------------------------------------------------------------------

class DetectionMethod(str, Enum):
    """How a block type is detected in the content stream."""
    XML_TAG = "xml_tag"          # e.g., <flashcards>...</flashcards>
    JSON_ROOT_KEY = "json_root_key"  # e.g., {"quiz_title": ...}
    CODE_LANGUAGE = "code_language"   # e.g., ```transcript
    MATRX_PATTERN = "matrx_pattern"  # <<<MATRX_START>>>
    REGEX = "regex"              # Custom regex
    MARKDOWN = "markdown"        # e.g., table rows, images


@dataclass
class DetectionRule:
    """How to detect a block of this type."""
    method: DetectionMethod = DetectionMethod.XML_TAG
    xml_tags: list[str] = field(default_factory=list)
    json_root_key: str | None = None
    code_language: str | None = None
    regex_pattern: str | None = None

    def matches_xml_tag(self, tag: str) -> bool:
        return tag in self.xml_tags

    def matches_json_key(self, key: str) -> bool:
        return self.json_root_key == key

    def matches_code_lang(self, lang: str) -> bool:
        return self.code_language == lang


# ---------------------------------------------------------------------------
# Block type definition
# ---------------------------------------------------------------------------

@dataclass
class BlockTypeDefinition:
    """Complete definition of a block type."""
    type_key: str
    display_name: str = ""
    detection: DetectionRule = field(default_factory=DetectionRule)
    streaming_behavior: StreamingBehavior = StreamingBehavior.INCREMENTAL
    parser: Callable[[str], Any] | None = None
    schema_class: type | None = None  # Pydantic model class
    description: str = ""
    is_builtin: bool = True

    def __post_init__(self) -> None:
        if not self.display_name:
            self.display_name = self.type_key.replace("_", " ").title()


# ---------------------------------------------------------------------------
# Block Registry
# ---------------------------------------------------------------------------

class BlockRegistry:
    """
    Registry of block types. Starts with built-in types,
    can be extended with DB-stored type definitions.
    """

    def __init__(self, *, auto_register_builtins: bool = True) -> None:
        self._types: dict[str, BlockTypeDefinition] = {}
        if auto_register_builtins:
            self._register_builtins()

    def register(self, definition: BlockTypeDefinition) -> None:
        """Register a block type definition."""
        self._types[definition.type_key] = definition

    def get(self, type_key: str) -> BlockTypeDefinition | None:
        """Get a block type definition by key."""
        return self._types.get(type_key)

    def has(self, type_key: str) -> bool:
        """Check if a block type is registered."""
        return type_key in self._types

    def all_types(self) -> dict[str, BlockTypeDefinition]:
        """Get all registered block types."""
        return dict(self._types)

    def type_keys(self) -> list[str]:
        """Get all registered type keys."""
        return list(self._types.keys())

    def get_parser(self, type_key: str) -> Callable[[str], Any] | None:
        """Get the parser function for a block type."""
        defn = self._types.get(type_key)
        return defn.parser if defn else None

    def get_streaming_behavior(self, type_key: str) -> StreamingBehavior:
        """Get the streaming behavior for a block type."""
        defn = self._types.get(type_key)
        return defn.streaming_behavior if defn else StreamingBehavior.INCREMENTAL

    def detect_xml_type(self, tag: str) -> str | None:
        """Detect block type from an XML tag."""
        for key, defn in self._types.items():
            if defn.detection.matches_xml_tag(tag):
                return key
        return None

    def detect_json_type(self, root_key: str) -> str | None:
        """Detect block type from a JSON root key."""
        for key, defn in self._types.items():
            if defn.detection.matches_json_key(root_key):
                return key
        return None

    def detect_code_lang_type(self, language: str) -> str | None:
        """Detect block type from a code block language."""
        for key, defn in self._types.items():
            if defn.detection.matches_code_lang(language):
                return key
        return None

    async def load_from_db(self, supabase_client: Any) -> int:
        """
        Load custom block type definitions from the database.
        Returns the number of types loaded.

        Expected table schema:
            block_types (
                type_key TEXT PRIMARY KEY,
                display_name TEXT,
                detection_method TEXT,
                detection_config JSONB,
                streaming_behavior TEXT,
                description TEXT,
                is_active BOOLEAN DEFAULT true
            )
        """
        try:
            response = await supabase_client.table("block_types").select("*").eq("is_active", True).execute()
            count = 0
            for row in response.data or []:
                detection_config = row.get("detection_config", {})
                detection = DetectionRule(
                    method=DetectionMethod(row.get("detection_method", "xml_tag")),
                    xml_tags=detection_config.get("xml_tags", []),
                    json_root_key=detection_config.get("json_root_key"),
                    code_language=detection_config.get("code_language"),
                    regex_pattern=detection_config.get("regex_pattern"),
                )
                defn = BlockTypeDefinition(
                    type_key=row["type_key"],
                    display_name=row.get("display_name", ""),
                    detection=detection,
                    streaming_behavior=StreamingBehavior(
                        row.get("streaming_behavior", "incremental")
                    ),
                    description=row.get("description", ""),
                    is_builtin=False,
                )
                self.register(defn)
                count += 1
            return count
        except Exception:
            return 0

    # -------------------------------------------------------------------
    # Built-in type registration
    # -------------------------------------------------------------------

    def _register_builtins(self) -> None:
        """Register all built-in block types."""

        # --- Text-like (incremental streaming) ---
        for type_key in ("text", "info", "task", "database", "private",
                         "plan", "event", "tool", "structured_info"):
            self.register(BlockTypeDefinition(
                type_key=type_key,
                streaming_behavior=StreamingBehavior.INCREMENTAL,
            ))

        # --- Thinking / Reasoning (incremental) ---
        self.register(BlockTypeDefinition(
            type_key="thinking",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<thinking>", "<think>"],
            ),
            streaming_behavior=StreamingBehavior.INCREMENTAL,
        ))
        self.register(BlockTypeDefinition(
            type_key="reasoning",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<reasoning>"],
            ),
            streaming_behavior=StreamingBehavior.INCREMENTAL,
        ))
        self.register(BlockTypeDefinition(
            type_key="consolidated_reasoning",
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))

        # --- Code ---
        self.register(BlockTypeDefinition(
            type_key="code",
            streaming_behavior=StreamingBehavior.INCREMENTAL,
        ))

        # --- Media ---
        self.register(BlockTypeDefinition(
            type_key="image",
            detection=DetectionRule(method=DetectionMethod.MARKDOWN),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="video",
            detection=DetectionRule(method=DetectionMethod.MARKDOWN),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))

        # --- Table ---
        self.register(BlockTypeDefinition(
            type_key="table",
            detection=DetectionRule(method=DetectionMethod.MARKDOWN),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))

        # --- XML tag blocks with parsers ---
        self.register(BlockTypeDefinition(
            type_key="flashcards",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<flashcards>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="questionnaire",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<questionnaire>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="cooking_recipe",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<cooking_recipe>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="timeline",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<timeline>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="progress_tracker",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<progress_tracker>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="troubleshooting",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<troubleshooting>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="resources",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<resources>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="research",
            detection=DetectionRule(
                method=DetectionMethod.XML_TAG,
                xml_tags=["<research>"],
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))

        # --- Code language blocks (special languages) ---
        self.register(BlockTypeDefinition(
            type_key="transcript",
            detection=DetectionRule(
                method=DetectionMethod.CODE_LANGUAGE,
                code_language="transcript",
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))
        self.register(BlockTypeDefinition(
            type_key="tasks",
            detection=DetectionRule(
                method=DetectionMethod.CODE_LANGUAGE,
                code_language="tasks",
            ),
            streaming_behavior=StreamingBehavior.PARTIAL_UPDATES,
        ))

        # --- JSON-based blocks (complete only) ---
        self.register(BlockTypeDefinition(
            type_key="quiz",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="quiz_title",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="presentation",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="presentation",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="decision_tree",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="decision_tree",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="comparison_table",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="comparison",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="diagram",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="diagram",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
        self.register(BlockTypeDefinition(
            type_key="math_problem",
            detection=DetectionRule(
                method=DetectionMethod.JSON_ROOT_KEY,
                json_root_key="math_problem",
            ),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))

        # --- MATRX Broker ---
        self.register(BlockTypeDefinition(
            type_key="matrxBroker",
            detection=DetectionRule(method=DetectionMethod.MATRX_PATTERN),
            streaming_behavior=StreamingBehavior.COMPLETE_ONLY,
        ))
