import { OrderCard, OrderSuggestion } from "@/components/ui/OrderCard";

type OrderListProps = {
  items: OrderSuggestion[];
  emptyMessage?: string;
};

export function OrderList({ items, emptyMessage = "All stocked up! No orders needed right now." }: OrderListProps) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {items.map((item) => (
        <OrderCard key={item.ingredient} suggestion={item} />
      ))}
    </div>
  );
}


