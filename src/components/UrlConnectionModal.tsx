import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UrlConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  sourceId: string;
  businessId: string;
  onConnectionSuccess: () => void;
}

const UrlConnectionModal = ({
  isOpen,
  onClose,
  sourceName,
  sourceId,
  businessId,
  onConnectionSuccess,
}: UrlConnectionModalProps) => {
  const [url, setUrl] = useState("");
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

      // Store the URL connection
      const { error } = await supabase.from("source_connections").upsert(
        {
          business_id: businessId,
          source_id: sourceId,
          user_id: user.id,
          connection_type: "url",
          status: "connected",
          metadata: { url },
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

      toast.success(`${sourceName} product page linked successfully`);
      onConnectionSuccess();
      onClose();
      setUrl("");
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
          <DialogTitle>Link {sourceName} Product Page</DialogTitle>
          <DialogDescription>
            Enter the URL of your {sourceName} product reviews page. This will be stored for your reference.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">{sourceName} Product Reviews URL *</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.com/product-reviews/..."
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UrlConnectionModal;
