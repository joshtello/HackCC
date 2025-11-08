import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type RecipeWithIngredient = Tables<"recipes"> & {
  ingredients: Tables<"ingredients"> | null;
};

export function useMenuItemRecipes(menuItemId?: string) {
  return useQuery({
    queryKey: ["recipes", menuItemId],
    enabled: Boolean(menuItemId),
    queryFn: async () => {
      if (!menuItemId) return [];

      const { data, error } = await supabase
        .from("recipes")
        .select(`
          id,
          quantity_needed,
          ingredient_id,
          ingredients (
            id,
            name,
            unit
          )
        `)
        .eq("menu_item_id", menuItemId);

      if (error) {
        throw error;
      }

      return (data || []) as RecipeWithIngredient[];
    },
  });
}

