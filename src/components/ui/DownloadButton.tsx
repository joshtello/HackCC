import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { OrderSuggestion } from "@/components/ui/OrderCard";

type DownloadButtonProps = {
  items: OrderSuggestion[];
  fileName?: string;
};

function buildCsv(items: OrderSuggestion[]) {
  const header = ["Ingredient", "Quantity to Order", "Estimated Cost", "Reason", "Urgency"];
  const rows = items.map((item) => [
    item.ingredient,
    item.recommendedReorder,
    item.cost,
    item.note,
    item.urgency,
  ]);
  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(","),
    )
    .join("\n");
}

export function DownloadButton({ items, fileName = "order-sheet.csv" }: DownloadButtonProps) {
  const disabled = items.length === 0;

  const csvContent = useMemo(() => buildCsv(items), [items]);

  const handleDownload = () => {
    if (disabled) return;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Generate Order Sheet
    </Button>
  );
}


