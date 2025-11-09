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
      return (data || []).map((item) => {
        const current = Math.max(Number(item.current_quantity) || 0, 0);
        const threshold = Math.max(Number(item.threshold_quantity) || 0, 0);
        const rawCost = Number(item.cost_per_unit) || 0;
        const name = (item.name || "").toLowerCase();
        const unitOverride =
          name.includes("milk") || name.includes("water") ? "ml" : item.unit;
        const inferDefaultCost = (unit?: string) => {
          const u = (unit || "").toLowerCase();
          if (u.includes("g") && !u.includes("lg")) return 0.02; // grams
          if (u.includes("cup")) return 0.1;
          if (u.includes("bag") || u.includes("bags")) return 0.25;
          if (u.includes("ml")) return 0.001;
          if (u.includes("l")) return 0.5;
          return 0.05; // fallback small cost
        };
        const cost = rawCost > 0 ? rawCost : inferDefaultCost(unitOverride);
        return {
          ...item,
          current_quantity: current,
          threshold_quantity: threshold,
          cost_per_unit: cost,
          unit: unitOverride,
        };
      });
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
        .map((item) => {
          const current = Math.max(Number(item.current_quantity) || 0, 0);
          const threshold = Math.max(Number(item.threshold_quantity) || 0, 0);
          const rawCost = Number(item.cost_per_unit) || 0;
          const name = (item.name || "").toLowerCase();
          const unitOverride =
            name.includes("milk") || name.includes("water") ? "ml" : item.unit;
          const inferDefaultCost = (unit?: string) => {
            const u = (unit || "").toLowerCase();
            if (u.includes("g") && !u.includes("lg")) return 0.02; // grams
            if (u.includes("cup")) return 0.1;
            if (u.includes("bag") || u.includes("bags")) return 0.25;
            if (u.includes("ml")) return 0.001;
            if (u.includes("l")) return 0.5;
            return 0.05; // fallback small cost
          };
          const cost = rawCost > 0 ? rawCost : inferDefaultCost(unitOverride);
          return {
            ...item,
            current_quantity: current,
            threshold_quantity: threshold,
            cost_per_unit: cost,
            unit: unitOverride,
          };
        })
        .filter((item) => item.current_quantity < item.threshold_quantity);
    },
  });
}
