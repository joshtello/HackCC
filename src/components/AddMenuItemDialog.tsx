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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AddMenuItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MenuItemFormState = {
  name: string;
  price: string;
  category: string;
  description: string;
  isActive: boolean;
};

const EMPTY_FORM: MenuItemFormState = {
  name: "",
  price: "",
  category: "",
  description: "",
  isActive: true,
};

export function AddMenuItemDialog({ open, onOpenChange }: AddMenuItemDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formState, setFormState] = useState<MenuItemFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormState(EMPTY_FORM);
    }
  }, [open]);

  const handleChange =
    <Field extends keyof MenuItemFormState>(field: Field) =>
    (value: MenuItemFormState[Field]) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSubmit = async () => {
    const trimmedName = formState.name.trim();
    const trimmedCategory = formState.category.trim();
    const trimmedDescription = formState.description.trim();
    const price = Number(formState.price);

    if (!trimmedName) {
      toast({
        title: "Missing name",
        description: "Please provide a menu item name.",
        variant: "destructive",
      });
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Price must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("menu_items").insert({
        name: trimmedName,
        price,
        category: trimmedCategory || null,
        description: trimmedDescription || null,
        is_active: formState.isActive,
      });

      if (error) {
        throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
        queryClient.invalidateQueries({ queryKey: ["menu-items-with-sales"] }),
      ]);

      toast({
        title: "Menu item added",
        description: `${trimmedName} is now available on the menu.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to add menu item",
        description: error?.message || "Something went wrong while saving the menu item.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
          <DialogDescription>
            Provide the details for the new dish. You can add its recipe afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menu-item-name">Name</Label>
            <Input
              id="menu-item-name"
              placeholder="e.g. Truffle Risotto"
              value={formState.name}
              onChange={(event) => handleChange("name")(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-item-price">Price</Label>
              <Input
                id="menu-item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 24.99"
                value={formState.price}
                onChange={(event) => handleChange("price")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-item-category">Category</Label>
              <Input
                id="menu-item-category"
                placeholder="e.g. Entrée"
                value={formState.category}
                onChange={(event) => handleChange("category")(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-item-description">Description</Label>
            <Textarea
              id="menu-item-description"
              placeholder="Short description for staff and menus"
              value={formState.description}
              onChange={(event) => handleChange("description")(event.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 px-4 py-3">
            <div>
              <p className="font-medium text-foreground">Active on menu</p>
              <p className="text-sm text-muted-foreground">
                Toggle to immediately make this dish visible across dashboards.
              </p>
            </div>
            <Switch
              checked={formState.isActive}
              onCheckedChange={(value) => handleChange("isActive")(value)}
              disabled={isSubmitting}
              aria-label="Toggle menu item visibility"
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
              "Save Menu Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


