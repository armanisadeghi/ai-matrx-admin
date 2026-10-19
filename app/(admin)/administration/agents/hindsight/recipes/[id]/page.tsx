// record-view: none — an admin support view; the admin seat never edits an organization's fields
import { RecipeReview } from "@/features/hindsight/recipes/RecipeReview";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecipeReview id={id} />;
}
