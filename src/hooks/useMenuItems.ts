import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMenuItems() {
  return useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useMenuItemWithSales() {
  return useQuery({
    queryKey: ["menu-items-with-sales"],
    queryFn: async () => {
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_active", true);

      if (menuError) throw menuError;

      const { data: sales, error: salesError } = await supabase
        .from("sales_records")
        .select("menu_item_id, quantity_sold")
        .gte("sale_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (salesError) throw salesError;

      // Aggregate sales by menu item
      const salesByItem = sales.reduce((acc: Record<string, number>, record) => {
        acc[record.menu_item_id] = (acc[record.menu_item_id] || 0) + record.quantity_sold;
        return acc;
      }, {});

      return menuItems.map(item => ({
        ...item,
        sales: salesByItem[item.id] || 0,
      }));
    },
  });
}
