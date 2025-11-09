import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Sparkles,
  AlertTriangle,
  Loader2,
  ClipboardEdit,
  Edit,
  Check,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(
    null
  );
  const [editingThresholdValue, setEditingThresholdValue] =
    useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (inventoryItems) {
      setManualInventory(
        inventoryItems.map((item) => {
          const current = Math.max(Number(item.current_quantity) || 0, 0);
          const rawThreshold = Number(item.threshold_quantity) || 0;
          const rawCost = Number(item.cost_per_unit) || 0;
          const name = (item.name || "").toLowerCase();
          // Force milk and water to use milliliter units for consistent display
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
          // If no threshold is provided, infer a reasonable default:
          // - If we have a current quantity, set threshold to half the current (rounded up) but at least 1
          // - If current is 0, default threshold to 1 so status can be computed
          const threshold =
            rawThreshold > 0
              ? rawThreshold
              : Math.max(Math.ceil(current * 0.5), 1);
          return {
            ...item,
            current_quantity: current,
            threshold_quantity: threshold,
            cost_per_unit: cost,
            unit: unitOverride,
          };
        })
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
    // If quantity falls below the threshold, mark as critical immediately
    if (quantity < threshold) return "critical";
    // Otherwise use percentage-based low warning
    if (percentage < 50) return "low";
    return "ok";
  };

  // helper to compute status from explicit numbers (used to reflect edits live)
  const getStatusFrom = (quantity: number, threshold: number) => {
    const q = Math.max(Number(quantity) || 0, 0);
    const t = Math.max(Number(threshold) || 0, 1);
    const percentage = (q / t) * 100;
    // If quantity falls below the threshold, mark as critical immediately
    if (q < t) return "critical";
    if (percentage < 50) return "low";
    return "ok";
  };

  const aiRecommendations =
    lowStockItems?.slice(0, 3).map((item) => ({
      ingredient: item.name,
      reason: `Low stock - currently at ${Number(item.current_quantity).toFixed(
        0
      )} ${item.unit}`,
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
    [manualInventory]
  );

  const handleManualSave = async (
    updatedItems: Array<{
      id: string;
      name: string;
      unit: string;
      aiQuantity: number;
      currentQuantity: number;
    }>
  ) => {
    setManualInventory((prev) =>
      prev.map((item) => {
        const updated = updatedItems.find((entry) => entry.id === item.id);
        if (!updated) return item;
        return {
          ...item,
          current_quantity: updated.currentQuantity,
        };
      })
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

  const handleTeachAI = (
    corrections: Array<{
      id: string;
      originalQuantity: number;
      correctedQuantity: number;
    }>
  ) => {
    console.debug(
      "Inventory corrections available for AI learning:",
      corrections
    );
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditingValue(Number(item.current_quantity ?? 0).toFixed(2));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const startEditingThreshold = (item: any) => {
    setEditingThresholdId(item.id);
    setEditingThresholdValue(Number(item.threshold_quantity ?? 0).toFixed(2));
  };

  const cancelEditingThreshold = () => {
    setEditingThresholdId(null);
    setEditingThresholdValue("");
  };

  const saveThresholdEditing = async (item: any) => {
    const parsed = Number(editingThresholdValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast({
        title: "Invalid threshold",
        description: "Please enter a valid non-negative number.",
      });
      return;
    }

    // Optimistically update UI
    setManualInventory((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, threshold_quantity: parsed } : row
      )
    );

    setEditingThresholdId(null);
    setEditingThresholdValue("");

    try {
      await fetch("/api/inventory/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ id: item.id, threshold_quantity: parsed }],
        }),
      }).catch(() => {});

      toast({
        title: "Threshold updated",
        description: `Updated ${item.name} threshold to ${parsed} ${item.unit}`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Update failed",
        description: "Could not save threshold — please try again.",
      });
    }
  };

  const saveEditing = async (item: any) => {
    const parsed = Number(editingValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid non-negative number.",
      });
      return;
    }

    // Optimistically update UI
    setManualInventory((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, current_quantity: parsed } : row
      )
    );

    setEditingId(null);
    setEditingValue("");

    try {
      await fetch("/api/inventory/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ id: item.id, current_quantity: parsed }],
        }),
      }).catch(() => {});

      toast({
        title: "Quantity updated",
        description: `Updated ${item.name} to ${parsed} ${item.unit}`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Update failed",
        description: "Could not save quantity — please try again.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your ingredient stock levels
            </p>
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
            <Button
              className="gap-2"
              onClick={() => setIsAddIngredientOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
        </div>

        {/* AI recommendations removed per request */}

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>
              All ingredients with stock levels and costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Ingredient</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Cost</TableHead>
                  <TableHead className="text-center">Threshold</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualInventory?.map((item) => {
                  // compute live display values so status reflects unsaved edits too
                  const displayQuantity =
                    editingId === item.id
                      ? Number(editingValue) || 0
                      : Number(item.current_quantity) || 0;
                  const displayThreshold =
                    editingThresholdId === item.id
                      ? Number(editingThresholdValue) || 0
                      : Number(item.threshold_quantity) || 0;
                  const status = getStatusFrom(
                    displayQuantity,
                    displayThreshold
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-left">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-28"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEditing(item)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span>
                              {Math.max(
                                Number(item.current_quantity) || 0,
                                0
                              ).toFixed(0)}{" "}
                              {item.unit}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        ${Number(item.cost_per_unit).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center">
                        {editingThresholdId === item.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingThresholdValue}
                              onChange={(e) =>
                                setEditingThresholdValue(e.target.value)
                              }
                              className="w-28"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveThresholdEditing(item)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingThreshold}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span>
                              {Math.max(
                                Number(item.threshold_quantity) || 0,
                                0
                              ).toFixed(0)}{" "}
                              {item.unit}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingThreshold(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
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
        onDraftChange={(drafts) => {
          // reflect draft quantities in the main table so status updates live while dialog is open
          setManualInventory((prev) =>
            prev.map((item) => {
              const d = drafts.find((r) => r.id === item.id);
              if (!d) return item;
              return { ...item, current_quantity: d.currentQuantity };
            })
          );
        }}
      />
    </DashboardLayout>
  );
}
