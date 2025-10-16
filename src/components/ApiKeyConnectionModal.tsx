import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiKeyConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  sourceId: string;
  businessId: string;
  onConnectionSuccess: () => void;
}

const ApiKeyConnectionModal = ({
  isOpen,
  onClose,
  sourceName,
  sourceId,
  businessId,
  onConnectionSuccess,
}: ApiKeyConnectionModalProps) => {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Store the connection with encrypted credentials
      const { error } = await supabase.from("source_connections").upsert(
        {
          business_id: businessId,
          source_id: sourceId,
          user_id: user.id,
          connection_type: "api_key",
          status: "connected",
          encrypted_credentials: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
        },
        {
          onConflict: 'business_id,source_id',
        }
      );

      if (error) {
        console.error('Connection error:', error);
        toast.error("Failed to save connection");
        return;
      }

      toast.success(`${sourceName} connected successfully`);
      onConnectionSuccess();
      onClose();
      setApiKey("");
      setApiSecret("");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {sourceName}</DialogTitle>
          <DialogDescription>
            Enter your {sourceName} API credentials to connect your account.
            {sourceName === "TripAdvisor" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Note: TripAdvisor requires an official partnership to access its API. Enter your API key here once approved.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your API secret (if applicable)"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyConnectionModal;
