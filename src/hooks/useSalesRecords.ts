import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSalesRecords(days: number = 7) {
  return useQuery({
    queryKey: ["sales-records", days],
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from("sales_records")
        .select(`
          *,
          menu_items (
            name,
            price
          )
        `)
        .gte("sale_date", startDate)
        .order("sale_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useWeeklySalesData() {
  return useQuery({
    queryKey: ["weekly-sales-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_records")
        .select("sale_date, total_amount, quantity_sold")
        .gte("sale_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order("sale_date");

      if (error) throw error;

      // Group by date
      const grouped = data.reduce((acc: Record<string, { sales: number, count: number }>, record) => {
        const date = record.sale_date;
        if (!acc[date]) {
          acc[date] = { sales: 0, count: 0 };
        }
        acc[date].sales += Number(record.total_amount);
        acc[date].count += record.quantity_sold;
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, { sales }]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        sales: Math.round(sales),
      }));
    },
  });
}
