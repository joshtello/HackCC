import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Package, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLowStockIngredients, useIngredients } from "@/hooks/useIngredients";
import { useMenuItems, useMenuItemWithSales } from "@/hooks/useMenuItems";
import { useTopSellersFromExcel } from "@/hooks/useTopSellersFromExcel";
import { useState } from "react";
import { useSalesBasedPrediction } from "@/hooks/useSalesBasedPrediction";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const { data: lowStockItems, isLoading: loadingLowStock } = useLowStockIngredients();
  const { data: ingredients, isLoading: loadingIngredients } = useIngredients();
  const { data: menuItems, isLoading: loadingMenu } = useMenuItems();
  const { data: menuWithSales, isLoading: loadingSales } = useMenuItemWithSales();
  const { data: excelTopSellers, isLoading: loadingExcelTop } = useTopSellersFromExcel(7);

  const inventoryValue = Math.max(
    (ingredients ?? []).reduce((sum, item) => {
      const quantity = Math.max(Number(item.current_quantity) || 0, 0);
      const cost = Math.max(Number(item.cost_per_unit) || 0, 0);
      return sum + quantity * cost;
    }, 0),
    0,
  );

  const stats = [
    {
      title: "Low Stock Items",
      value: loadingLowStock ? "..." : String(lowStockItems?.length || 0),
      change: "Need immediate attention",
      icon: AlertCircle,
      variant: "destructive" as const,
    },
    {
      title: "Total Menu Items",
      value: loadingMenu ? "..." : String(menuItems?.length || 0),
      change: "Active items",
      icon: TrendingUp,
      variant: "success" as const,
    },
    {
      title: "Inventory Value",
      value: loadingIngredients
        ? "..."
        : `$${inventoryValue.toFixed(0)}`,
      change: "Current stock value",
      icon: Package,
      variant: "default" as const,
    },
  ];

  const topSellers = (excelTopSellers || []).map((item, index) => ({
    name: item.name,
    sales: item.sales,
    trend: index < 2 ? "up" : "down"
  }));

  // Sales-based inventory prediction
  const [dateRange, setDateRange] = useState("1");
  const daysMap: { [key: string]: number } = {
    "1": 1,
    "3": 3,
    "7": 7,
    "30": 30
  };
  const days = daysMap[dateRange] || 1;
  const { data: predictedItems, isLoading: predicting, error: predictionError } = useSalesBasedPrediction(days);

  if (loadingLowStock || loadingMenu || loadingSales) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: visible;
              font-size: 12px;
            }
            .DashboardLayout > *:not(.InventoryPrediction) {
              display: none;
            }
            .InventoryPrediction {
              display: block;
              width: 100%;
              height: auto;
              padding: 0;
            }
          }
        `}
      </style>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary text-white rounded-md shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Print Report
          </button>
        </div>

        <div>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your inventory overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${
                  stat.variant === "destructive" ? "text-destructive" :
                  stat.variant === "success" ? "text-success" :
                  "text-muted-foreground"
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          {/* Inventory Prediction */}
          <Card className="border-primary/50 InventoryPrediction">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Inventory Prediction
              </CardTitle>
              <CardDescription>Forecasting based on past 30 days sales from Coffee Shop Sales.xlsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="date-range" className="text-sm font-medium text-foreground">Select Date Range:</label>
                  <select
                    id="date-range"
                    className="p-2 border rounded-md"
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value)}
                  >
                    <option value="1">Next 1 Day</option>
                    <option value="3">Next 3 Days</option>
                    <option value="7">Next 7 Days</option>
                    <option value="30">Next 30 Days</option>
                  </select>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Predicted Inventory:</p>
                  {predictionError && (
                    <div className="text-red-500 text-sm mb-2">{predictionError.message || "Prediction failed"}</div>
                  )}
                  {predicting ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" /> Predicting...
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-center">Unit</TableHead>
                          <TableHead className="text-center">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {predictedItems && predictedItems.length > 0 ? (
                          predictedItems.sort((a, b) => b.quantity - a.quantity).map((item, idx) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-center">{item.unit}</TableCell>
                              <TableCell className="text-center">{item.price !== undefined ? `$${item.price.toFixed(2)}` : '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              No prediction data available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-4 text-right">
                    <p className="text-sm font-medium text-foreground">
                      Total Cost: ${(predictedItems || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Sellers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Top Sellers This Week
              </CardTitle>
              <CardDescription>Your best performing menu items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingExcelTop ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading top sellers...</div>
                ) : topSellers.length > 0 ? (
                  topSellers.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.sales} sales</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No top sellers this week!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
