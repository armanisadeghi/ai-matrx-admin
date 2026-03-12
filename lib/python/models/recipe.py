"""Cooking recipe block data models."""

from __future__ import annotations

from pydantic import BaseModel


class Ingredient(BaseModel):
    """A single ingredient with amount and item."""

    amount: str = ""
    item: str


class RecipeStep(BaseModel):
    """A single instruction step."""

    action: str
    description: str
    time: str | None = None


class RecipeBlockData(BaseModel):
    """Parsed cooking recipe data."""

    title: str = "Recipe"
    yields: str = "Serves 4"
    total_time: str = "30 minutes"
    prep_time: str = "15 minutes"
    cook_time: str = "15 minutes"
    ingredients: list[Ingredient] = []
    instructions: list[RecipeStep] = []
    notes: str | None = None
