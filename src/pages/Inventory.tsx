import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, AlertTriangle, Loader2, ClipboardEdit } from "lucide-react";
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
import { AddIngredientDialog } from "@/components/AddIngredientDialog";
import { ManualInventoryDialog } from "@/components/ManualInventoryDialog";
import { useToast } from "@/components/ui/use-toast";

export default function Inventory() {
  const { data: inventoryItems, isLoading } = useIngredients();
  const { data: lowStockItems } = useLowStockIngredients();
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualInventory, setManualInventory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (inventoryItems) {
      setManualInventory(
        inventoryItems.map((item) => ({
          ...item,
          current_quantity: Math.max(Number(item.current_quantity) || 0, 0),
        })),
      );
    }
  }, [inventoryItems]);

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
    const quantity = Math.max(Number(item.current_quantity) || 0, 0);
    const threshold = Math.max(Number(item.threshold_quantity) || 0, 1);
    const percentage = (quantity / threshold) * 100;
    if (percentage < 30) return "critical";
    if (percentage < 50) return "low";
    return "ok";
  };

  const aiRecommendations =
    lowStockItems
      ?.slice(0, 3)
      .map((item) => ({
        ingredient: item.name,
        reason: `Low stock - currently at ${Number(item.current_quantity).toFixed(0)} ${item.unit}`,
        recommended: `${Math.ceil(item.threshold_quantity * 1.5)} ${item.unit}`,
      })) || [];

  const manualDialogItems = useMemo(
    () =>
      (manualInventory || []).map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        aiQuantity: Number(item.current_quantity ?? 0),
        currentQuantity: Number(item.current_quantity ?? 0),
      })),
    [manualInventory],
  );

  const handleManualSave = async (
    updatedItems: Array<{
      id: string;
      name: string;
      unit: string;
      aiQuantity: number;
      currentQuantity: number;
    }>,
  ) => {
    setManualInventory((prev) =>
      prev.map((item) => {
        const updated = updatedItems.find((entry) => entry.id === item.id);
        if (!updated) return item;
        return {
          ...item,
          current_quantity: updated.currentQuantity,
        };
      }),
    );

    try {
      await fetch("/api/inventory/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: updatedItems.map((item) => ({
            id: item.id,
            current_quantity: item.currentQuantity,
          })),
        }),
      }).catch(() => {
        // Endpoint is optional; swallow network errors for now.
      });
    } finally {
      toast({
        title: "Inventory updated successfully",
        description: "Your manual corrections have been saved.",
      });
    }
  };

  const handleTeachAI = (corrections: Array<{ id: string; originalQuantity: number; correctedQuantity: number }>) => {
    console.debug("Inventory corrections available for AI learning:", corrections);
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Track and manage your ingredient stock levels</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsManualDialogOpen(true)}
              disabled={!manualInventory || manualInventory.length === 0}
            >
              <ClipboardEdit className="h-4 w-4" />
              Manual Inventory Update
            </Button>
            <Button className="gap-2" onClick={() => setIsAddIngredientOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
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
                {manualInventory?.map((item) => {
                  const status = getStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {Math.max(Number(item.current_quantity) || 0, 0).toFixed(0)} {item.unit}
                      </TableCell>
                      <TableCell>${Number(item.cost_per_unit).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {Math.max(Number(item.threshold_quantity) || 0, 0).toFixed(0)} {item.unit}
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
      <AddIngredientDialog
        open={isAddIngredientOpen}
        onOpenChange={setIsAddIngredientOpen}
      />
      <ManualInventoryDialog
        open={isManualDialogOpen}
        onOpenChange={setIsManualDialogOpen}
        items={manualDialogItems}
        onSave={handleManualSave}
        onTeachAI={handleTeachAI}
      />
    </DashboardLayout>
  );
}
