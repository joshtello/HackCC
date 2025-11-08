import { useCallback, useState } from "react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordModal } from "@/components/ui/PasswordModal";
import { useToast } from "@/components/ui/use-toast";

type PendingAction = "save" | "update" | null;

export default function Settings() {
  const { toast } = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const handleActionRequest = useCallback((action: NonNullable<PendingAction>) => {
    setPendingAction(action);
    setShowPasswordModal(true);
  }, []);

  const handlePasswordConfirm = useCallback(async () => {
    const action = pendingAction;

    setShowPasswordModal(false);
    setPendingAction(null);

    if (!action) {
      return;
    }

    // Replace these placeholders with actual persistence logic.
    toast({
      title: "Changes saved",
      description:
        action === "save"
          ? "Restaurant information has been updated."
          : "Inventory alert preferences have been updated.",
    });
  }, [pendingAction, toast]);

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordModal(false);
    setPendingAction(null);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
            <CardDescription>Update your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input id="name" placeholder="Bevange Restaurant" defaultValue="Bevange Restaurant" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contact@bevange.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
            </div>
            <Button type="button" onClick={() => handleActionRequest("save")}>
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
            <CardDescription>Configure low stock notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threshold">Default Stock Threshold (%)</Label>
              <Input id="threshold" type="number" placeholder="20" defaultValue="20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input id="notification-email" type="email" placeholder="alerts@bevange.com" />
            </div>
            <Button type="button" onClick={() => handleActionRequest("update")}>
              Update Preferences
            </Button>
          </CardContent>
        </Card>

        <PasswordModal
          open={showPasswordModal}
          onConfirm={handlePasswordConfirm}
          onCancel={handlePasswordCancel}
        />
      </div>
    </DashboardLayout>
  );
}
