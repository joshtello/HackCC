// src/hooks/useTopSellersFromExcel.ts
import { useQuery } from "@tanstack/react-query";
import { parseSalesExcel, SalesRecord } from "@/lib/salesDataParser";

export interface TopSeller {
  name: string;
  sales: number;
}

async function tryFetchSales(): Promise<SalesRecord[]> {
  // Try multiple likely paths for the Excel file
  const paths = [
    "/coffee-shop-sales.xlsx", // recommended: put file in public/ as coffee-shop-sales.xlsx
    "/Coffee%20Shop%20Sales.xlsx", // encoded space
    "/Coffee Shop Sales.xlsx", // raw (may 404)
    "/data/coffee-sales-manhattan.xlsx", // optional alternate
    "/data/coffee-sales-manhattan.json", // JSON fallback (if parser supports)
  ];

  for (const p of paths) {
    try {
      const recs = await parseSalesExcel(p);
      if (recs.length > 0) return recs;
    } catch (e) {
      // continue trying
    }
  }
  return [];
}

export function useTopSellersFromExcel(days: number = 7) {
  return useQuery({
    queryKey: ["top-sellers-excel", days],
    queryFn: async (): Promise<TopSeller[]> => {
      const records = await tryFetchSales();
      if (records.length === 0) return [];

      // Use all available records (already filtered to Lower Manhattan)
      const filtered = records;

      // Aggregate by item name (case-sensitive as recorded)
      const counts = new Map<string, number>();
      for (const r of filtered) {
        counts.set(r.itemName, (counts.get(r.itemName) || 0) + (Number(r.quantity) || 0));
      }

      const top = Array.from(counts.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 3);

      return top;
    },
    staleTime: 5 * 60 * 1000,
  });
}
