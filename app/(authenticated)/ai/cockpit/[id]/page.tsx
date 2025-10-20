import React from 'react';
import CockpitRecipeIdPage from '@/components/playground/CockpitRecipeIdPage';

export const metadata = {
    title: 'AI Cockpit',
    description: 'Build powerful AI applications with no code using our unique Data Broker System!',
};
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const recipeId = resolvedParams.id;

  
  return <CockpitRecipeIdPage key={recipeId} recipeId={recipeId}/>;
}
  