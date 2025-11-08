import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Package, ShoppingCart, Loader2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useWeeklySalesData } from "@/hooks/useSalesRecords";
import { useIngredients, useLowStockIngredients } from "@/hooks/useIngredients";

export default function Analytics() {
  const { data: weeklyData, isLoading: loadingWeekly } = useWeeklySalesData();
  const { data: lowStockItems } = useLowStockIngredients();
  const { data: ingredients } = useIngredients();

  if (loadingWeekly) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Mock monthly data for now
  const monthlyData = [
    { month: "Week 1", revenue: Math.round((weeklyData?.[0]?.sales || 0) * 7) },
    { month: "Week 2", revenue: Math.round((weeklyData?.[1]?.sales || 0) * 7) },
    { month: "Week 3", revenue: Math.round((weeklyData?.[2]?.sales || 0) * 7) },
    { month: "Week 4", revenue: Math.round((weeklyData?.[3]?.sales || 0) * 7) },
  ];

  const totalInventoryValue = ingredients?.reduce((sum, item) => 
    sum + (Number(item.current_quantity) * Number(item.cost_per_unit)), 0
  ) || 0;

  const insights = [
    {
      title: "Low Stock Alert",
      description: `${lowStockItems?.length || 0} items need restocking. Check inventory tab for details.`,
      icon: AlertTriangle,
      color: lowStockItems && lowStockItems.length > 0 ? "text-destructive" : "text-success",
    },
    {
      title: "Weekly Revenue",
      description: `Total weekly sales: $${weeklyData?.reduce((sum, day) => sum + day.sales, 0) || 0}`,
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Inventory Value",
      description: `Current stock value: $${totalInventoryValue.toFixed(2)}. Monitor closely.`,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Best Selling Day",
      description: `${weeklyData?.reduce((max, day) => day.sales > (max?.sales || 0) ? day : max, weeklyData[0])?.day || 'N/A'} has the highest sales this week.`,
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">AI-powered insights and trends</p>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Sales vs Inventory</CardTitle>
              <CardDescription>Track sales performance and inventory depletion</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }} 
                  />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue growth over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }} 
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Insights</CardTitle>
            <CardDescription>Smart recommendations based on your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((insight) => (
                <div key={insight.title} className="flex gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className={`h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0 ${insight.color}`}>
                    <insight.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
