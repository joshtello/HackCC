import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIngredients } from "@/hooks/useIngredients";
import { useMenuItemRecipes } from "@/hooks/useRecipes";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AddIngredientDialog } from "@/components/AddIngredientDialog";

type RecipeDialogProps = {
  menuItem: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type RecipeIngredientRow = {
  rowId: string;
  ingredientId: string;
  quantity: string;
};

const createEmptyRow = (): RecipeIngredientRow => ({
  rowId: typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10),
  ingredientId: "",
  quantity: "",
});

export function RecipeDialog({ menuItem, open, onOpenChange }: RecipeDialogProps) {
  const { data: ingredients, isLoading: ingredientsLoading } = useIngredients();
  const {
    data: recipe,
    isLoading: recipeLoading,
    isFetching: recipeFetching,
  } = useMenuItemRecipes(menuItem?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<RecipeIngredientRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);

  const ingredientLookup = useMemo(() => {
    return new Map((ingredients || []).map((item) => [item.id, item]));
  }, [ingredients]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (recipe && recipe.length > 0) {
      setRows(
        recipe.map((entry) => ({
          rowId: entry.id,
          ingredientId: entry.ingredient_id,
          quantity: String(entry.quantity_needed ?? ""),
        })),
      );
      return;
    }

    if (recipe && recipe.length === 0) {
      setRows([createEmptyRow()]);
    }
  }, [open, recipe]);

  const handleRowChange = (rowId: string, patch: Partial<RecipeIngredientRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((row) => row.rowId !== rowId);
    });
  };

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRows([createEmptyRow()]);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!menuItem) return;

    const cleanedRows = rows.map((row) => ({
      rowId: row.rowId,
      ingredientId: row.ingredientId.trim(),
      quantity: row.quantity.trim(),
    }));

    const isMissingField = cleanedRows.some(
      (row) => !row.ingredientId || !row.quantity,
    );

    if (isMissingField) {
      toast({
        title: "Recipe incomplete",
        description: "Select an ingredient and quantity for each row.",
        variant: "destructive",
      });
      return;
    }

    const parsedRows = cleanedRows.map((row) => ({
      ingredientId: row.ingredientId,
      quantity: Number(row.quantity),
    }));

    const hasInvalidQuantity = parsedRows.some(
      (row) => Number.isNaN(row.quantity) || row.quantity <= 0,
    );

    if (hasInvalidQuantity) {
      toast({
        title: "Invalid quantities",
        description: "Quantity per menu item must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    const ingredientIds = parsedRows.map((row) => row.ingredientId);
    const hasDuplicate = new Set(ingredientIds).size !== ingredientIds.length;

    if (hasDuplicate) {
      toast({
        title: "Duplicate ingredients",
        description: "Each ingredient can only appear once in the recipe.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const deleteResult = await supabase
        .from("recipes")
        .delete()
        .eq("menu_item_id", menuItem.id);

      if (deleteResult.error) {
        throw deleteResult.error;
      }

      if (parsedRows.length > 0) {
        const insertPayload = parsedRows.map((row) => ({
          menu_item_id: menuItem.id,
          ingredient_id: row.ingredientId,
          quantity_needed: row.quantity,
        }));

        const insertResult = await supabase
          .from("recipes")
          .insert(insertPayload);

        if (insertResult.error) {
          throw insertResult.error;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["recipes", menuItem.id] });
      await queryClient.invalidateQueries({ queryKey: ["ingredients"] });

      toast({
        title: "Recipe saved",
        description: "Inventory will update automatically when sales are recorded.",
      });

      resetAndClose(false);
    } catch (error: any) {
      toast({
        title: "Unable to save recipe",
        description: error?.message || "Something went wrong while saving the recipe.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoadingState = ingredientsLoading || recipeLoading || recipeFetching;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {menuItem ? `Recipe for ${menuItem.name}` : "Recipe"}
          </DialogTitle>
          <DialogDescription>
            Define the ingredients and quantities required each time this menu item is sold.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingState ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-muted-foreground/20 bg-secondary/20 p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Missing an ingredient?</p>
                  <p className="text-xs text-muted-foreground">
                    Add it to your inventory without leaving this page.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setIsAddIngredientOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Ingredient
                </Button>
              </div>

              {rows.map((row, index) => {
                const ingredient = ingredientLookup.get(row.ingredientId);
                return (
                  <div
                    key={row.rowId}
                    className="grid gap-3 rounded-lg border border-dashed border-muted-foreground/20 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_auto]"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`ingredient-${row.rowId}`} className="text-xs uppercase text-muted-foreground">
                        Ingredient
                      </Label>
                      <Select
                        value={row.ingredientId}
                        onValueChange={(value) =>
                          handleRowChange(row.rowId, { ingredientId: value })
                        }
                      >
                        <SelectTrigger id={`ingredient-${row.rowId}`}>
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {(ingredients || []).map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${row.rowId}`} className="text-xs uppercase text-muted-foreground">
                        Quantity per dish
                      </Label>
                      <Input
                        id={`quantity-${row.rowId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 0.5"
                        value={row.quantity}
                        onChange={(event) =>
                          handleRowChange(row.rowId, { quantity: event.target.value })
                        }
                      />
                      {ingredient && (
                        <p className="text-xs text-muted-foreground">
                          Unit: {ingredient.unit}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(row.rowId)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">
                          Remove ingredient row {index + 1}
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRow}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Ingredient
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => resetAndClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingState}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Recipe"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <AddIngredientDialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen} />
    </Dialog>
  );
}


