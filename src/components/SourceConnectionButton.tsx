import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Check, Link as LinkIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ApiKeyConnectionModal from "./ApiKeyConnectionModal";
import UrlConnectionModal from "./UrlConnectionModal";

interface SourceConnectionButtonProps {
  sourceId: string;
  sourceName: string;
  businessId: string;
  isEnabled: boolean;
}

interface Connection {
  id: string;
  status: string;
  connection_type: string;
}

const SourceConnectionButton = ({
  sourceId,
  sourceName,
  businessId,
  isEnabled,
}: SourceConnectionButtonProps) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);

  useEffect(() => {
    if (isEnabled && businessId) {
      fetchConnection();
    } else {
      setConnection(null);
    }
  }, [isEnabled, businessId, sourceId]);

  const fetchConnection = async () => {
    const { data, error } = await supabase
      .from("source_connections")
      .select("*")
      .eq("business_id", businessId)
      .eq("source_id", sourceId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching connection:", error);
      return;
    }

    setConnection(data);
  };

  const handleConnect = () => {
    const sourceNameLower = sourceName.toLowerCase();
    
    if (sourceNameLower === "amazon") {
      setShowUrlModal(true);
    } else if (
      sourceNameLower === "google business" ||
      sourceNameLower === "facebook"
    ) {
      initiateOAuthFlow();
    } else {
      // Trustpilot, Yelp, TripAdvisor
      setShowApiKeyModal(true);
    }
  };

  const initiateOAuthFlow = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Create a pending connection record
      const { error } = await supabase.from("source_connections").upsert({
        business_id: businessId,
        source_id: sourceId,
        user_id: user.id,
        connection_type: "oauth",
        status: "pending",
      });

      if (error) throw error;

      // TODO: Redirect to OAuth authorization URL
      toast.info(`${sourceName} OAuth flow will be implemented soon`);
      await fetchConnection();
    } catch (error: any) {
      console.error("OAuth error:", error);
      toast.error(`Failed to initiate ${sourceName} connection`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("source_connections")
        .delete()
        .eq("id", connection.id);

      if (error) throw error;

      toast.success(`${sourceName} disconnected successfully`);
      setConnection(null);
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error(`Failed to disconnect ${sourceName}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEnabled) return null;

  const isConnected = connection?.status === "connected";

  return (
    <div className="flex items-center gap-2">
      {!isConnected ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleConnect}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
          {sourceName === "Amazon" ? "Link Product Page" : "Connect"}
        </Button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Check className="h-4 w-4 text-green-500" />
            Connected
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            disabled={loading}
            className="text-destructive hover:text-destructive"
          >
            Disconnect
          </Button>
        </>
      )}

      <ApiKeyConnectionModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        sourceName={sourceName}
        sourceId={sourceId}
        businessId={businessId}
        onConnectionSuccess={fetchConnection}
      />

      <UrlConnectionModal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        sourceName={sourceName}
        sourceId={sourceId}
        businessId={businessId}
        onConnectionSuccess={fetchConnection}
      />
    </div>
  );
};

export default SourceConnectionButton;
