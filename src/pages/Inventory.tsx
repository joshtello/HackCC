import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIngredients, useLowStockIngredients } from "@/hooks/useIngredients";

export default function Inventory() {
  const { data: inventoryItems, isLoading } = useIngredients();
  const { data: lowStockItems } = useLowStockIngredients();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const getStatus = (item: any) => {
    const percentage = (item.current_quantity / item.threshold_quantity) * 100;
    if (percentage < 30) return "critical";
    if (percentage < 50) return "low";
    return "ok";
  };

  const aiRecommendations = lowStockItems?.slice(0, 3).map(item => ({
    ingredient: item.name,
    reason: `Low stock - currently at ${Number(item.current_quantity).toFixed(0)} ${item.unit}`,
    recommended: `${Math.ceil(item.threshold_quantity * 1.5)} ${item.unit}`
  })) || [];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Track and manage your ingredient stock levels</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ingredient
          </Button>
        </div>

        {/* AI Recommendations */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Reorder Recommendations
            </CardTitle>
            <CardDescription>Smart suggestions for trending dishes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiRecommendations.map((rec) => (
                <div key={rec.ingredient} className="flex items-start justify-between p-4 bg-background rounded-lg border border-primary/20">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{rec.ingredient}</p>
                    <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{rec.recommended}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Add to Order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>All ingredients with stock levels and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems?.map((item) => {
                  const status = getStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {Number(item.current_quantity).toFixed(0)} {item.unit}
                      </TableCell>
                      <TableCell>${Number(item.cost_per_unit).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {Number(item.threshold_quantity).toFixed(0)} {item.unit}
                      </TableCell>
                      <TableCell>
                        {status === "critical" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </Badge>
                        )}
                        {status === "low" && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        )}
                        {status === "ok" && (
                          <Badge variant="outline">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
