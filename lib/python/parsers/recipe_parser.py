"""Recipe parser — port of parseRecipeMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.recipe import Ingredient, RecipeBlockData, RecipeStep


def parse_recipe(content: str) -> RecipeBlockData | None:
    """Parse cooking recipe markdown into structured data."""
    try:
        clean = re.sub(r'</?cooking_recipe>', '', content).strip()
        lines = [l.strip() for l in clean.split("\n") if l.strip()]

        title = ""
        yields = ""
        total_time = ""
        prep_time = ""
        cook_time = ""
        ingredients: list[Ingredient] = []
        instructions: list[RecipeStep] = []
        notes = ""
        section = ""

        i = 0
        while i < len(lines):
            line = lines[i]

            if line.startswith("###") and not title:
                title = re.sub(r'^#+\s*', '', line).strip()
                i += 1
                continue

            if line.startswith("**Yields:**"):
                yields = line.replace("**Yields:**", "").strip()
                i += 1
                continue

            if line.startswith("**Time:**"):
                time_info = line.replace("**Time:**", "").strip()
                total_time = time_info.split("(")[0].strip()
                paren = re.search(r'\(([^)]+)\)', time_info)
                if paren:
                    details = paren.group(1)
                    pm = re.search(r'(\d+\s*minutes?\s*prep)', details, re.IGNORECASE)
                    cm = re.search(r'(\d+\s*minutes?\s*(?:baking|cooking))', details, re.IGNORECASE)
                    if pm:
                        prep_time = pm.group(1)
                    if cm:
                        cook_time = cm.group(1)
                i += 1
                continue

            if line.startswith("####"):
                section_title = re.sub(r'^#+\s*', '', line).lower()
                if "ingredient" in section_title:
                    section = "ingredients"
                elif "instruction" in section_title:
                    section = "instructions"
                i += 1
                continue

            if line == "---":
                i += 1
                continue

            if section == "ingredients" and line.startswith("-"):
                text = re.sub(r'^-\s*', '', line).strip()
                amount_re = re.match(
                    r'^([^a-zA-Z]*(?:\d+(?:/\d+)?(?:\.\d+)?\s*'
                    r'(?:g|kg|ml|l|cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|lb|lbs|pounds?|ounces?)?'
                    r'(?:\s*\([^)]+\))?\s*)+)(.+)$',
                    text,
                )
                if amount_re:
                    ingredients.append(Ingredient(amount=amount_re.group(1).strip(), item=amount_re.group(2).strip()))
                else:
                    ingredients.append(Ingredient(item=text))
                i += 1
                continue

            if section == "instructions" and re.match(r'^\d+\.', line):
                step_text = re.sub(r'^\d+\.\s*', '', line).strip()
                action_m = re.match(r'^\*\*([^*]+)\*\*:?\s*(.+)$', step_text)
                if action_m:
                    action = action_m.group(1).strip()
                    desc = action_m.group(2).strip()
                else:
                    words = step_text.split()
                    action = " ".join(words[:2])
                    desc = step_text

                time_m = re.search(r'(\d+(?:-\d+)?\s*(?:minutes?|mins?|hours?|hrs?))', desc, re.IGNORECASE)
                instructions.append(RecipeStep(
                    action=action,
                    description=desc,
                    time=time_m.group(1) if time_m else None,
                ))
                i += 1
                continue

            if section == "instructions" and not line.startswith("#") and line != "---" and not re.match(r'^\d+\.', line):
                if line:
                    notes += (" " if notes else "") + line

            i += 1

        if not prep_time and not cook_time and total_time:
            prep_time = "15 minutes"
            cook_time = "15 minutes"

        return RecipeBlockData(
            title=title or "Recipe",
            yields=yields or "Serves 4",
            total_time=total_time or "30 minutes",
            prep_time=prep_time or "15 minutes",
            cook_time=cook_time or "15 minutes",
            ingredients=ingredients,
            instructions=instructions,
            notes=notes or None,
        )
    except Exception:
        return None
