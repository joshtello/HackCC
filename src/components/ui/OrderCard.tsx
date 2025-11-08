import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type UrgencyLevel = "urgent" | "soon" | "stable";

export type OrderSuggestion = {
  ingredient: string;
  recommendedReorder: number;
  cost: number;
  note: string;
  urgency: UrgencyLevel;
};

const URGENCY_MAP: Record<
  UrgencyLevel,
  {
    label: string;
    icon: string;
    badgeVariant: "destructive" | "secondary" | "outline";
  }
> = {
  urgent: {
    label: "Urgent",
    icon: "🔴",
    badgeVariant: "destructive",
  },
  soon: {
    label: "Low stock soon",
    icon: "🟡",
    badgeVariant: "secondary",
  },
  stable: {
    label: "Stable",
    icon: "🟢",
    badgeVariant: "outline",
  },
};

type OrderCardProps = {
  suggestion: OrderSuggestion;
};

export function OrderCard({ suggestion }: OrderCardProps) {
  const meta = URGENCY_MAP[suggestion.urgency] ?? URGENCY_MAP.stable;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          {meta.icon} {suggestion.ingredient}
        </CardTitle>
        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quantity to order</p>
            <p className="mt-1 text-base font-medium text-foreground">
              {Intl.NumberFormat().format(suggestion.recommendedReorder)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated cost</p>
            <p className="mt-1 text-base font-medium text-foreground">
              {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                suggestion.cost,
              )}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
            <p className="mt-1 text-base font-medium text-foreground">{suggestion.note}</p>
          </div>
        </div>
        <Separator />
        <CardDescription className="text-xs text-muted-foreground">
          Friendly reminder: adjust quantities if your supplier packs items differently.
        </CardDescription>
      </CardContent>
    </Card>
  );
}


