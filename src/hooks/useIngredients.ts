import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIngredients() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        current_quantity: Math.max(Number(item.current_quantity) || 0, 0),
        threshold_quantity: Math.max(Number(item.threshold_quantity) || 0, 0),
        cost_per_unit: Math.max(Number(item.cost_per_unit) || 0, 0),
      }));
    },
  });
}

export function useLowStockIngredients() {
  return useQuery({
    queryKey: ["low-stock-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name");

      if (error) throw error;

      return (data || [])
        .map((item) => ({
          ...item,
          current_quantity: Math.max(Number(item.current_quantity) || 0, 0),
          threshold_quantity: Math.max(Number(item.threshold_quantity) || 0, 0),
          cost_per_unit: Math.max(Number(item.cost_per_unit) || 0, 0),
        }))
        .filter(item => item.current_quantity < item.threshold_quantity);
    },
  });
}
