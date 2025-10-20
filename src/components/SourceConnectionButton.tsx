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

const SourceConnectionButton = ({ sourceId, sourceName, businessId, isEnabled }: SourceConnectionButtonProps) => {
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

  // Listen for OAuth success event to refresh connection status
  useEffect(() => {
    const handleOAuthSuccess = () => {
      if (isEnabled && businessId) {
        fetchConnection();
      }
    };

    window.addEventListener("oauth-connection-success", handleOAuthSuccess);
    return () => window.removeEventListener("oauth-connection-success", handleOAuthSuccess);
  }, [isEnabled, businessId, sourceId]);

  const fetchConnection = async () => {
    // Only select non-sensitive fields to prevent token exposure
    const { data, error } = await supabase
      .from("source_connections")
      .select("id, status, connection_type, token_expires_at, metadata, created_at, updated_at")
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
    } else if (sourceNameLower === "google business" || sourceNameLower === "facebook") {
      initiateOAuthFlow();
    } else {
      // Trustpilot, Yelp, TripAdvisor
      setShowApiKeyModal(true);
    }
  };

  const initiateOAuthFlow = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      // Create a pending connection record
      const { error } = await supabase.from("source_connections").upsert(
        {
          business_id: businessId,
          source_id: sourceId,
          user_id: user.id,
          connection_type: "oauth",
          status: "pending",
        },
        {
          onConflict: "business_id,source_id",
        },
      );

      if (error) {
        console.error("Connection creation error:", error);
        toast.error("Failed to initiate connection");
        setLoading(false);
        return;
      }

      // Get OAuth URL from edge function
      const { data, error: functionError } = await supabase.functions.invoke("initiate-google-oauth", {
        body: { businessId, sourceId },
      });

      if (functionError) {
        console.error("OAuth function error:", functionError);
        toast.error(`Failed to initiate ${sourceName} connection`);
        setLoading(false);
        return;
      }

      // Open OAuth in popup window
      const popup = window.open(data.authUrl, "oauth-popup", "width=600,height=700,left=200,top=100");

      if (!popup) {
        toast.error("Please allow popups for this site");
        setLoading(false);
        return;
      }

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        // Accept messages from both the app origin and Supabase origin
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
        const supabaseOrigin = new URL(supabaseUrl).origin;

        if (event.origin !== window.location.origin && event.origin !== supabaseOrigin) return;

        if (event.data.type === "auth-success" && event.data.service === "google") {
          window.removeEventListener("message", handleMessage);
          popup.close();
          toast.success("Source connected successfully");
          fetchConnection();
          setLoading(false);
        } else if (event.data.type === "auth-error") {
          window.removeEventListener("message", handleMessage);
          popup.close();
          toast.error("Failed to connect source");
          setLoading(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Clean up listener if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", handleMessage);
          // Re-fetch connection status when popup closes
          fetchConnection();
          setLoading(false);
        }
      }, 500);
    } catch (error: any) {
      console.error("OAuth error:", error);
      toast.error(`Failed to initiate ${sourceName} connection`);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("source_connections").delete().eq("id", connection.id);

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
        <Button size="sm" variant="outline" onClick={handleConnect} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
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
