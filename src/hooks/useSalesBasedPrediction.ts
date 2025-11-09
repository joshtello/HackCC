// src/hooks/useSalesBasedPrediction.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseSalesExcel, aggregateSalesByItem } from "@/lib/salesDataParser";

interface IngredientPrediction {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export function useSalesBasedPrediction(days: number) {
  return useQuery({
    queryKey: ["sales-prediction", days],
    queryFn: async (): Promise<IngredientPrediction[]> => {
      try {
        // 1. Load sales data from Excel file (last 30 days)
        const salesRecords = await parseSalesExcel('/Coffee Shop Sales.xlsx');
        
        if (salesRecords.length === 0) {
          console.warn("No sales records found");
          return [];
        }

        // 2. Aggregate sales by item name
        const salesByItem = aggregateSalesByItem(salesRecords);
        
        // 3. Fetch all menu items with their recipes
        const { data: menuItems, error: menuError } = await supabase
          .from("menu_items")
          .select(`
            id,
            name,
            recipes (
              id,
              quantity_needed,
              ingredient_id,
              ingredients (
                id,
                name,
                unit,
                cost_per_unit
              )
            )
          `)
          .eq("is_active", true);

        if (menuError) throw menuError;

        // 4. Calculate ingredient needs based on sales
        const ingredientNeeds = new Map<string, {
          name: string;
          quantity: number;
          unit: string;
          price: number;
          ingredientId: string;
        }>();

        menuItems?.forEach((menuItem: any) => {
          // Find matching sales (case-insensitive match)
          const salesQty = Array.from(salesByItem.entries()).find(
            ([itemName]) => itemName.toLowerCase().includes(menuItem.name.toLowerCase()) ||
                           menuItem.name.toLowerCase().includes(itemName.toLowerCase())
          )?.[1] || 0;

          if (salesQty > 0 && menuItem.recipes) {
            // Calculate how many items will be sold in the prediction period
            const dailyAverage = salesQty / 30; // Average over 30 days
            const predictedSales = Math.ceil(dailyAverage * days);

            // Calculate ingredient needs for this menu item
            menuItem.recipes.forEach((recipe: any) => {
              if (recipe.ingredients) {
                const ingredientKey = recipe.ingredients.id;
                const qtyPerItem = Number(recipe.quantity_needed) || 0;
                const totalQtyNeeded = qtyPerItem * predictedSales;

                const existing = ingredientNeeds.get(ingredientKey);
                if (existing) {
                  existing.quantity += totalQtyNeeded;
                } else {
                  ingredientNeeds.set(ingredientKey, {
                    name: recipe.ingredients.name,
                    quantity: totalQtyNeeded,
                    unit: recipe.ingredients.unit || '',
                    price: Number(recipe.ingredients.cost_per_unit) || 0,
                    ingredientId: ingredientKey
                  });
                }
              }
            });
          }
        });

        // 5. Convert to array and return
        return Array.from(ingredientNeeds.values()).map(item => ({
          id: item.ingredientId,
          name: item.name,
          quantity: Math.ceil(item.quantity), // Round up
          unit: item.unit,
          price: item.price
        }));

      } catch (error) {
        console.error("Error in sales-based prediction:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
