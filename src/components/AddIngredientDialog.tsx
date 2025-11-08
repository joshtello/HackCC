import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AddIngredientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type IngredientFormState = {
  name: string;
  unit: string;
  currentQuantity: string;
  thresholdQuantity: string;
  costPerUnit: string;
  supplier: string;
};

const EMPTY_FORM: IngredientFormState = {
  name: "",
  unit: "",
  currentQuantity: "",
  thresholdQuantity: "",
  costPerUnit: "",
  supplier: "",
};

export function AddIngredientDialog({ open, onOpenChange }: AddIngredientDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<IngredientFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormState(EMPTY_FORM);
    }
  }, [open]);

  const handleChange = (field: keyof IngredientFormState) => (value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = formState.name.trim();
    const trimmedUnit = formState.unit.trim();
    const trimmedSupplier = formState.supplier.trim();

    if (!trimmedName || !trimmedUnit) {
      toast({
        title: "Missing required fields",
        description: "Ingredient name and unit are required.",
        variant: "destructive",
      });
      return;
    }

    const currentQuantity = Number(formState.currentQuantity);
    const thresholdQuantity = Number(formState.thresholdQuantity);
    const costPerUnit = Number(formState.costPerUnit);

    if (
      Number.isNaN(currentQuantity) ||
      Number.isNaN(thresholdQuantity) ||
      Number.isNaN(costPerUnit) ||
      currentQuantity < 0 ||
      thresholdQuantity <= 0 ||
      costPerUnit <= 0
    ) {
      toast({
        title: "Invalid numbers",
        description: "Quantities and cost must be valid positive numbers.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("ingredients").insert({
        name: trimmedName,
        unit: trimmedUnit,
        current_quantity: currentQuantity,
        threshold_quantity: thresholdQuantity,
        cost_per_unit: costPerUnit,
        supplier: trimmedSupplier || null,
      });

      if (error) {
        throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock-ingredients"] }),
      ]);

      toast({
        title: "Ingredient added",
        description: `${trimmedName} is now part of your inventory.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to add ingredient",
        description: error?.message || "Something went wrong while adding the ingredient.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Ingredient</DialogTitle>
          <DialogDescription>
            Add a new ingredient to your inventory. Quantities should reflect your current stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ingredient-name">Ingredient name</Label>
              <Input
                id="ingredient-name"
                placeholder="e.g. Chicken Breast"
                value={formState.name}
                onChange={(event) => handleChange("name")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-unit">Unit</Label>
              <Input
                id="ingredient-unit"
                placeholder="e.g. kg, pcs, ml"
                value={formState.unit}
                onChange={(event) => handleChange("unit")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ingredient-current">Current quantity</Label>
              <Input
                id="ingredient-current"
                type="number"
                min="0"
                step="0.01"
                value={formState.currentQuantity}
                onChange={(event) => handleChange("currentQuantity")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-threshold">Threshold quantity</Label>
              <Input
                id="ingredient-threshold"
                type="number"
                min="0"
                step="0.01"
                value={formState.thresholdQuantity}
                onChange={(event) => handleChange("thresholdQuantity")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-cost">Cost per unit</Label>
              <Input
                id="ingredient-cost"
                type="number"
                min="0"
                step="0.01"
                value={formState.costPerUnit}
                onChange={(event) => handleChange("costPerUnit")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredient-supplier">Supplier (optional)</Label>
            <Input
              id="ingredient-supplier"
              placeholder="e.g. Acme Foods Co."
              value={formState.supplier}
              onChange={(event) => handleChange("supplier")(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Ingredient"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


