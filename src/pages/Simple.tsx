import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { OrderList } from "@/components/ui/OrderList";
import type { OrderSuggestion } from "@/components/ui/OrderCard";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ApiOrderSuggestion = {
  ingredient: string;
  recommendedReorder: number | string;
  cost: number | string;
  note: string;
  urgency?: string;
};

const URGENCY_MAP: Record<string, OrderSuggestion["urgency"]> = {
  urgent: "urgent",
  high: "urgent",
  soon: "soon",
  medium: "soon",
  low: "stable",
  stable: "stable",
};

function normalizeSuggestion(entry: ApiOrderSuggestion): OrderSuggestion | null {
  if (!entry?.ingredient) {
    return null;
  }

  const recommended = Number(entry.recommendedReorder);
  const cost = Number(entry.cost);
  const urgencyKey = (entry.urgency || "").toLowerCase();

  return {
    ingredient: entry.ingredient,
    recommendedReorder: Number.isFinite(recommended) ? recommended : 0,
    cost: Number.isFinite(cost) ? cost : 0,
    note: entry.note || "Restock recommended.",
    urgency: URGENCY_MAP[urgencyKey] ?? "soon",
  };
}

export default function Simple() {
  const MOCK_SUGGESTIONS: OrderSuggestion[] = [
    {
      ingredient: "☕ Ethiopia Rg (Gourmet Brewed Coffee)",
      recommendedReorder: 18,
      cost: 54,
      note: "Morning commuters keep ordering our Ethiopia roast — top up to cover the weekday rush.",
      urgency: "urgent",
    },
    {
      ingredient: "🫖 Spicy Eye Opener Chai Lg",
      recommendedReorder: 24,
      cost: 74.4,
      note: "Chai sales spiked during chilly afternoons; reorder now to stay ahead of the demand.",
      urgency: "soon",
    },
    {
      ingredient: "🍫 Dark Chocolate Hot Cocoa Lg",
      recommendedReorder: 12,
      cost: 54,
      note: "Guests are leaning into cozy drinks — restock dark chocolate mix for weekend service.",
      urgency: "stable",
    },
  ];

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["ai-results"],
    queryFn: async () => {
      const response = await fetch("/api/ai-results");
      if (!response.ok) {
        throw new Error("Failed to fetch AI recommendations");
      }
      return response.json() as Promise<{ data?: ApiOrderSuggestion[] } | ApiOrderSuggestion[]>;
    },
    staleTime: 1000 * 60,
  });

  const suggestions = useMemo(() => {
    const entries = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data?.data
      : [];

    return entries
      .map(normalizeSuggestion)
      .filter((value): value is OrderSuggestion => Boolean(value))
      .sort((a, b) => {
        const order = { urgent: 0, soon: 1, stable: 2 } as const;
        return order[a.urgency] - order[b.urgency];
      });
  }, [data]);

  const displaySuggestions = error ? MOCK_SUGGESTIONS : suggestions;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
        <header className="mb-8 space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-foreground">Simple Restock View</h1>
          <p className="text-muted-foreground">
            Quick insights from your AI assistant — focused on what to order next and why.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DownloadButton items={displaySuggestions} />
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh suggestions
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
                Live data is momentarily unavailable; showing quick sample suggestions instead.
              </div>
            )}
            <OrderList
              items={displaySuggestions}
              emptyMessage="🟢 All stocked up — nothing to order right now!"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


