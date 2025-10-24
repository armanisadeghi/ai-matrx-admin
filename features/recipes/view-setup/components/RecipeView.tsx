// components/RecipeView.tsx
'use client';

import { useRecipe } from '@/features/recipes/view-setup/hooks/useRecipe';

export function RecipeView({ recipeId }: { recipeId: string }) {
  const { data: recipe, isLoading, error } = useRecipe(recipeId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading recipe</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div>
      <h1>Recipe: {recipe.recipe_id}</h1>
      
      {recipe.ai_agent && (
        <div>
          <h2>AI Agent: {recipe.ai_agent.name}</h2>
          <p>Model: {recipe.ai_agent.settings.ai_model}</p>
          <p>Temperature: {recipe.ai_agent.settings.temperature}</p>
        </div>
      )}

      <div>
        <h2>Messages ({recipe.messages.length})</h2>
        {recipe.messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
            {message.brokers.length > 0 && (
              <div>
                <strong>Brokers:</strong>
                {message.brokers.map((broker) => (
                  <span key={broker.id} style={{ color: broker.color }}>
                    {broker.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}