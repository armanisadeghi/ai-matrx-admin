# Recipes Feature

This feature provides a comprehensive interface for managing AI recipes and converting them to reusable prompts.

## Overview

The recipes feature allows users to:
- View all their recipes in a card-based grid layout
- Convert recipes to prompts by selecting from different compiled versions
- Preview compiled recipe content before conversion
- Manage recipes (view, edit, duplicate, delete)

## Components

### RecipeCard
A card component that displays a recipe with action buttons.

**Features:**
- View, edit, duplicate, and delete actions
- Convert to prompt functionality with version selection
- Loading states and smooth transitions
- Purple theme to distinguish from prompts

### RecipesGrid
Grid layout component for displaying multiple recipe cards.

**Features:**
- Responsive grid layout (1-4 columns based on screen size)
- Delete confirmation dialog
- State management for loading and navigation
- Handles all recipe card actions

### RecipeVersionSelector
Dialog component for selecting and converting recipe versions to prompts.

**Features:**
- Lists all compiled versions of a recipe
- Preview of messages, brokers (variables), and settings
- Select specific version or use latest
- Success notification with link to open new prompt in new tab
- Visual feedback during conversion

## Routes

### `/ai/cockpit/recipes`
Main recipes listing page

**Features:**
- Displays all user recipes
- Info card with recipe count and conversion instructions
- New recipe button
- Direct Supabase integration (no Redux)

## API Routes

### `POST /api/recipes/[id]/convert-to-prompt`
Converts a compiled recipe to a prompt

**Parameters:**
- `compiledRecipeId` (optional): Specific compiled recipe version ID
- `version` (optional): Version number to convert
- If neither provided, converts latest version

**Returns:**
- `promptId`: ID of the newly created prompt

### `DELETE /api/recipes/[id]`
Deletes a recipe

**Returns:**
- `success`: Boolean indicating success

### `POST /api/recipes/[id]/duplicate`
Duplicates a recipe

**Returns:**
- `recipe`: The newly created recipe object

## Conversion Process

1. User clicks "Convert to Prompt" button on recipe card
2. RecipeVersionSelector dialog opens
3. System fetches all compiled versions of the recipe
4. User can:
   - Preview each version
   - Select a specific version
   - Choose to convert the latest version
5. On conversion:
   - SQL function `convert_compiled_recipe_to_prompt` processes the recipe
   - MATRX blocks are replaced with variable placeholders
   - Settings are mapped to prompt format
   - New prompt is created
6. User receives success notification with link to open prompt in new tab

## Database Integration

The feature uses direct Supabase queries for optimal performance:
- No Redux state management overhead
- Server-side data fetching on initial page load
- Client-side mutations for actions (delete, duplicate, convert)

## Styling

- Uses purple theme colors to distinguish from prompts (which use blue)
- Consistent with existing component library
- Responsive design with proper hover states
- Loading overlays for async operations

## Future Enhancements

- Recipe search and filtering
- Batch operations (convert multiple recipes)
- Recipe templates
- Version comparison view
- Conversion history tracking

