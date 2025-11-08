-- Fix search_path security issue for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path security issue for update_inventory_after_sale function
CREATE OR REPLACE FUNCTION public.update_inventory_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduct ingredients based on recipe
  UPDATE public.ingredients
  SET current_quantity = current_quantity - (r.quantity_needed * NEW.quantity_sold)
  FROM public.recipes r
  WHERE r.ingredient_id = public.ingredients.id
    AND r.menu_item_id = NEW.menu_item_id;
  
  RETURN NEW;
END;
$$;