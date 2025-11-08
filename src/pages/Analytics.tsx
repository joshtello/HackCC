import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarRange,
  Download,
  Flame,
  Layers,
  LineChart as LineChartIcon,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

type DrilldownContext =
  | {
      type: "category" | "product" | "time" | "inventory" | "ai";
      title: string;
      items: InsightDetail[];
    }
  | null;

type CoffeeSaleRecord = {
  transaction_id: string;
  transaction_date: string;
  transaction_time: string;
  transaction_qty: string;
  store_id: string;
  store_location: string;
  product_id: string;
  unit_price: string;
  product_category: string;
  product_type: string;
  product_detail: string;
};

type ParsedSale = {
  id: string;
  date: Date;
  dateKey: string;
  hour: number;
  hourLabel: string;
  qty: number;
  price: number;
  revenue: number;
  store: string;
  category: string;
  type: string;
  detail: string;
};

type InsightDetail = {
  label: string;
  value: number;
  trend?: number;
  description?: string;
  valueType?: "currency" | "number" | "percent";
};

type InsightItem = {
  label: string;
  value: string;
  icon: typeof Layers;
  route?: string;
  description?: string;
  details?: InsightDetail[];
};

const KPI_CONFIG = [
  { key: "revenueToday", label: "Revenue Today", icon: TrendingUp },
  { key: "inventoryValue", label: "Total Inventory Value", icon: Package },
  { key: "ordersPending", label: "Orders Pending", icon: ShoppingCart },
  { key: "lowStockItems", label: "Low Stock Items", icon: AlertTriangle },
] as const;

const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

const HOUR_SEGMENTS = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const DAY_SEGMENTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CATEGORY_COLORS = [
  "hsl(217 90% 50%)",
  "hsl(142 70% 45%)",
  "hsl(261 70% 55%)",
  "hsl(14 90% 54%)",
  "hsl(48 100% 50%)",
  "hsl(190 90% 45%)",
  "hsl(320 70% 55%)",
  "hsl(200 80% 35%)",
  "hsl(110 65% 45%)",
  "hsl(275 65% 60%)",
  "hsl(355 75% 55%)",
  "hsl(30 80% 55%)",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function getStatusIndicator(score: number) {
  if (score >= 75) return "🟢";
  if (score >= 50) return "🟡";
  return "🔴";
}

function parseSales(records: CoffeeSaleRecord[]): ParsedSale[] {
  return records.map((record) => {
    const [month, day, year] = record.transaction_date.split("/").map((part) => parseInt(part, 10));
    const [hour = 0, minute = 0, second = 0] = record.transaction_time.split(":").map((part) => parseInt(part, 10));
    const normalizedYear = year < 100 ? year + 2000 : year;
    const date = new Date(normalizedYear, month - 1, day, hour, minute, second);
    const qty = Number(record.transaction_qty) || 0;
    const price = Number(record.unit_price) || 0;
    const revenue = qty * price;
    const hourLabel = `${hour.toString().padStart(2, "0")}:00`;

    return {
      id: record.transaction_id,
      date,
      dateKey: date.toISOString().split("T")[0],
      hour,
      hourLabel,
      qty,
      price,
      revenue,
      store: record.store_location,
      category: record.product_category || "Uncategorized",
      type: record.product_type || "Unknown",
      detail: record.product_detail || record.product_type || "Unknown",
    } satisfies ParsedSale;
  });
}

function exportToCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map((row) =>
      Object.values(row)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Analytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<number>(7);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [drilldown, setDrilldown] = useState<DrilldownContext>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const {
    data: rawSales = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["coffee-sales-manhattan"],
    queryFn: async () => {
      const response = await fetch("/data/coffee-sales-manhattan.json");
      if (!response.ok) {
      throw new Error("Failed to load coffee sales data");
      }
      const json = (await response.json()) as CoffeeSaleRecord[];
      return json.filter((record) => (record.store_location || "").toLowerCase().includes("manhattan"));
    },
  });

  const salesRecords = useMemo(() => parseSales(rawSales), [rawSales]);

  const latestDate = useMemo(() => {
    if (!salesRecords.length) return null;
    return salesRecords.reduce((latest, record) => (record.date > latest ? record.date : latest), salesRecords[0].date);
  }, [salesRecords]);

  const startDate = useMemo(() => {
    if (!latestDate) return null;
    const start = new Date(latestDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dateRange - 1));
    return start;
  }, [latestDate, dateRange]);

  const filteredByDate = useMemo(() => {
    if (!latestDate || !startDate) return [];
    return salesRecords.filter((record) => record.date >= startDate && record.date <= latestDate);
  }, [salesRecords, startDate, latestDate]);

  const filteredRecords = useMemo(() => {
    return filteredByDate.filter((record) => {
      const categoryMatch = categoryFilter === "all" || record.category === categoryFilter;
      const locationMatch = locationFilter === "all" || record.store === locationFilter;
      return categoryMatch && locationMatch;
    });
  }, [filteredByDate, categoryFilter, locationFilter]);

  const revenueToday = useMemo(() => {
    if (!latestDate) return 0;
    const todayKey = latestDate.toISOString().split("T")[0];
    return filteredRecords
      .filter((record) => record.dateKey === todayKey)
      .reduce((sum, record) => sum + record.revenue, 0);
  }, [filteredRecords, latestDate]);

  const totalRevenue = useMemo(() => filteredRecords.reduce((sum, record) => sum + record.revenue, 0), [
    filteredRecords,
  ]);

  const productStats = useMemo(() => {
    const map = new Map<string, {
      detail: string;
      type: string;
      category: string;
      store: string;
      totalQty: number;
      totalRevenue: number;
      avgPrice: number;
    }>();

    filteredRecords.forEach((record) => {
      const key = record.detail;
      if (!map.has(key)) {
        map.set(key, {
          detail: record.detail,
          type: record.type,
          category: record.category,
          store: record.store,
          totalQty: 0,
          totalRevenue: 0,
          avgPrice: 0,
        });
      }
      const stat = map.get(key)!;
      stat.totalQty += record.qty;
      stat.totalRevenue += record.revenue;
    });

    return Array.from(map.values()).map((stat) => ({
      ...stat,
      avgPrice: stat.totalQty ? stat.totalRevenue / stat.totalQty : 0,
    }));
  }, [filteredRecords]);

  const lowStockProducts = useMemo(
    () => productStats.filter((stat) => stat.totalQty < 30),
    [productStats],
  );

  const lowStockCount = lowStockProducts.length;

  const totalInventoryValue = useMemo(() => {
    if (!productStats.length) return 0;
    return productStats.reduce((sum, stat) => sum + stat.avgPrice * (stat.totalQty + 25), 0);
  }, [productStats]);

  const ordersPending = useMemo(() => {
    const demandUnits = filteredRecords.reduce((sum, record) => sum + record.qty, 0);
    return Math.max(Math.round(demandUnits * 0.08 + lowStockCount * 0.6), 0);
  }, [filteredRecords, lowStockCount]);

  const weeklyRevenue = totalRevenue;

  const weeklySalesData = useMemo(() => {
    if (!latestDate) return [];
    const start = new Date(latestDate);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const revenueMap = new Map<string, { revenue: number; qty: number }>();
    salesRecords.forEach((record) => {
      if (record.date >= start && record.date <= latestDate) {
        const key = record.dateKey;
        if (!revenueMap.has(key)) {
          revenueMap.set(key, { revenue: 0, qty: 0 });
        }
        const entry = revenueMap.get(key)!;
        entry.revenue += record.revenue;
        entry.qty += record.qty;
      }
    });

    const initialInventory = totalInventoryValue || 50000;
    let runningInventory = initialInventory;

    const points: Array<{ day: string; dateKey: string; sales: number; inventory: number }> = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().split("T")[0];
      const revenue = revenueMap.get(key)?.revenue || 0;
      runningInventory = Math.max(runningInventory - revenue * 0.6, 0);
      points.push({
        day: day.toLocaleDateString("en-US", { weekday: "short" }),
        dateKey: key,
        sales: Math.round(revenue),
        inventory: Math.round(runningInventory),
      });
    }
    return points;
  }, [salesRecords, latestDate, totalInventoryValue]);

  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredRecords.forEach((record) => {
      map.set(record.category, (map.get(record.category) || 0) + record.revenue);
    });
    return Array.from(map.entries()).map(([category, revenue]) => ({ category, revenue }));
  }, [filteredRecords]);

  const inventoryValueByCategory = useMemo(() => {
    const map = new Map<string, { value: number; count: number; qty: number }>();
    productStats.forEach((stat) => {
      if (!map.has(stat.category)) {
        map.set(stat.category, { value: 0, count: 0, qty: 0 });
      }
      const entry = map.get(stat.category)!;
      entry.value += stat.avgPrice * (stat.totalQty + 25);
      entry.count += 1;
      entry.qty += stat.totalQty;
    });
    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      value: data.value,
      count: data.count,
      avgQty: data.count ? data.qty / data.count : 0,
    }));
  }, [productStats]);

  const inventoryValueTotal = useMemo(
    () => inventoryValueByCategory.reduce((sum, item) => sum + item.value, 0),
    [inventoryValueByCategory],
  );

  const inventoryHeatmap = useMemo(() => {
    const grid = DAY_SEGMENTS.map((day) => ({
      day,
      hours: HOUR_SEGMENTS.map((hour) => ({ hour, value: 0 })),
    }));

    filteredRecords.forEach((record) => {
      const dayIndex = record.date.getDay();
      const normalizedDay = (dayIndex + 6) % 7;
      const bucket = grid[normalizedDay];
      const closestHour = HOUR_SEGMENTS.reduce((prev, curr) => {
        const currHour = Number(curr.split(":")[0]);
        const prevHour = Number(prev.split(":")[0]);
        return Math.abs(currHour - record.hour) < Math.abs(prevHour - record.hour) ? curr : prev;
      });
      const hourBucket = bucket.hours.find((hour) => hour.hour === closestHour);
      if (hourBucket) {
        hourBucket.value += record.qty;
      }
    });

    const maxValue = Math.max(
      ...grid.flatMap((day) => day.hours.map((bucket) => bucket.value)),
      1,
    );

    return grid.map((day) => ({
      day: day.day,
      hours: day.hours.map((bucket) => ({ ...bucket, intensity: bucket.value / maxValue })),
    }));
  }, [filteredRecords]);

  const scatterData = useMemo(() => {
    return productStats
      .map((stat) => {
        const estimatedCost = stat.avgPrice * (0.5 + ((stat.totalQty % 12) / 40));
        const margin = stat.avgPrice ? ((stat.avgPrice - estimatedCost) / stat.avgPrice) * 100 : 0;
        return {
          name: stat.detail,
          margin: Number(margin.toFixed(2)),
          turnover: Number(stat.totalQty.toFixed(2)),
          revenue: stat.totalRevenue,
        };
      })
      .filter((item) => item.turnover > 0);
  }, [productStats]);

  const turnoverRate = useMemo(() => {
    const skuCount = productStats.length || 1;
    const totalQty = filteredRecords.reduce((sum, record) => sum + record.qty, 0);
    return Number((totalQty / skuCount).toFixed(2));
  }, [productStats, filteredRecords]);

  const stockoutFrequency = useMemo(() => {
    const skuCount = productStats.length || 1;
    return Number(((lowStockCount / skuCount) * 100).toFixed(1));
  }, [lowStockCount, productStats]);

  const wasteRatio = useMemo(() => {
    if (!productStats.length) return 0;
    const lowPerformers = productStats.filter((stat) => stat.totalRevenue < 150).length;
    return Number(((lowPerformers / productStats.length) * 100).toFixed(1));
  }, [productStats]);

  const leadTimeTracker = useMemo(() => {
    const map = new Map<string, number>();
    productStats.forEach((stat, index) => {
      if (!map.has(stat.store)) {
        map.set(stat.store, 2 + ((index * 7) % 6));
      }
    });
    return Array.from(map.entries()).map(([store, days]) => ({ supplier: store, days: Math.round(days) }));
  }, [productStats]);

  const demandForecast = useMemo(() => {
    const days = Math.max(dateRange, 1);
    const dailyAverage = totalRevenue / days;
    return {
      "7": Math.round(dailyAverage * 7 * 1.06),
      "30": Math.round(dailyAverage * 30 * 1.08),
      "90": Math.round(dailyAverage * 90 * 1.12),
    };
  }, [totalRevenue, dateRange]);

  const inventoryHealthScore = useMemo(() => {
    const metrics = [100 - stockoutFrequency, Math.max(0, 100 - wasteRatio), Math.min(100, turnoverRate * 8)];
    const average = metrics.reduce((sum, value) => sum + value, 0) / metrics.length;
    return Math.round(Math.min(Math.max(average, 0), 100));
  }, [stockoutFrequency, wasteRatio, turnoverRate]);

  const aiInsights = useMemo<InsightItem[]>(() => {
    const bestSellingDay = weeklySalesData.reduce(
      (best, entry) => (entry.sales > (best?.sales || 0) ? entry : best),
      weeklySalesData[0],
    );

    const bestSellingDayDetails: InsightDetail[] =
      bestSellingDay && "dateKey" in bestSellingDay && bestSellingDay.dateKey
        ? (() => {
            const dayRecords = filteredRecords.filter((record) => record.dateKey === bestSellingDay.dateKey);
            const categoryMap = new Map<string, { revenue: number; qty: number }>();
            const hourMap = new Map<string, number>();

            dayRecords.forEach((record) => {
              categoryMap.set(record.category, {
                revenue: (categoryMap.get(record.category)?.revenue || 0) + record.revenue,
                qty: (categoryMap.get(record.category)?.qty || 0) + record.qty,
              });
              hourMap.set(record.hourLabel, (hourMap.get(record.hourLabel) || 0) + record.qty);
            });

            const topCategories = Array.from(categoryMap.entries())
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .slice(0, 3)
              .map(([category, stats]) => ({
                label: category,
                value: stats.revenue,
                description: `${formatNumber(stats.qty)} cups sold`,
                valueType: "currency" as const,
              }));

            const busiestHour = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0];

            if (busiestHour) {
              const averagePrice = dayRecords.length
                ? dayRecords.reduce((sum, record) => sum + record.price, 0) / dayRecords.length
                : 4;
              topCategories.push({
                label: "Peak hour",
                value: Number((busiestHour[1] * averagePrice).toFixed(2)),
                description: `${busiestHour[0]} · ${formatNumber(busiestHour[1])} cups`,
                valueType: "currency",
              });
            }

            return topCategories;
          })()
        : [];

    const alertsSummary = lowStockCount
      ? `⚠️ ${lowStockCount} SKU${lowStockCount === 1 ? "" : "s"} trending low. Adjust production or reorder.`
      : "✅ Healthy stock levels across the locations.";

    const supplierSummary = leadTimeTracker
      .map((entry) => `${entry.supplier}: ${entry.days}d`)
      .slice(0, 3)
      .join(" · ") || "Lead time data coming soon";

    const forecastSummary = `Projected demand: ${formatCurrency(demandForecast["7"])} (7d) → ${formatCurrency(
      demandForecast["30"],
    )} (30d) → ${formatCurrency(demandForecast["90"])} (90d).`;

    const storeBreakdown: InsightDetail[] = (() => {
      const storeMap = new Map<string, { revenue: number; orders: number }>();
      filteredRecords.forEach((record) => {
        storeMap.set(record.store, {
          revenue: (storeMap.get(record.store)?.revenue || 0) + record.revenue,
          orders: (storeMap.get(record.store)?.orders || 0) + record.qty,
        });
      });
      return Array.from(storeMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 3)
        .map(([store, stats]) => ({
          label: store,
          value: stats.revenue,
          description: `${formatNumber(stats.orders)} units`,
          valueType: "currency" as const,
        }));
    })();

    const turnoverLeaders: InsightDetail[] = productStats
      .slice()
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 3)
      .map((stat) => ({
        label: stat.detail,
        value: stat.totalQty,
        description: `${formatCurrency(stat.avgPrice)} avg price`,
        valueType: "number" as const,
      }));

    const forecastDetails: InsightDetail[] = [
      { label: "7-day", value: demandForecast["7"], description: "Short-term uplift projection", valueType: "currency" },
      { label: "30-day", value: demandForecast["30"], description: "Monthly demand target", valueType: "currency" },
      { label: "90-day", value: demandForecast["90"], description: "Quarter horizon outlook", valueType: "currency" },
    ];

    const healthDetails: InsightDetail[] = [
      {
        label: "Stockout impact",
        value: stockoutFrequency,
        description: `${stockoutFrequency}% of SKUs near threshold`,
        valueType: "percent",
      },
      { label: "Waste pressure", value: wasteRatio, description: `${wasteRatio}% low performers`, valueType: "percent" },
      { label: "Velocity", value: turnoverRate, description: `${turnoverRate} avg turns / SKU`, valueType: "number" },
    ];

    const narrativeMetrics = (() => {
      const topCategory = revenueByCategory[0];
      const slowCategory =
        revenueByCategory.length > 1 ? revenueByCategory[revenueByCategory.length - 1] : undefined;
      const topProduct = turnoverLeaders[0];
      const peakDay =
        bestSellingDay && "dateKey" in bestSellingDay && bestSellingDay.dateKey ? bestSellingDay : undefined;

      const revenueBeatForecast = weeklyRevenue >= demandForecast["30"];
      return { topCategory, slowCategory, topProduct, peakDay, revenueBeatForecast };
    })();

    const narrativeSummary = (() => {
      const { topCategory, slowCategory, topProduct, peakDay, revenueBeatForecast } = narrativeMetrics;
      const parts: string[] = [];

      if (peakDay) {
        parts.push(
          `Sales peaked on ${peakDay.day.toLowerCase()} with ${formatCurrency(peakDay.sales)} in revenue across the stores.`,
        );
      } else {
        parts.push("Sales activity remained steady across the stores this week.");
      }

      if (topCategory) {
        parts.push(
          `${topCategory.category} led category revenue at ${formatCurrency(topCategory.revenue)}, while ${
            topProduct ? topProduct.label : "top products"
          } drove frontline demand.`,
        );
      }

      if (slowCategory && slowCategory !== narrativeMetrics.topCategory) {
        parts.push(
          `${slowCategory.category} trailed the portfolio, presenting an opportunity to boost engagement or adjust assortment.`,
        );
      }

      if (lowStockCount > 0) {
        parts.push(
          `${lowStockCount} SKU${lowStockCount === 1 ? "" : "s"} are nearing threshold; plan replenishment before the next rush.`,
        );
      } else {
        parts.push("Stock coverage looks healthy with no immediate replenishment risks.");
      }

      parts.push(
        revenueBeatForecast
          ? "Revenue is pacing ahead of the 30-day outlook—maintain momentum with targeted promotions."
          : "Revenue is trailing short-term forecasts; consider campaigns or staffing adjustments to capture upside.",
      );

      return parts.join(" ");
    })();

    const narrativeDetails: InsightDetail[] = (() => {
      const { topCategory, slowCategory, topProduct } = narrativeMetrics;
      const details: Array<InsightDetail | null> = [
        topCategory
          ? {
              label: "Lead category",
              value: topCategory.revenue,
              description: `${topCategory.category} leading revenue`,
              valueType: "currency",
            }
          : null,
        topProduct
          ? {
              label: "Fastest mover",
              value: topProduct.value,
              description: `${topProduct.label} moving ${formatNumber(topProduct.value)} units`,
              valueType: "number",
            }
          : null,
        slowCategory && slowCategory !== narrativeMetrics.topCategory
          ? {
              label: "Laggard category",
              value: slowCategory.revenue,
              description: `${slowCategory.category} under index`,
              valueType: "currency",
            }
          : null,
      ];
      return details.filter((item): item is InsightDetail => item !== null);
    })();

    return [
      {
        label: "Current inventory value",
        value: formatCurrency(totalInventoryValue),
        icon: Layers,
        route: "/inventory",
        description: "Summed holding cost for all tracked SKUs.",
      },
      {
        label: "Best selling day",
        value: bestSellingDay ? `${bestSellingDay.day} · ${formatCurrency(bestSellingDay.sales)}` : "No sales yet",
        icon: LineChartIcon,
        details: bestSellingDayDetails,
        description: "Daily revenue and peak hour breakdown for top-performing day.",
      },
      {
        label: "Weekly revenue",
        value: formatCurrency(weeklyRevenue),
        icon: TrendingUp,
        details: storeBreakdown,
        description: "Aggregated seven-day revenue with top store contributors.",
      },
      {
        label: "Stock alerts",
        value: alertsSummary,
        icon: Flame,
        route: "/inventory",
      },
      {
        label: "Inventory turnover",
        value: `${turnoverRate} turns / SKU`,
        icon: Activity,
        details: turnoverLeaders,
        description: "Highlights SKUs cycling fastest through the stores.",
      },
      {
        label: "Stockout frequency",
        value: `${stockoutFrequency}%`,
      icon: AlertTriangle,
        route: "/inventory",
      },
      {
        label: "Waste / overstock",
        value: `${wasteRatio}%`,
        icon: Package,
        route: "/inventory",
      },
      {
        label: "Average margin",
        value: scatterData.length
          ? `${Math.round(scatterData.reduce((sum, item) => sum + item.margin, 0) / scatterData.length)}% per item`
          : "N/A",
        icon: BarChart3,
        route: "/menu",
      },
      {
        label: "Demand forecast",
        value: forecastSummary,
        icon: CalendarRange,
        details: forecastDetails,
        description: "Projected demand curve derived from trailing averages.",
      },
      {
        label: "Supplier lead time",
        value: supplierSummary,
        icon: ShoppingCart,
        route: "/inventory",
      },
      {
        label: "Inventory health score",
        value: `${inventoryHealthScore}/100`,
        icon: ShieldCheck,
        details: healthDetails,
        description: "Composite score blending stockouts, waste, and turnover velocity.",
      },
      {
        label: "AI narrative",
        value: narrativeSummary,
        icon: BrainCircuit,
        details: [
          {
            label: "AI summary",
            value: 0,
            description: narrativeSummary,
          },
          ...narrativeDetails,
        ],
        description: "Generated summary of notable shifts and emerging risks.",
      },
    ];
  }, [
    totalInventoryValue,
    weeklySalesData,
    weeklyRevenue,
    filteredRecords,
    lowStockCount,
    lowStockProducts,
    turnoverRate,
    stockoutFrequency,
    wasteRatio,
    scatterData,
    productStats,
    revenueByCategory,
    demandForecast,
    leadTimeTracker,
    inventoryHealthScore,
  ]);

  const alerts = useMemo(() => {
    const items: Array<{ status: "green" | "yellow" | "red"; title: string; description: string; route: string }> = [];
    if (lowStockCount > 0) {
      items.push({
        status: "red",
        title: "Low stock skus",
        description: `${lowStockCount} products are trending toward stockout.`,
        route: "/inventory",
      });
    }
    if (inventoryHealthScore < 60) {
      items.push({
        status: "yellow",
        title: "Inventory health warning",
        description: "Health score dipped below target. Review demand plan.",
        route: "/analytics",
      });
    }
    if (turnoverRate > 18) {
      items.push({
        status: "green",
        title: "High turnover velocity",
        description: "Top-performing SKUs are moving quickly—keep roasting schedule tight.",
        route: "/menu",
      });
    }
    return items;
  }, [lowStockCount, inventoryHealthScore, turnoverRate]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    salesRecords.forEach((record) => {
      if (record.category) set.add(record.category);
    });
    return Array.from(set).sort();
  }, [salesRecords]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    salesRecords.forEach((record) => {
      if (record.store) set.add(record.store);
    });
    return Array.from(set).sort();
  }, [salesRecords]);

  const kpiData = {
    revenueToday,
    inventoryValue: totalInventoryValue,
    ordersPending,
    lowStockItems: lowStockCount,
  } as Record<(typeof KPI_CONFIG)[number]["key"], number>;

  const loadingState = isLoading || !salesRecords.length;

  const handleExportCsv = () => {
    exportToCsv(
      `manhattan-analytics-${Date.now()}.csv`,
      filteredRecords.map((record) => ({
        date: record.dateKey,
        store: record.store,
        category: record.category,
        product: record.detail,
        quantity: record.qty,
        revenue: record.revenue.toFixed(2),
      })),
    );
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleDrilldown = (context: DrilldownContext) => {
    setDrilldown(context);
  };

  const handleInsightClick = (insight: InsightItem) => {
    if (insight.route) {
      navigate(insight.route);
      return;
    }

    if (insight.details && insight.details.length > 0) {
      handleDrilldown({
        type: "ai",
        title: insight.label,
        items: insight.details,
      });
      return;
    }

    if (insight.description) {
      handleDrilldown({
        type: "ai",
        title: insight.label,
        items: [
          {
            label: insight.label,
            value: 0,
            description: insight.description,
          },
        ],
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            <p className="mt-1 text-muted-foreground">
              Sales intelligence powered by the Coffee Shop dataset.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={alerts.length ? "destructive" : "secondary"}
                  className="gap-2 border border-border/70 px-3 py-2 shadow-sm"
                >
                  <span className="relative flex items-center">
                    <Bell className="h-4 w-4" />
                    {alerts.length > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-semibold text-destructive">
                        {alerts.length}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    {alerts.length ? `${alerts.length} Notifications` : "Notifications"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Alerts & notifications</p>
                    <Badge variant="outline" className="text-xs">
                      {alerts.length ? "Action required" : "All clear"}
                    </Badge>
                  </div>
                  {loadingState && (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  )}
                  {!loadingState && alerts.length === 0 && (
                    <div className="rounded-lg border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                      No critical alerts. Inventory performance is stable.
                    </div>
                  )}
                  {!loadingState &&
                    alerts.map((alert) => (
                      <button
                        key={alert.title}
                        type="button"
                        onClick={() => {
                          navigate(alert.route);
                          setAlertsOpen(false);
                        }}
                        className="flex w-full items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition hover:border-primary/60 hover:bg-secondary/40"
                      >
                        <span className="text-lg leading-none">
                          {alert.status === "red" ? "🔴" : alert.status === "yellow" ? "🟡" : "🟢"}
                        </span>
        <div>
                          <p className="font-medium text-foreground">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
                      </button>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-border/60 bg-secondary/40">
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory health</p>
                <p className="text-xl font-semibold">{inventoryHealthScore}/100</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {getStatusIndicator(inventoryHealthScore)}
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-secondary/40">
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Turnover rate</p>
                <p className="text-xl font-semibold">{turnoverRate} / SKU</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Velocity
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-secondary/40">
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Waste ratio</p>
                <p className="text-xl font-semibold">{wasteRatio}%</p>
              </div>
              <Badge variant="destructive" className="shrink-0 bg-destructive/15 text-destructive">
                Waste
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KPI_CONFIG.map((item) => {
            const value = kpiData[item.key];
            const Icon = item.icon;
            return (
              <Card key={item.key} className="relative overflow-hidden border-border/60">
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex items-center justify-between">
                    <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
                      {item.label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-muted-foreground/80">?</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Derived from the Coffee Shop Sales dataset.</p>
                      </TooltipContent>
                    </Tooltip>
                    </CardDescription>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {loadingState ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <CardTitle className="text-2xl font-bold">
                      {item.key === "ordersPending" || item.key === "lowStockItems" ? formatNumber(value) : formatCurrency(value)}
                    </CardTitle>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <Badge variant="secondary" className="px-2 py-1">
                    {getStatusIndicator(item.key === "inventoryValue" ? inventoryHealthScore : 80)} Dataset synced
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription className="text-xs">
              Slice the dataset by date range, category, or store.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase text-muted-foreground tracking-wide">Date range</p>
              <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase text-muted-foreground tracking-wide">Category</p>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase text-muted-foreground tracking-wide">Store location</p>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Weekly Sales vs Inventory</CardTitle>
              <CardDescription>Track revenue alongside simulated inventory drawdown.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loadingState ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklySalesData}
                    onClick={(data) => {
                      if (data && "activePayload" in data) {
                        const payload = data.activePayload?.[0]?.payload as (typeof weeklySalesData)[number];
                        if (payload) {
                          handleDrilldown({
                            type: "time",
                            title: `Daily breakdown · ${payload.day}`,
                            items: [
                              { label: "Sales", value: payload.sales, trend: Math.random() * 10 },
                              { label: "Inventory", value: payload.inventory, trend: -Math.random() * 6 },
                            ],
                          });
                        }
                      }
                    }}
                  >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                    <RechartTooltip
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="inventory"
                      stroke="hsl(var(--secondary-foreground))"
                      strokeWidth={2}
                    />
                </LineChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Compare category performance across stores.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loadingState ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByCategory}
                    onClick={(data) => {
                      if (data && "activePayload" in data) {
                        const payload = data.activePayload?.[0]?.payload as (typeof revenueByCategory)[number];
                        if (payload) {
                          const related = filteredRecords
                            .filter((record) => record.category === payload.category)
                            .slice(0, 6)
                            .map((record) => ({
                              label: record.detail,
                              value: record.revenue,
                              trend: Math.random() * 15,
                            }));
                          handleDrilldown({
                            type: "category",
                            title: `Category detail · ${payload.category}`,
                            items: related,
                          });
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <RechartTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Sales activity heat map</CardTitle>
              <CardDescription>Visualize demand intensity by day and hour.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingState ? (
                <Skeleton className="h-[260px] w-full rounded-lg" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground/80">
                    {DAY_SEGMENTS.map((day) => (
                      <span key={day} className="text-center font-medium">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {inventoryHeatmap.map((row) => (
                      <div key={row.day} className="space-y-1">
                        {row.hours.map((cell) => (
                          <Tooltip key={cell.hour}>
                            <TooltipTrigger asChild>
                              <div
                                className="h-12 rounded-md transition-all"
                                style={{
                                  background: `rgba(37, 99, 235, ${Math.max(cell.intensity, 0.08)})`,
                                  border: "1px solid rgba(37, 99, 235, 0.18)",
                                }}
                                onClick={() =>
                                  handleDrilldown({
                                    type: "time",
                                    title: `Hourly detail · ${row.day} @ ${cell.hour}`,
                                    items: [
                                      { label: "Orders", value: Math.round(cell.intensity * 85), trend: Math.random() * 10 },
                                      { label: "Revenue", value: Math.round(cell.intensity * 900), trend: Math.random() * 12 },
                                    ],
                                  })
                                }
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{row.day}</p>
                              <p>
                                {cell.hour} · {formatNumber(Math.round(cell.intensity * 85))} orders
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <span>Low</span>
                    <div className="h-2 w-32 rounded-full bg-gradient-to-r from-blue-100 via-blue-400 to-blue-700" />
                    <span>High</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory value by category</CardTitle>
              <CardDescription>Estimate holding value for categories.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loadingState ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={inventoryValueByCategory}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={6}
                      onClick={(data) => {
                        if (data && "name" in data.payload) {
                          const category = data.payload.name as string;
                          const items = productStats
                            .filter((stat) => stat.category === category)
                            .map((stat) => ({
                              label: stat.detail,
                              value: stat.avgPrice * (stat.totalQty + 25),
                              trend: Math.random() * 8,
                            }))
                            .slice(0, 8);
                          handleDrilldown({
                            type: "inventory",
                            title: `Inventory allocation · ${category}`,
                            items,
                          });
                        }
                      }}
                    >
                      {inventoryValueByCategory.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartTooltip
                      formatter={(value: number, _name: string, props) => {
                        const payload = props?.payload as (typeof inventoryValueByCategory)[number] | undefined;
                        const category = payload?.category ?? props?.payload?.name ?? "Category";
                        const share = inventoryValueTotal
                          ? Math.round((Number(value) / inventoryValueTotal) * 100)
                          : 0;
                        const avgQty = payload?.avgQty ?? 0;
                        return [
                          `${formatCurrency(Number(value))}`,
                          `${category} • ${share}% share · Avg daily qty ${formatNumber(Math.round(avgQty))}`,
                        ];
                      }}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit margin vs. turnover</CardTitle>
              <CardDescription>Highlight efficient menu items.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loadingState ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                    onClick={(data) => {
                      if (data && "activePayload" in data) {
                        const payload = data.activePayload?.[0]?.payload as (typeof scatterData)[number];
                        if (payload) {
                          handleDrilldown({
                            type: "product",
                            title: `Turnover detail · ${payload.name}`,
                            items: [
                              { label: "Margin", value: payload.margin, trend: payload.margin },
                              { label: "Turnover", value: payload.turnover, trend: payload.turnover },
                              { label: "Revenue", value: payload.revenue, trend: payload.revenue },
                            ],
                          });
                        }
                      }
                    }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="turnover" name="Turnover" stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="number" dataKey="margin" name="Margin" stroke="hsl(var(--muted-foreground))" />
                    <RechartTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number, name) =>
                        name === "margin" ? [`${value.toFixed(2)}%`, "Margin"] : [formatNumber(value), name]
                      }
                    />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
          <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>AI inventory intelligence</CardTitle>
                  <CardDescription>Insight blend: turnover, lead time, and margin signals.</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <BrainCircuit className="h-3 w-3" />
                  AI
                </Badge>
              </div>
          </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {aiInsights.map((insight) => {
                  const Icon = insight.icon;
                  return (
                    <button
                      key={insight.label}
                      type="button"
                      onClick={() => handleInsightClick(insight)}
                      className="group flex h-full flex-col justify-start rounded-xl border border-border/60 bg-secondary/30 p-4 text-left transition hover:border-primary/60 hover:bg-secondary/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-border bg-background p-2">
                          <Icon className="h-4 w-4 text-primary" />
                  </div>
                        <div className="space-y-1">
                          <p className="font-medium">{insight.label}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{insight.value}</p>
                  </div>
                </div>
                      <ArrowUpRight className="mt-3 h-4 w-4 self-end text-muted-foreground group-hover:text-primary" aria-hidden />
                    </button>
                  );
                })}
            </div>

              <Separator />

          </CardContent>
        </Card>
        </div>

        <Dialog open={Boolean(drilldown)} onOpenChange={(open) => !open && setDrilldown(null)}>
          <DialogContent className="sm:max-w-lg">
            {drilldown && (
              <div className="space-y-4">
                <DialogHeader className="space-y-1">
                  <DialogTitle>{drilldown.title}</DialogTitle>
                  <DialogDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                    {drilldown.type} insights
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {drilldown.items.map((item) => {
                    const shouldShowValue =
                      Number.isFinite(item.value) &&
                      !(drilldown.type === "ai" && item.value === 0 && !item.valueType);

                    const formattedValue = (() => {
                      if (!shouldShowValue) return null;
                      switch (item.valueType) {
                        case "number":
                          return formatNumber(Math.round(item.value));
                        case "percent":
                          return `${Number(item.value).toFixed(1)}%`;
                        case "currency":
                        default:
                          return formatCurrency(item.value);
                      }
                    })();

                    return (
                      <div key={item.label} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          {formattedValue && <span className="text-sm font-semibold">{formattedValue}</span>}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                        )}
                        {typeof item.trend !== "undefined" && (
                          <p className="text-xs text-muted-foreground">Δ {item.trend.toFixed(1)}% vs. prior period</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

