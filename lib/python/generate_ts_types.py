"""
Generate TypeScript interfaces from Pydantic models.

Produces `types/python-generated/content-blocks.ts` with all block data
interfaces, the ContentBlockEvent type, and block type constants.

Usage:
    python lib/python/generate_ts_types.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, get_args, get_origin

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.python.models.base import BlockStatus, BlockType, StreamingBehavior

# ---------------------------------------------------------------------------
# Type mapping: Python → TypeScript
# ---------------------------------------------------------------------------

_PRIMITIVE_MAP: dict[type, str] = {
    str: "string",
    int: "number",
    float: "number",
    bool: "boolean",
}


def _py_type_to_ts(annotation: Any) -> str:
    """Convert a Python type annotation to a TypeScript type string."""
    if annotation is type(None):
        return "null"

    # typing.Any → unknown
    if annotation is Any:
        return "unknown"

    # Handle basic types
    if annotation in _PRIMITIVE_MAP:
        return _PRIMITIVE_MAP[annotation]

    origin = get_origin(annotation)
    args = get_args(annotation)

    # Union types (e.g., str | None)
    if origin is type(None):
        return "null"

    # Handle typing.Union and X | Y
    import types as builtin_types
    if origin is getattr(builtin_types, "UnionType", None) or (
        hasattr(origin, "__name__") and origin.__name__ == "Union"
    ):
        # It's a union
        ts_parts = [_py_type_to_ts(a) for a in args]
        return " | ".join(ts_parts)

    # For 3.10+ union syntax: check if it's types.UnionType
    type_name = str(annotation)
    if " | " in type_name:
        # Parse from string as fallback
        parts = type_name.split(" | ")
        ts_parts = []
        for p in parts:
            p = p.strip()
            if p == "None" or p == "NoneType":
                ts_parts.append("null")
            elif p == "str":
                ts_parts.append("string")
            elif p in ("int", "float"):
                ts_parts.append("number")
            elif p == "bool":
                ts_parts.append("boolean")
            else:
                ts_parts.append(p)
        return " | ".join(ts_parts)

    # list[X]
    if origin is list:
        if args:
            inner = _py_type_to_ts(args[0])
            return f"{inner}[]"
        return "unknown[]"

    # dict[K, V]
    if origin is dict:
        if args and len(args) == 2:
            key_type = _py_type_to_ts(args[0])
            val_type = _py_type_to_ts(args[1])
            if key_type == "string":
                return f"Record<string, {val_type}>"
            return f"Record<{key_type}, {val_type}>"
        return "Record<string, unknown>"

    # Literal
    if hasattr(annotation, "__origin__") and str(annotation.__origin__) == "typing.Literal":
        literal_args = get_args(annotation)
        parts = [f'"{a}"' if isinstance(a, str) else str(a) for a in literal_args]
        return " | ".join(parts)

    # Pydantic BaseModel subclass — reference by name
    if isinstance(annotation, type):
        name = annotation.__name__
        if name in _PRIMITIVE_MAP:
            return _PRIMITIVE_MAP[annotation]
        return name

    # Fallback
    return "unknown"


def _model_to_interface(model_class: type, seen: set[str]) -> list[str]:
    """
    Convert a Pydantic model to TypeScript interface lines.
    Returns the interface definition as a list of strings.
    Also recursively processes referenced models.
    """
    from pydantic import BaseModel

    name = model_class.__name__
    if name in seen:
        return []
    seen.add(name)

    lines: list[str] = []
    deps: list[str] = []

    # Collect fields from the model's schema
    try:
        fields = model_class.model_fields
    except AttributeError:
        return []

    # Recursively process referenced models first
    for field_name, field_info in fields.items():
        annotation = field_info.annotation
        _collect_deps(annotation, seen, deps, lines)

    # Build interface
    lines.append(f"export interface {name} {{")
    for field_name, field_info in fields.items():
        annotation = field_info.annotation
        ts_type = _py_type_to_ts(annotation)

        # Check if field is optional (has default or is nullable)
        is_optional = field_info.default is not None or "null" in ts_type

        # camelCase conversion
        ts_name = _to_camel_case(field_name)

        optional_marker = "?" if is_optional and "null" not in ts_type else ""
        lines.append(f"  {ts_name}{optional_marker}: {ts_type};")

    lines.append("}")
    lines.append("")

    return deps + lines


def _collect_deps(annotation: Any, seen: set[str], deps: list[str], lines: list[str]) -> None:
    """Recursively collect dependency model interfaces."""
    from pydantic import BaseModel

    origin = get_origin(annotation)
    args = get_args(annotation)

    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        dep_lines = _model_to_interface(annotation, seen)
        deps.extend(dep_lines)
        return

    if args:
        for arg in args:
            _collect_deps(arg, seen, deps, lines)


def _to_camel_case(snake: str) -> str:
    """Convert snake_case to camelCase."""
    parts = snake.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_content_blocks_ts() -> str:
    """Generate the full content-blocks.ts file content."""
    from pydantic import BaseModel

    # Import all models
    from lib.python.models import (
        FlashcardItem, FlashcardsBlockData,
        TranscriptSegment, TranscriptBlockData,
        TaskItem, TasksBlockData,
        QuizQuestion, QuizBlockData,
        Slide, SlideTheme, PresentationBlockData,
        Ingredient, RecipeStep, RecipeBlockData,
        TimelineEvent, TimelinePeriod, TimelineBlockData,
        Position, DiagramNode, DiagramEdge, DiagramLayout, DiagramBlockData,
        TableBlockData,
        ResearchSection, ResearchBlockData,
        ResourceItem, ResourceCategory, ResourcesBlockData,
        ProgressItem, ProgressCategory, ProgressTrackerBlockData,
        ComparisonCriterion, ComparisonBlockData,
        TroubleshootingStep, TroubleshootingSolution, TroubleshootingIssue, TroubleshootingBlockData,
        DecisionNode, DecisionTreeBlockData,
        MathProblemBlockData,
        QuestionnaireSection, QuestionnaireBlockData,
        MatrxBrokerBlockData,
        TextBlockData, CodeBlockData, DiffBlockData,
        ThinkingBlockData, ReasoningBlockData, ConsolidatedReasoningBlockData,
        ImageBlockData, VideoBlockData,
    )

    output: list[str] = []
    output.append("// AUTO-GENERATED — do not edit manually.")
    output.append("// Source: lib/python/models/")
    output.append("// Run: python lib/python/generate_ts_types.py")
    output.append("")

    # Block status enum
    output.append("export const BlockStatus = {")
    for member in BlockStatus:
        output.append(f'  {member.name}: "{member.value}",')
    output.append("} as const;")
    output.append("")
    output.append("export type BlockStatus = (typeof BlockStatus)[keyof typeof BlockStatus];")
    output.append("")

    # Block type enum
    output.append("export const BlockType = {")
    for member in BlockType:
        output.append(f'  {member.name}: "{member.value}",')
    output.append("} as const;")
    output.append("")
    output.append("export type BlockType = (typeof BlockType)[keyof typeof BlockType];")
    output.append("")

    # Streaming behavior enum
    output.append("export const StreamingBehavior = {")
    for member in StreamingBehavior:
        output.append(f'  {member.name}: "{member.value}",')
    output.append("} as const;")
    output.append("")
    output.append("export type StreamingBehavior = (typeof StreamingBehavior)[keyof typeof StreamingBehavior];")
    output.append("")

    # ContentBlockEvent interface (manually written for clarity)
    output.append("export interface ContentBlockPayload {")
    output.append("  blockId: string;")
    output.append("  blockIndex: number;")
    output.append("  type: string;")
    output.append("  status: BlockStatus;")
    output.append("  content?: string | null;")
    output.append("  data?: Record<string, unknown> | null;")
    output.append("  metadata?: Record<string, unknown>;")
    output.append("}")
    output.append("")

    output.append("export interface ContentBlockEvent {")
    output.append('  event: "content_block";')
    output.append("  data: ContentBlockPayload;")
    output.append("}")
    output.append("")

    # Generate all model interfaces
    seen: set[str] = set()
    models_to_generate: list[type] = [
        FlashcardItem, FlashcardsBlockData,
        TranscriptSegment, TranscriptBlockData,
        TaskItem, TasksBlockData,
        QuizQuestion, QuizBlockData,
        Slide, SlideTheme, PresentationBlockData,
        Ingredient, RecipeStep, RecipeBlockData,
        TimelineEvent, TimelinePeriod, TimelineBlockData,
        Position, DiagramNode, DiagramEdge, DiagramLayout, DiagramBlockData,
        TableBlockData,
        ResearchSection, ResearchBlockData,
        ResourceItem, ResourceCategory, ResourcesBlockData,
        ProgressItem, ProgressCategory, ProgressTrackerBlockData,
        ComparisonCriterion, ComparisonBlockData,
        TroubleshootingStep, TroubleshootingSolution, TroubleshootingIssue, TroubleshootingBlockData,
        DecisionNode, DecisionTreeBlockData,
        MathProblemBlockData,
        QuestionnaireSection, QuestionnaireBlockData,
        MatrxBrokerBlockData,
        CodeBlockData, DiffBlockData,
        ConsolidatedReasoningBlockData,
        ImageBlockData, VideoBlockData,
    ]

    output.append("// ---- Block Data Interfaces ----")
    output.append("")

    for model in models_to_generate:
        interface_lines = _model_to_interface(model, seen)
        output.extend(interface_lines)

    # Block data type map
    output.append("// ---- Block Data Type Map ----")
    output.append("")
    output.append("export interface BlockDataTypeMap {")
    output.append("  text: null;")
    output.append("  code: CodeBlockData;")
    output.append("  table: TableBlockData;")
    output.append("  thinking: null;")
    output.append("  reasoning: null;")
    output.append("  consolidated_reasoning: ConsolidatedReasoningBlockData;")
    output.append("  image: ImageBlockData;")
    output.append("  video: VideoBlockData;")
    output.append("  flashcards: FlashcardsBlockData;")
    output.append("  transcript: TranscriptBlockData;")
    output.append("  tasks: TasksBlockData;")
    output.append("  quiz: QuizBlockData;")
    output.append("  presentation: PresentationBlockData;")
    output.append("  cooking_recipe: RecipeBlockData;")
    output.append("  timeline: TimelineBlockData;")
    output.append("  progress_tracker: ProgressTrackerBlockData;")
    output.append("  comparison_table: ComparisonBlockData;")
    output.append("  troubleshooting: TroubleshootingBlockData;")
    output.append("  resources: ResourcesBlockData;")
    output.append("  research: ResearchBlockData;")
    output.append("  decision_tree: DecisionTreeBlockData;")
    output.append("  diagram: DiagramBlockData;")
    output.append("  math_problem: MathProblemBlockData;")
    output.append("  questionnaire: QuestionnaireBlockData;")
    output.append("  matrxBroker: MatrxBrokerBlockData;")
    output.append("  diff: DiffBlockData;")
    output.append("}")
    output.append("")

    return "\n".join(output)


def main() -> None:
    output_path = PROJECT_ROOT / "types" / "python-generated" / "content-blocks.ts"
    content = generate_content_blocks_ts()
    output_path.write_text(content, encoding="utf-8")
    print(f"Generated {output_path}")


if __name__ == "__main__":
    main()
