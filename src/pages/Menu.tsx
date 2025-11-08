import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, TrendingUp, TrendingDown, Loader2, PencilLine, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMenuItemWithSales } from "@/hooks/useMenuItems";
import { RecipeDialog } from "@/components/RecipeDialog";
import { AddMenuItemDialog } from "@/components/AddMenuItemDialog";

export default function Menu() {
  const { data: menuItems, isLoading } = useMenuItemWithSales();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeMenuItem, setActiveMenuItem] = useState<{ id: string; name: string } | null>(null);
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, { name: string; price: string }>>({});
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const sortedItems = useMemo(
    () => menuItems?.slice().sort((a, b) => b.sales - a.sales) || [],
    [menuItems],
  );
  const bestSeller = sortedItems[0]?.id;
  const leastSeller = sortedItems[sortedItems.length - 1]?.id;

  useEffect(() => {
    if (!isEditing) {
      setEditedValues({});
      return;
    }

    const initialValues = sortedItems.reduce<Record<string, { name: string; price: string }>>(
      (acc, item) => {
        acc[item.id] = {
          name: item.name ?? "",
          price: Number(item.price ?? 0).toFixed(2),
        };
        return acc;
      },
      {},
    );
    setEditedValues(initialValues);
  }, [isEditing, sortedItems]);

  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    setIsEditing(true);
  };

  const handleEditChange = (id: string, field: "name" | "price", value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { name: "", price: "" }),
        [field]: value,
      },
    }));
  };

  const handleSaveEdits = async () => {
    if (!menuItems) {
      return;
    }

    const updates = sortedItems
      .map((item) => {
        const edits = editedValues[item.id];
        if (!edits) return null;

        const trimmedName = edits.name.trim();
        const priceNumber = Number(edits.price);

        return {
          id: item.id,
          originalName: item.name,
          originalPrice: Number(item.price ?? 0),
          name: trimmedName,
          price: priceNumber,
        };
      })
      .filter(
        (entry): entry is {
          id: string;
          originalName: string;
          originalPrice: number;
          name: string;
          price: number;
        } => entry !== null,
      );

    for (const entry of updates) {
      if (!entry.name) {
        toast({
          title: "Name required",
          description: "Menu item name cannot be empty.",
          variant: "destructive",
        });
        return;
      }

      if (Number.isNaN(entry.price) || entry.price <= 0) {
        toast({
          title: "Invalid price",
          description: "Provide a price greater than zero.",
          variant: "destructive",
        });
        return;
      }
    }

    const changed = updates.filter(
      (entry) =>
        entry.name !== entry.originalName || Number(entry.price.toFixed(2)) !== Number(entry.originalPrice.toFixed(2)),
    );

    if (changed.length === 0) {
      toast({
        title: "No changes detected",
        description: "Update a name or price before saving.",
      });
      return;
    }

    setIsSavingEdits(true);

    try {
      for (const entry of changed) {
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: entry.name,
            price: entry.price,
          })
          .eq("id", entry.id);

        if (error) {
          throw error;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["menu-items-with-sales"] });
      await queryClient.invalidateQueries({ queryKey: ["menu-items"] });

      toast({
        title: "Menu updated",
        description: "Name and price changes saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Unable to save edits",
        description: error?.message || "Something went wrong while updating menu items.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdits(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
            <p className="text-muted-foreground mt-1">Manage your menu items and recipes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isEditing ? "secondary" : "outline"}
              className="gap-2"
              onClick={handleEditToggle}
              disabled={isSavingEdits}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PencilLine className="h-4 w-4" />
                  Edit Menu Items
                </>
              )}
            </Button>
            {isEditing ? (
              <Button type="button" className="gap-2" onClick={handleSaveEdits} disabled={isSavingEdits}>
                {isSavingEdits ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            ) : null}
            <Button className="gap-2" onClick={() => setIsAddMenuItemOpen(true)} disabled={isEditing || isSavingEdits}>
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>View and manage all your menu items</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Price</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input
                          value={editedValues[item.id]?.name ?? ""}
                          onChange={(event) => handleEditChange(item.id, "name", event.target.value)}
                          disabled={isSavingEdits}
                          placeholder="Menu item name"
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editedValues[item.id]?.price ?? ""}
                          onChange={(event) => handleEditChange(item.id, "price", event.target.value)}
                          className="text-center"
                          disabled={isSavingEdits}
                          placeholder="0.00"
                        />
                      ) : (
                        `$${Number(item.price).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {index < sortedItems.length / 2 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-warning" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.id === bestSeller && (
                        <Badge variant="default">Best Seller</Badge>
                      )}
                      {item.id === leastSeller && sortedItems.length > 1 && (
                        <Badge variant="secondary">Least Seller</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMenuItem({ id: item.id, name: item.name })}
                        disabled={isEditing}
                      >
                        Add Recipe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <RecipeDialog
        open={Boolean(activeMenuItem)}
        menuItem={activeMenuItem}
        onOpenChange={(open) => {
          if (!open) {
            setActiveMenuItem(null);
          }
        }}
      />
      <AddMenuItemDialog
        open={isAddMenuItemOpen}
        onOpenChange={setIsAddMenuItemOpen}
      />
    </DashboardLayout>
  );
}
