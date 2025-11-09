import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type ManualInventoryRow = {
  id: string;
  name: string;
  unit: string;
  aiQuantity: number;
  currentQuantity: number;
};

type ManualInventoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ManualInventoryRow[];
  onSave: (updatedItems: ManualInventoryRow[]) => Promise<void> | void;
  onTeachAI?: (
    corrections: Array<{
      id: string;
      originalQuantity: number;
      correctedQuantity: number;
    }>
  ) => void;
  onDraftChange?: (drafts: { id: string; currentQuantity: number }[]) => void;
};

type DraftRow = ManualInventoryRow & { draftQuantity: string };

export function ManualInventoryDialog({
  open,
  onOpenChange,
  items,
  onSave,
  onTeachAI,
  onDraftChange,
}: ManualInventoryDialogProps) {
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraftRows([]);
      setIsSaving(false);
      setErrorMessage(null);
      return;
    }

    const normalized = items.map((item) => ({
      ...item,
      draftQuantity: Number(item.currentQuantity ?? 0).toFixed(2),
    }));
    setDraftRows(normalized);
    setErrorMessage(null);
    // notify parent of initial draft values
    if (onDraftChange) {
      onDraftChange(
        normalized.map((r) => ({
          id: r.id,
          currentQuantity: Number(r.draftQuantity),
        }))
      );
    }
  }, [open, items]);

  const handleQuantityChange = (id: string, value: string) => {
    setDraftRows((prev) => {
      const next = prev.map((row) =>
        row.id === id
          ? {
              ...row,
              draftQuantity: value,
            }
          : row
      );
      if (onDraftChange) {
        onDraftChange(
          next.map((r) => ({
            id: r.id,
            currentQuantity: Number(r.draftQuantity),
          }))
        );
      }
      return next;
    });
  };

  const handleCancel = () => {
    setErrorMessage(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    const parsed = draftRows.map((row) => ({
      ...row,
      currentQuantity: Number(row.draftQuantity),
    }));

    const invalidRow = parsed.find(
      (row) => Number.isNaN(row.currentQuantity) || row.currentQuantity < 0
    );

    if (invalidRow) {
      setErrorMessage(
        "Please enter valid non-negative numbers for all quantities."
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parsed);
      setErrorMessage(null);
      if (onTeachAI) {
        const corrections = parsed.map((row) => ({
          id: row.id,
          originalQuantity: row.aiQuantity,
          correctedQuantity: row.currentQuantity,
        }));
        onTeachAI(corrections);
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Inventory Update</DialogTitle>
          <DialogDescription>
            Review the AI estimated stock levels and enter the corrected
            quantities. Your updates help keep inventory accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-center">AI Estimate</TableHead>
                  <TableHead className="text-center">
                    Corrected Quantity
                  </TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {Number(row.aiQuantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.draftQuantity}
                        onChange={(event) =>
                          handleQuantityChange(row.id, event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">{row.unit}</TableCell>
                  </TableRow>
                ))}
                {draftRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No inventory items available.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
