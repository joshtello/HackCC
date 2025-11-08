-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  current_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  threshold_quantity DECIMAL(10, 2) NOT NULL,
  cost_per_unit DECIMAL(10, 2) NOT NULL,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipes table (many-to-many relationship between menu_items and ingredients)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

-- Create sales_records table
CREATE TABLE public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_recipes_menu_item ON public.recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient ON public.recipes(ingredient_id);
CREATE INDEX idx_sales_menu_item ON public.sales_records(menu_item_id);
CREATE INDEX idx_sales_date ON public.sales_records(sale_date);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - will add auth later)
CREATE POLICY "Allow all operations on menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sales_records" ON public.sales_records FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically update ingredient quantities after sales
CREATE OR REPLACE FUNCTION public.update_inventory_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct ingredients based on recipe
  UPDATE public.ingredients
  SET current_quantity = current_quantity - (r.quantity_needed * NEW.quantity_sold)
  FROM public.recipes r
  WHERE r.ingredient_id = public.ingredients.id
    AND r.menu_item_id = NEW.menu_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to update inventory when sales are recorded
CREATE TRIGGER update_inventory_on_sale
  AFTER INSERT ON public.sales_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_after_sale();