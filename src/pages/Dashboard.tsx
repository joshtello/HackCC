import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Package, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLowStockIngredients, useIngredients } from "@/hooks/useIngredients";
import { useMenuItems, useMenuItemWithSales } from "@/hooks/useMenuItems";

export default function Dashboard() {
  const { data: lowStockItems, isLoading: loadingLowStock } = useLowStockIngredients();
  const { data: ingredients, isLoading: loadingIngredients } = useIngredients();
  const { data: menuItems, isLoading: loadingMenu } = useMenuItems();
  const { data: menuWithSales, isLoading: loadingSales } = useMenuItemWithSales();

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

  const topSellers = menuWithSales
    ?.sort((a, b) => b.sales - a.sales)
    .slice(0, 3)
    .map((item, index) => ({
      name: item.name,
      sales: item.sales,
      trend: index < 2 ? "up" : "down"
    })) || [];

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
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Low Stock Alert */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items that need immediate restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems && lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(item.current_quantity).toFixed(0)} {item.unit} / {Number(item.threshold_quantity).toFixed(0)} {item.unit}
                        </p>
                      </div>
                      <Badge variant="destructive">Low</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">All items are well stocked!</p>
                )}
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
                {topSellers.length > 0 ? (
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
                      {item.trend === "up" ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-warning" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No sales data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
