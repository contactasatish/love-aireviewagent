import { useState } from "react";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncReviewsButtonProps {
  businessId: string;
  sourceId: string;
  sourceName: string;
  isConnected: boolean;
}

const SyncReviewsButton = ({ businessId, sourceId, sourceName, isConnected }: SyncReviewsButtonProps) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews", {
        body: { businessId, sourceId },
      });

      if (error) throw error;

      toast.success(`Successfully synced ${data.reviewsCount || 0} reviews from ${sourceName}`);
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(`Failed to sync reviews: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isConnected) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSync}
      disabled={syncing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync Reviews"}
    </Button>
  );
};

export default SyncReviewsButton;
