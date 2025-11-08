import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMenuItemWithSales } from "@/hooks/useMenuItems";
import { RecipeDialog } from "@/components/RecipeDialog";
import { AddMenuItemDialog } from "@/components/AddMenuItemDialog";

export default function Menu() {
  const { data: menuItems, isLoading } = useMenuItemWithSales();
  const [activeMenuItem, setActiveMenuItem] = useState<{ id: string; name: string } | null>(null);
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const sortedItems = menuItems?.sort((a, b) => b.sales - a.sales) || [];
  const bestSeller = sortedItems[0]?.id;
  const leastSeller = sortedItems[sortedItems.length - 1]?.id;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
            <p className="text-muted-foreground mt-1">Manage your menu items and recipes</p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddMenuItemOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Menu Item
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>View and manage all your menu items with sales data</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell>{item.sales} sold</TableCell>
                    <TableCell>
                      {index < sortedItems.length / 2 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.id === bestSeller && (
                        <Badge variant="default">Best Seller</Badge>
                      )}
                      {item.id === leastSeller && sortedItems.length > 1 && (
                        <Badge variant="secondary">Least Seller</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMenuItem({ id: item.id, name: item.name })}
                      >
                        Add Recipe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimated Profit Analysis</CardTitle>
            <CardDescription>AI-powered profit predictions based on sales trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Today's Projected</p>
                <p className="text-2xl font-bold text-foreground mt-1">$1,245</p>
                <p className="text-xs text-success mt-1">+12% from yesterday</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-foreground mt-1">$8,750</p>
                <p className="text-xs text-success mt-1">+8% from last week</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground mt-1">$32,400</p>
                <p className="text-xs text-muted-foreground mt-1">On track for target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <RecipeDialog
        open={Boolean(activeMenuItem)}
        menuItem={activeMenuItem}
        onOpenChange={(open) => {
          if (!open) {
            setActiveMenuItem(null);
          }
        }}
      />
      <AddMenuItemDialog
        open={isAddMenuItemOpen}
        onOpenChange={setIsAddMenuItemOpen}
      />
    </DashboardLayout>
  );
}
