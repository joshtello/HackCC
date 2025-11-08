-- Ensure ingredient quantities never drop below zero after recording sales
CREATE OR REPLACE FUNCTION public.update_inventory_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ingredients
  SET current_quantity = GREATEST(
      0,
      current_quantity - (r.quantity_needed * NEW.quantity_sold)
    )
  FROM public.recipes r
  WHERE r.ingredient_id = public.ingredients.id
    AND r.menu_item_id = NEW.menu_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


